package com.nexora.api.wishlist;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

@Service
@Profile("!dev")
public class InMemoryUserWishlistService implements UserWishlistService {

    private static final int MAX_REFRESH_ITEMS_PER_REQUEST =
            WishlistRefreshSupport.MAX_REFRESH_ITEMS_PER_REQUEST;
    private static final String REFRESH_SOURCE = WishlistRefreshSupport.REFRESH_SOURCE;

    private final AtomicLong ids = new AtomicLong();
    private final AtomicLong alertEventIds = new AtomicLong();
    private final Map<Long, StoredWishlistItem> items = new ConcurrentHashMap<>();
    private final Map<Long, Deque<WishlistAlertEventResponse>> alertEventsByUser = new HashMap<>();
    private final ConcurrentHashMap<Long, ReentrantLock> userRefreshLocks = new ConcurrentHashMap<>();
    private final WishlistPriceHistoryService wishlistPriceHistoryService;
    private final CheapSharkWishlistLiveLookup liveLookup;
    private final int alertEventResponseLimit;
    private final int alertEventRetentionLimit;

    public InMemoryUserWishlistService(WishlistPriceHistoryService wishlistPriceHistoryService) {
        this(
                wishlistPriceHistoryService,
                null,
                WishlistAlertHistoryPolicy.RESPONSE_LIMIT,
                WishlistAlertHistoryPolicy.IN_MEMORY_RETENTION_PER_USER
        );
    }

    @Autowired
    public InMemoryUserWishlistService(
            WishlistPriceHistoryService wishlistPriceHistoryService,
            CheapSharkWishlistLiveLookup liveLookup) {
        this(
                wishlistPriceHistoryService,
                liveLookup,
                WishlistAlertHistoryPolicy.RESPONSE_LIMIT,
                WishlistAlertHistoryPolicy.IN_MEMORY_RETENTION_PER_USER
        );
    }

    InMemoryUserWishlistService(
            WishlistPriceHistoryService wishlistPriceHistoryService,
            int alertEventResponseLimit,
            int alertEventRetentionLimit) {
        this(wishlistPriceHistoryService, null, alertEventResponseLimit, alertEventRetentionLimit);
    }

    private InMemoryUserWishlistService(
            WishlistPriceHistoryService wishlistPriceHistoryService,
            CheapSharkWishlistLiveLookup liveLookup,
            int alertEventResponseLimit,
            int alertEventRetentionLimit) {
        this.wishlistPriceHistoryService = wishlistPriceHistoryService;
        this.liveLookup = liveLookup;
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
        items.put(id, new StoredWishlistItem(userId, item, true, null));
        wishlistPriceHistoryService.recordSnapshot(userId, item, "wishlist-create");
        if (item.alertEvaluation().targetReached()) {
            recordAlertEvent(userId, item, "wishlist-create");
        }
        return item;
    }

    @Override
    public synchronized void deleteWishlistItem(long userId, long itemId) {
        StoredWishlistItem storedItem = items.get(itemId);
        if (storedItem == null || storedItem.userId() != userId || !storedItem.active()) {
            throw new WishlistItemNotFoundException();
        }
        items.put(itemId, new StoredWishlistItem(
                userId, storedItem.item(), false, storedItem.lastCheckedAt()));
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
        String targetPrice = valueOrExisting(request.targetPrice(), current.targetPrice());
        boolean alertActive = request.alertActive() == null ? current.alertActive() : request.alertActive();
        WishlistItem updated = new WishlistItem(
                current.id(),
                current.title(),
                current.store(),
                current.currentPrice(),
                targetPrice,
                current.lowestEver(),
                current.discount(),
                current.status(),
                alertActive,
                valueOrExisting(request.priority(), current.priority()),
                WishlistAlertEvaluator.evaluate(
                        current.currentPrice(),
                        targetPrice,
                        alertActive,
                        current.currency()
                ),
                current.externalGameId(),
                current.externalDealId(),
                current.currency(),
                current.thumbUrl(),
                current.priceSource(),
                current.lowestEverSource()
        );
        items.put(itemId, new StoredWishlistItem(userId, updated, true, storedItem.lastCheckedAt()));
        if (!previouslyReached && updated.alertEvaluation().targetReached()) {
            recordAlertEvent(userId, updated, "alert-update");
        }
        return updated;
    }

