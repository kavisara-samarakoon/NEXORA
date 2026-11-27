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

    public boolean recordSnapshot(
            long userId,
            com.nexora.api.wishlist.persistence.WishlistItem item,
            String source) {
        if (item == null || item.getId() == null) {
            return false;
        }
        return recordSnapshot(
                userId,
                item.getId(),
                item.getTitle(),
                item.getStore(),
                item.getCurrentPrice(),
                item.getCurrency(),
                source,
                item.getExternalGameId(),
                item.getExternalDealId());
    }

    public boolean recordSnapshot(long userId, WishlistItem item, String source) {
        if (item == null) {
            return false;
        }
        return recordSnapshot(
                userId,
                item.id(),
                item.title(),
                item.store(),
                item.currentPrice(),
                item.currency(),
                source,
                item.externalGameId(),
                item.externalDealId());
    }

    public List<WishlistPriceHistoryPoint> listRecent(
            long userId,
            long wishlistItemId,
            int limit) {
        return store.findRecent(userId, wishlistItemId, limit);
    }

    private boolean recordSnapshot(
            long userId,
            long wishlistItemId,
            String itemTitle,
            String itemStore,
            String priceLabel,
            String itemCurrency,
            String source,
            String externalGameId,
            String externalDealId) {
        if (userId <= 0 || wishlistItemId <= 0 || priceLabel == null || priceLabel.isBlank()) {
            return false;
        }

        String normalizedLabel = priceLabel.trim();
        Optional<WishlistPriceParser.ParsedPrice> parsed =
                WishlistPriceParser.parse(normalizedLabel, itemCurrency);
        String normalizedSource = normalizeSource(source);
        boolean verified = WishlistRefreshSupport.isVerifiedProviderSource(normalizedSource);
        if (verified && (parsed.isEmpty() || !WishlistRefreshSupport.isUsdEligible(itemCurrency))) {
            return false;
        }
        WishlistPriceHistoryPoint latest = store.findLatest(userId, wishlistItemId).orElse(null);
        String parsedCurrency = parsed.map(WishlistPriceParser.ParsedPrice::currency).orElse(null);
        if (latest != null
                && latest.priceLabel().equals(normalizedLabel)
                && Objects.equals(latest.priceAmount(), parsed.map(
                        WishlistPriceParser.ParsedPrice::amount).orElse(null))
                && Objects.equals(latest.currency(), parsedCurrency)
                && Objects.equals(latest.externalDealId(), externalDealId)
                && Objects.equals(latest.externalGameId(), externalGameId)
                && WishlistRefreshSupport.isVerifiedProviderSource(latest.source()) == verified) {
            return false;
        }

        store.save(new NewWishlistPriceHistoryEntry(
                userId,
                wishlistItemId,
                itemTitle,
                itemStore,
                normalizedLabel,
                parsed.map(WishlistPriceParser.ParsedPrice::amount).orElse(null),
                parsedCurrency,
                normalizedSource,
                externalGameId,
                externalDealId,
                LocalDateTime.now(ZoneOffset.UTC)));
        return true;
    }

    private static String normalizeSource(String source) {
        String normalized = source == null || source.isBlank()
                ? "price-refresh"
                : source.trim();
        return normalized.substring(0, Math.min(normalized.length(), MAX_SOURCE_LENGTH));
    }
}
