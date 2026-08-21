package com.nexora.api.wishlist;

import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkDealResponse;
import com.nexora.api.deals.CheapSharkStoreDirectory;
import com.nexora.api.wishlist.persistence.WishlistItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class CheapSharkWishlistPriceSnapshotProvider
        implements WishlistPriceSnapshotProvider {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(CheapSharkWishlistPriceSnapshotProvider.class);

    private final CheapSharkDealClient cheapSharkDealClient;
    private final CheapSharkStoreDirectory cheapSharkStoreDirectory;
    private final WishlistPriceRefreshProperties properties;

    public CheapSharkWishlistPriceSnapshotProvider(
            CheapSharkDealClient cheapSharkDealClient,
            CheapSharkStoreDirectory cheapSharkStoreDirectory,
            WishlistPriceRefreshProperties properties) {
        this.cheapSharkDealClient = cheapSharkDealClient;
        this.cheapSharkStoreDirectory = cheapSharkStoreDirectory;
        this.properties = properties;
    }

    @Override
    public Optional<String> findCurrentPrice(WishlistItem item) {
        if (item == null || isBlank(item.getTitle()) || isBlank(item.getStore())) {
            return Optional.empty();
        }

        List<CheapSharkDealResponse> responses;
        try {
            responses = cheapSharkDealClient.getDeals(
                    properties.getCheapshark().getPageSize(),
                    item.getTitle().trim(),
                    null
            );
        } catch (RuntimeException exception) {
            LOGGER.warn(
                    "CheapShark wishlist price lookup failed for item {} ({})",
                    item.getId(),
                    exception.getMessage()
            );
            return Optional.empty();
        }

        List<Candidate> candidates = candidates(item.getTitle(), responses);
        if (candidates.isEmpty()) {
            return Optional.empty();
        }

        Map<String, String> storeLookup = storeLookup(item);
        Candidate bestMatch = null;
        int bestScore = Integer.MIN_VALUE;
        for (Candidate candidate : candidates) {
            boolean storeMatches = properties.getCheapshark().isMatchStore()
                    && mappedStoreMatches(item.getStore(), candidate.response(), storeLookup);
            int score = score(candidate.titleMatch(), storeMatches);
            if (score > bestScore) {
                bestMatch = candidate;
                bestScore = score;
            }
        }

        return bestMatch == null
                ? Optional.empty()
                : Optional.of(formatPrice(bestMatch.salePrice()));
    }

    private List<Candidate> candidates(
            String wishlistTitle,
            List<CheapSharkDealResponse> responses) {
        if (responses == null || responses.isEmpty()) {
            return List.of();
        }

        List<Candidate> candidates = new ArrayList<>();
        for (CheapSharkDealResponse response : responses) {
            if (response == null || isBlank(response.title())) {
                continue;
            }

            WishlistPriceSnapshotMatcher.TitleMatch titleMatch =
                    WishlistPriceSnapshotMatcher.titleMatch(
                            wishlistTitle, response.title());
            Optional<BigDecimal> salePrice = parseSalePrice(response.salePrice());
            if (titleMatch != WishlistPriceSnapshotMatcher.TitleMatch.NONE
                    && salePrice.isPresent()) {
                candidates.add(new Candidate(response, titleMatch, salePrice.get()));
            }
        }
        return candidates;
    }

    private Map<String, String> storeLookup(WishlistItem item) {
        if (!properties.getCheapshark().isMatchStore()) {
            return Map.of();
        }

        try {
            return cheapSharkStoreDirectory.toLookup(cheapSharkDealClient.getStores());
        } catch (RuntimeException exception) {
            LOGGER.warn(
                    "CheapShark store lookup failed for wishlist item {}; "
                            + "continuing with conservative title matching ({})",
                    item.getId(),
                    exception.getMessage()
            );
            return Map.of();
        }
    }

    private static boolean mappedStoreMatches(
            String wishlistStore,
            CheapSharkDealResponse response,
            Map<String, String> storeLookup) {
        if (isBlank(response.storeID()) || storeLookup == null || storeLookup.isEmpty()) {
            return false;
        }
        String mappedStore = storeLookup.get(response.storeID().trim());
        return WishlistPriceSnapshotMatcher.storeMatches(wishlistStore, mappedStore);
    }

    private static int score(
            WishlistPriceSnapshotMatcher.TitleMatch titleMatch,
            boolean storeMatches) {
        if (titleMatch == WishlistPriceSnapshotMatcher.TitleMatch.EXACT) {
            return storeMatches ? 4 : 3;
        }
        return storeMatches ? 2 : 1;
    }

    private static Optional<BigDecimal> parseSalePrice(String salePrice) {
        if (isBlank(salePrice)) {
            return Optional.empty();
        }
        try {
            BigDecimal parsed = new BigDecimal(salePrice.trim());
            return parsed.signum() < 0 ? Optional.empty() : Optional.of(parsed);
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    private static String formatPrice(BigDecimal price) {
        BigDecimal scaledPrice = price.setScale(2, RoundingMode.HALF_UP);
        return scaledPrice.signum() == 0
                ? "FREE"
                : "$" + scaledPrice.toPlainString();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record Candidate(
            CheapSharkDealResponse response,
            WishlistPriceSnapshotMatcher.TitleMatch titleMatch,
            BigDecimal salePrice) {
    }
}