    @Override
    public UserWishlistRefreshResponse refreshWishlistPrices(long userId) {
        return refreshWishlistPrices(userId, null);
    }

    @Override
    public UserWishlistRefreshResponse refreshWishlistPrices(long userId, Long cursor) {
        ReentrantLock userLock = userRefreshLocks.computeIfAbsent(userId, ignored -> new ReentrantLock());
        userLock.lock();
        try {
            return performRefresh(userId, cursor);
        } finally {
            userLock.unlock();
        }
    }

    private UserWishlistRefreshResponse performRefresh(long userId, Long cursor) {
        List<StoredWishlistItem> snapshot = items.values().stream()
                .filter(stored -> stored.userId() == userId && stored.active())
                .sorted(Comparator.comparingLong(stored -> stored.item().id()))
                .toList();

        if (liveLookup == null || !liveLookup.isEnabled()) {
            int unavailable = Math.min(snapshot.size(), MAX_REFRESH_ITEMS_PER_REQUEST);
            return new UserWishlistRefreshResponse(
                    unavailable,
                    0,
                    0,
                    0,
                    0,
                    unavailable,
                    "disabled",
                    "USD",
                    Instant.now(),
                    false,
                    null,
                    getWishlistItems(userId)
            );
        }

        List<StoredWishlistItem> eligibleUsd = snapshot.stream()
                .filter(stored -> WishlistRefreshSupport.isUsdEligible(stored.item().currency()))
                .toList();
        int ineligibleCount = cursor == null ? snapshot.size() - eligibleUsd.size() : 0;

        WishlistRefreshSupport.BatchSelection<StoredWishlistItem> selection =
                WishlistRefreshSupport.selectBatch(
                        eligibleUsd,
                        cursor,
                        stored -> stored.item().id(),
                        MAX_REFRESH_ITEMS_PER_REQUEST
                );

        if (selection.batch().isEmpty()) {
            return new UserWishlistRefreshResponse(
                    ineligibleCount,
                    0,
                    0,
                    0,
                    0,
                    ineligibleCount,
                    "cheapshark",
                    "USD",
                    Instant.now(),
                    false,
                    null,
                    getWishlistItems(userId)
            );
        }

        Map<String, String> storeLookup = liveLookup.loadStoreLookup();
        List<LookupResult> lookupResults = new ArrayList<>(selection.batch().size());
        for (StoredWishlistItem candidate : selection.batch()) {
            WishlistItem item = candidate.item();
            Optional<CheapSharkWishlistLiveLookup.ObservedOffer> found = storeLookup.isEmpty()
                    ? Optional.empty()
                    : liveLookup.lookup(item.title(), item.store(), item.externalGameId(), storeLookup);
            lookupResults.add(new LookupResult(item.id(), found));
        }

        return applyRefreshResults(
                userId,
                lookupResults,
                ineligibleCount,
                selection.hasMore(),
                selection.nextCursor()
        );
    }

