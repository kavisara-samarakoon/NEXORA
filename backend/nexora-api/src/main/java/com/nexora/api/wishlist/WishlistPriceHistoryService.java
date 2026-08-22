package com.nexora.api.wishlist;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class WishlistPriceHistoryService {

    private static final int MAX_SOURCE_LENGTH = 64;

    private final WishlistPriceHistoryStore store;

    public WishlistPriceHistoryService(WishlistPriceHistoryStore store) {
        this.store = store;
    }

    public void recordSnapshot(
            long userId,
            com.nexora.api.wishlist.persistence.WishlistItem item,
            String source) {
        if (item == null || item.getId() == null) {
            return;
        }
        recordSnapshot(
                userId,
                item.getId(),
                item.getTitle(),
                item.getStore(),
                item.getCurrentPrice(),
                source);
    }

    public void recordSnapshot(long userId, WishlistItem item, String source) {
        if (item == null) {
            return;
        }
        recordSnapshot(
                userId,
                item.id(),
                item.title(),
                item.store(),
                item.currentPrice(),
                source);
    }

    public List<WishlistPriceHistoryPoint> listRecent(
            long userId,
            long wishlistItemId,
            int limit) {
        return store.findRecent(userId, wishlistItemId, limit);
    }

    private void recordSnapshot(
            long userId,
            long wishlistItemId,
            String itemTitle,
            String itemStore,
            String priceLabel,
            String source) {
        if (userId <= 0 || wishlistItemId <= 0 || priceLabel == null || priceLabel.isBlank()) {
            return;
        }

        String normalizedLabel = priceLabel.trim();
        Optional<WishlistPriceParser.ParsedPrice> parsed = WishlistPriceParser.parse(normalizedLabel);
        WishlistPriceHistoryPoint latest = store.findLatest(userId, wishlistItemId).orElse(null);
        if (latest != null
                && latest.priceLabel().equals(normalizedLabel)
                && Objects.equals(latest.priceAmount(), parsed.map(
                        WishlistPriceParser.ParsedPrice::amount).orElse(null))
                && Objects.equals(latest.currency(), parsed.map(
                        WishlistPriceParser.ParsedPrice::currency).orElse(null))) {
            return;
        }

        store.save(new NewWishlistPriceHistoryEntry(
                userId,
                wishlistItemId,
                itemTitle,
                itemStore,
                normalizedLabel,
                parsed.map(WishlistPriceParser.ParsedPrice::amount).orElse(null),
                parsed.map(WishlistPriceParser.ParsedPrice::currency).orElse(null),
                normalizeSource(source),
                LocalDateTime.now(ZoneOffset.UTC)));
    }

    private static String normalizeSource(String source) {
        String normalized = source == null || source.isBlank()
                ? "price-refresh"
                : source.trim();
        return normalized.substring(0, Math.min(normalized.length(), MAX_SOURCE_LENGTH));
    }
}
