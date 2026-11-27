package com.nexora.api.wishlist;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Profile("!dev")
public class InMemoryWishlistPriceHistoryStore implements WishlistPriceHistoryStore {

    private static final Comparator<StoredPoint> NEWEST_FIRST = Comparator
            .comparing((StoredPoint stored) -> stored.point().observedAt())
            .thenComparing(stored -> stored.point().id())
            .reversed();

    private final AtomicLong ids = new AtomicLong();
    private final Map<Long, StoredPoint> points = new ConcurrentHashMap<>();

    @Override
    public void save(NewWishlistPriceHistoryEntry entry) {
        long id = ids.incrementAndGet();
        points.put(id, new StoredPoint(
                entry.userId(),
                new WishlistPriceHistoryPoint(
                        id,
                        entry.wishlistItemId(),
                        entry.itemTitle(),
                        entry.store(),
                        entry.priceLabel(),
                        entry.priceAmount(),
                        entry.currency(),
                        entry.source(),
                        entry.observedAt(),
                        entry.externalGameId(),
                        entry.externalDealId())));
    }

    @Override
    public Optional<WishlistPriceHistoryPoint> findLatest(long userId, long wishlistItemId) {
        return matching(userId, wishlistItemId).stream()
                .max(Comparator.comparing(WishlistPriceHistoryPoint::observedAt)
                        .thenComparingLong(WishlistPriceHistoryPoint::id));
    }

    @Override
    public List<WishlistPriceHistoryPoint> findRecent(
            long userId,
            long wishlistItemId,
            int limit) {
        List<WishlistPriceHistoryPoint> newest = new ArrayList<>(points.values().stream()
                .filter(stored -> stored.userId() == userId)
                .filter(stored -> stored.point().wishlistItemId() == wishlistItemId)
                .sorted(NEWEST_FIRST)
                .limit(limit)
                .map(StoredPoint::point)
                .toList());
        Collections.reverse(newest);
        return List.copyOf(newest);
    }

    private List<WishlistPriceHistoryPoint> matching(long userId, long wishlistItemId) {
        return points.values().stream()
                .filter(stored -> stored.userId() == userId)
                .map(StoredPoint::point)
                .filter(point -> point.wishlistItemId() == wishlistItemId)
                .toList();
    }

    private record StoredPoint(long userId, WishlistPriceHistoryPoint point) {
    }
}