    private synchronized UserWishlistRefreshResponse applyRefreshResults(
            long userId,
            List<LookupResult> lookupResults,
            int ineligibleCount,
            boolean hasMore,
            Long nextCursor) {
        int scanned = ineligibleCount;
        int matched = 0;
        int updatedCount = 0;
        int observationsRecorded = 0;
        int targetEventsCreated = 0;
        int unavailable = ineligibleCount;
        LocalDateTime checkedAt = LocalDateTime.now(ZoneOffset.UTC);

        for (LookupResult result : lookupResults) {
            StoredWishlistItem stored = items.get(result.itemId());
            if (stored == null || stored.userId() != userId || !stored.active()) {
                continue;
            }
            scanned++;
            WishlistItem current = stored.item();

            if (result.offer().isEmpty()) {
                items.put(current.id(), new StoredWishlistItem(userId, current, true, checkedAt));
                unavailable++;
                continue;
            }

            CheapSharkWishlistLiveLookup.ObservedOffer offer = result.offer().get();
            if (!WishlistRefreshSupport.canApplyOffer(current.externalGameId(), offer)
                    || !WishlistRefreshSupport.isUsdEligible(current.currency())) {
                items.put(current.id(), new StoredWishlistItem(userId, current, true, checkedAt));
                unavailable++;
                continue;
            }

            matched++;
            boolean previouslyReached = WishlistRefreshSupport.isVerifiedProviderSource(current.priceSource())
                    && current.alertEvaluation().targetReached();
            boolean lowestVerified = WishlistRefreshSupport.isVerifiedProviderSource(
                    current.lowestEverSource());
            String nextLowest = CheapSharkWishlistLiveLookup.computeLowestEver(
                    current.lowestEver(), lowestVerified, offer);
            String nextStatus = WishlistRefreshSupport.resolveNextStatus(offer);
            String nextExternalGameId = current.externalGameId() != null
                    && !current.externalGameId().isBlank()
                    ? current.externalGameId()
                    : offer.externalGameId();
            String nextExternalDealId = offer.externalDealId();
            String nextThumbUrl = offer.thumbUrl() != null
                    ? offer.thumbUrl()
                    : current.thumbUrl();

            WishlistItem nextItem = new WishlistItem(
                    current.id(),
                    current.title(),
                    current.store(),
                    offer.priceLabel(),
                    current.targetPrice(),
                    nextLowest,
                    offer.discount(),
                    nextStatus,
                    current.alertActive(),
                    current.priority(),
                    WishlistAlertEvaluator.evaluate(
                            offer.priceLabel(),
                            current.targetPrice(),
                            current.alertActive(),
                            current.currency()
                    ),
                    nextExternalGameId,
                    nextExternalDealId,
                    current.currency(),
                    nextThumbUrl,
                    REFRESH_SOURCE,
                    WishlistRefreshSupport.lowestSource(
                            current.lowestEver(), current.lowestEverSource(), nextLowest, REFRESH_SOURCE)
            );

            boolean changed = WishlistRefreshSupport.hasMaterialOfferChange(
                    current.currentPrice(),
                    current.lowestEver(),
                    current.lowestEverSource(),
                    current.discount(),
                    current.status(),
                    current.externalGameId(),
                    current.externalDealId(),
                    current.thumbUrl(),
                    current.priceSource(),
                    nextLowest,
                    nextStatus,
                    nextExternalGameId,
                    nextExternalDealId,
                    nextThumbUrl,
                    offer
            );

            if (changed) {
                items.put(current.id(), new StoredWishlistItem(userId, nextItem, true, checkedAt));
                updatedCount++;
            } else {
                items.put(current.id(), new StoredWishlistItem(userId, current, true, checkedAt));
            }

            if (wishlistPriceHistoryService.recordSnapshot(userId, nextItem, REFRESH_SOURCE)) {
                observationsRecorded++;
            }

            if (!previouslyReached && nextItem.alertEvaluation().targetReached()) {
                recordAlertEvent(userId, nextItem, REFRESH_SOURCE);
                targetEventsCreated++;
            }
        }

        return new UserWishlistRefreshResponse(
                scanned,
                matched,
                updatedCount,
                observationsRecorded,
                targetEventsCreated,
                unavailable,
                "cheapshark",
                "USD",
                Instant.now(),
                hasMore,
                nextCursor,
                getWishlistItems(userId)
        );
    }

    private static String valueOrExisting(String value, String existingValue) {
        return value == null ? existingValue : value.trim();
    }

    private void recordAlertEvent(long userId, WishlistItem item, String observationSource) {
        long eventId = alertEventIds.incrementAndGet();
        WishlistAlertEventResponse event = WishlistAlertEventMapper.toResponse(
                eventId,
                item,
                LocalDateTime.now(ZoneOffset.UTC),
                observationSource
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

    private record StoredWishlistItem(
            long userId,
            WishlistItem item,
            boolean active,
            LocalDateTime lastCheckedAt) {
    }

    private record LookupResult(
            long itemId,
            Optional<CheapSharkWishlistLiveLookup.ObservedOffer> offer) {
    }
}
