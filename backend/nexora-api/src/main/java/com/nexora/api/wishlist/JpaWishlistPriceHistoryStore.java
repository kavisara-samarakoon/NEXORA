package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistPriceHistoryEntry;
import com.nexora.api.wishlist.persistence.WishlistPriceHistoryRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@Profile("dev")
public class JpaWishlistPriceHistoryStore implements WishlistPriceHistoryStore {

    private final WishlistPriceHistoryRepository repository;

    public JpaWishlistPriceHistoryStore(WishlistPriceHistoryRepository repository) {
        this.repository = repository;
    }

    @Override
    public void save(NewWishlistPriceHistoryEntry entry) {
        repository.saveAndFlush(new WishlistPriceHistoryEntry(
                null,
                entry.userId(),
                entry.wishlistItemId(),
                entry.itemTitle(),
                entry.store(),
                entry.priceLabel(),
                entry.priceAmount(),
                entry.currency(),
                entry.source(),
                entry.observedAt(),
                null));
    }

    @Override
    public Optional<WishlistPriceHistoryPoint> findLatest(long userId, long wishlistItemId) {
        return repository
                .findFirstByUserIdAndWishlistItemIdOrderByObservedAtDescIdDesc(
                        userId, wishlistItemId)
                .map(JpaWishlistPriceHistoryStore::toPoint);
    }

    @Override
    public List<WishlistPriceHistoryPoint> findRecent(
            long userId,
            long wishlistItemId,
            int limit) {
        List<WishlistPriceHistoryPoint> points = new ArrayList<>(repository
                .findByUserIdAndWishlistItemIdOrderByObservedAtDescIdDesc(
                        userId, wishlistItemId, PageRequest.of(0, limit))
                .stream()
                .map(JpaWishlistPriceHistoryStore::toPoint)
                .toList());
        Collections.reverse(points);
        return List.copyOf(points);
    }

    private static WishlistPriceHistoryPoint toPoint(WishlistPriceHistoryEntry entry) {
        return new WishlistPriceHistoryPoint(
                entry.getId(),
                entry.getWishlistItemId(),
                entry.getItemTitle(),
                entry.getStore(),
                entry.getPriceLabel(),
                entry.getPriceAmount(),
                entry.getCurrency(),
                entry.getSource(),
                entry.getObservedAt());
    }
}
