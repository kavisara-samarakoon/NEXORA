package com.nexora.api.wishlist;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
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
    private final Map<Long, StoredAlertEvent> alertEvents = new ConcurrentHashMap<>();
    private final WishlistPriceHistoryService wishlistPriceHistoryService;

    public InMemoryUserWishlistService(WishlistPriceHistoryService wishlistPriceHistoryService) {
        this.wishlistPriceHistoryService = wishlistPriceHistoryService;
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
    public List<WishlistAlertEventResponse> getWishlistAlertEvents(long userId) {
        return alertEvents.values().stream()
                .filter(event -> event.userId() == userId)
                .map(StoredAlertEvent::event)
                .sorted((first, second) -> {
                    int timestampOrder = second.createdAt().compareTo(first.createdAt());
                    return timestampOrder != 0
                            ? timestampOrder
                            : Long.compare(second.id(), first.id());
                })
                .toList();
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
        alertEvents.put(eventId, new StoredAlertEvent(userId, event));
    }

    private record StoredWishlistItem(long userId, WishlistItem item, boolean active) {
    }

    private record StoredAlertEvent(long userId, WishlistAlertEventResponse event) {
    }
}
