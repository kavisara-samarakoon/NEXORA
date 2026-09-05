package com.nexora.api.wishlist;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Profile("!dev")
public class InMemoryUserWishlistService implements UserWishlistService {

    private final AtomicLong ids = new AtomicLong();
    private final AtomicLong alertEventIds = new AtomicLong();
    private final Map<Long, StoredWishlistItem> items = new ConcurrentHashMap<>();
    private final Map<Long, Deque<WishlistAlertEventResponse>> alertEventsByUser = new HashMap<>();
    private final WishlistPriceHistoryService wishlistPriceHistoryService;
    private final int alertEventResponseLimit;
    private final int alertEventRetentionLimit;

    @Autowired
    public InMemoryUserWishlistService(WishlistPriceHistoryService wishlistPriceHistoryService) {
        this(
                wishlistPriceHistoryService,
                WishlistAlertHistoryPolicy.RESPONSE_LIMIT,
                WishlistAlertHistoryPolicy.IN_MEMORY_RETENTION_PER_USER
        );
    }

    InMemoryUserWishlistService(
            WishlistPriceHistoryService wishlistPriceHistoryService,
            int alertEventResponseLimit,
            int alertEventRetentionLimit) {
        this.wishlistPriceHistoryService = wishlistPriceHistoryService;
        this.alertEventResponseLimit = Math.max(1, alertEventResponseLimit);
        this.alertEventRetentionLimit = Math.max(1, alertEventRetentionLimit);
    }

    @Override
    public List<WishlistItem> getWishlistItems(long userId) {
        return items.values().stream()
                .filter(item -> item.userId() == userId && item.active())
                .map(StoredWishlistItem::item)
                .sorted(Comparator.comparingLong(WishlistItem::id))
                .toList();
    }

    @Override
    public synchronized List<WishlistAlertEventResponse> getWishlistAlertEvents(long userId) {
        Deque<WishlistAlertEventResponse> retainedEvents = alertEventsByUser.get(userId);
        if (retainedEvents == null || retainedEvents.isEmpty()) {
            return List.of();
        }

        List<WishlistAlertEventResponse> recentEvents = new ArrayList<>(
                Math.min(alertEventResponseLimit, retainedEvents.size()));
        var iterator = retainedEvents.descendingIterator();
        while (iterator.hasNext() && recentEvents.size() < alertEventResponseLimit) {
            recentEvents.add(iterator.next());
        }
        return List.copyOf(recentEvents);
    }

    @Override
    public List<WishlistPriceHistoryPoint> getWishlistPriceHistory(
            long userId, long itemId, int limit) {
        StoredWishlistItem storedItem = items.get(itemId);
        if (storedItem == null || storedItem.userId() != userId || !storedItem.active()) {
            throw new WishlistItemNotFoundException();
        }
        return wishlistPriceHistoryService.listRecent(userId, itemId, limit);
    }

    @Override
    public synchronized WishlistItem addWishlistItem(long userId, AddWishlistItemRequest request) {
        WishlistItemValues values = WishlistItemValues.from(request);
        WishlistItem existingItem = items.values().stream()
                .filter(item -> item.userId() == userId && item.active())
                .map(StoredWishlistItem::item)
                .filter(item -> item.title().equalsIgnoreCase(values.title()))
                .filter(item -> item.store().equalsIgnoreCase(values.store()))
                .min(Comparator.comparingLong(WishlistItem::id))
                .orElse(null);
        if (existingItem != null) return existingItem;

        long id = ids.incrementAndGet();
        WishlistItem item = WishlistItemMapper.toResponse(id, values);
        items.put(id, new StoredWishlistItem(userId, item, true));
        wishlistPriceHistoryService.recordSnapshot(userId, item, "wishlist-create");
        if (item.alertEvaluation().targetReached()) {
            recordAlertEvent(userId, item);
        }
        return item;
    }

    @Override
    public synchronized void deleteWishlistItem(long userId, long itemId) {
        StoredWishlistItem storedItem = items.get(itemId);
        if (storedItem == null || storedItem.userId() != userId || !storedItem.active()) {
            throw new WishlistItemNotFoundException();
        }
        items.put(itemId, new StoredWishlistItem(userId, storedItem.item(), false));
    }

    @Override
    public synchronized WishlistItem updateWishlistAlert(
            long userId, long itemId, UpdateWishlistAlertRequest request) {
        StoredWishlistItem storedItem = items.get(itemId);
        if (storedItem == null || storedItem.userId() != userId || !storedItem.active()) {
            throw new WishlistItemNotFoundException();
        }

        WishlistItem current = storedItem.item();
        boolean previouslyReached = current.alertEvaluation().targetReached();
        WishlistItem updated = new WishlistItem(
                current.id(),
                current.title(),
                current.store(),
                current.currentPrice(),
                valueOrExisting(request.targetPrice(), current.targetPrice()),
                current.lowestEver(),
                current.discount(),
                current.status(),
                request.alertActive() == null ? current.alertActive() : request.alertActive(),
                valueOrExisting(request.priority(), current.priority())
        );
        items.put(itemId, new StoredWishlistItem(userId, updated, true));
        if (!previouslyReached && updated.alertEvaluation().targetReached()) {
            recordAlertEvent(userId, updated);
        }
        return updated;
    }

    private static String valueOrExisting(String value, String existingValue) {
        return value == null ? existingValue : value.trim();
    }

    private void recordAlertEvent(long userId, WishlistItem item) {
        long eventId = alertEventIds.incrementAndGet();
        WishlistAlertEventResponse event = WishlistAlertEventMapper.toResponse(
                eventId,
                item,
                LocalDateTime.now(ZoneOffset.UTC)
        );
        Deque<WishlistAlertEventResponse> retainedEvents = alertEventsByUser.computeIfAbsent(
                userId,
                ignored -> new ArrayDeque<>()
        );
        retainedEvents.addLast(event);
        while (retainedEvents.size() > alertEventRetentionLimit) {
            retainedEvents.removeFirst();
        }
    }

    private record StoredWishlistItem(long userId, WishlistItem item, boolean active) {
    }
}
