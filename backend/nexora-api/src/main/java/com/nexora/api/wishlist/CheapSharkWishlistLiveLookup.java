package com.nexora.api.wishlist;

import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkDealMapper;
import com.nexora.api.deals.CheapSharkDealResponse;
import com.nexora.api.deals.CheapSharkStoreDirectory;
import com.nexora.api.deals.ExternalDealsCache;
import com.nexora.api.deals.ExternalDealsCacheEntry;
import com.nexora.api.deals.ExternalDealsCacheKey;
import com.nexora.api.deals.ExternalDealsProperties;
import com.nexora.api.deals.ExternalProviderRequestBudget;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Objects;
import java.util.function.Supplier;

@Component
public class CheapSharkWishlistLiveLookup {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(CheapSharkWishlistLiveLookup.class);
    private static final int LOOKUP_PAGE_SIZE = 12;

    private final CheapSharkDealClient cheapSharkDealClient;
    private final CheapSharkStoreDirectory storeDirectory;
    private final ExternalDealsProperties externalDealsProperties;
    private final ExternalProviderRequestBudget requestBudget;
    private final ExternalDealsCache cache;

    public CheapSharkWishlistLiveLookup(
            CheapSharkDealClient cheapSharkDealClient,
            CheapSharkStoreDirectory storeDirectory,
            ExternalDealsProperties externalDealsProperties,
            ExternalProviderRequestBudget requestBudget) {
        this(cheapSharkDealClient, storeDirectory, externalDealsProperties, requestBudget, null);
    }

    @Autowired
    public CheapSharkWishlistLiveLookup(
            CheapSharkDealClient cheapSharkDealClient,
            CheapSharkStoreDirectory storeDirectory,
            ExternalDealsProperties externalDealsProperties,
            ExternalProviderRequestBudget requestBudget,
            ExternalDealsCache cache) {
        this.cheapSharkDealClient = cheapSharkDealClient;
        this.storeDirectory = storeDirectory;
        this.externalDealsProperties = externalDealsProperties;
        this.requestBudget = requestBudget;
        this.cache = cache;
    }

    public boolean isEnabled() {
        return externalDealsProperties.isEnabled();
    }

    public Map<String, String> loadStoreLookup() {
        if (!externalDealsProperties.isEnabled()) {
            return Map.of();
        }
        if (cache != null && externalDealsProperties.getCache().isEnabled()) {
            ExternalDealsCacheEntry<Map<String, String>> cached = cache.getStoreLookup();
            if (cache.isFresh(cached) && cached.value() != null && !cached.value().isEmpty()) {
                return cached.value();
            }
        }
        try {
            Map<String, String> lookup = storeDirectory.toLookup(
                    requestBudget.execute(cheapSharkDealClient::getStores)
            );
            if (lookup != null && !lookup.isEmpty()
                    && cache != null && externalDealsProperties.getCache().isEnabled()) {
                cache.putStoreLookup(lookup);
            }
            return lookup == null ? Map.of() : lookup;
        } catch (RuntimeException exception) {
            LOGGER.warn("CheapShark stores lookup unavailable ({})", exception.getMessage());
            return Map.of();
        }
    }

    public Optional<ObservedOffer> lookup(
            String title,
            String store,
            String externalGameId) {
        return lookup(title, store, externalGameId, loadStoreLookup());
    }

    public Optional<ObservedOffer> lookup(
            String title,
            String store,
            String externalGameId,
            Map<String, String> storeLookup) {
        if (!externalDealsProperties.isEnabled()
                || title == null || title.isBlank()
                || store == null || store.isBlank()
                || storeLookup == null || storeLookup.isEmpty()) {
            return Optional.empty();
        }

        return matchOffer(title, store, externalGameId, loadDeals(title.trim()), () -> storeLookup);
    }

    static Optional<ObservedOffer> matchOffer(
            String title,
            String store,
            String externalGameId,
            List<CheapSharkDealResponse> responses,
            Supplier<Map<String, String>> loadStores) {
        String expectedGameId = null;
        if (externalGameId != null && !externalGameId.isBlank()) {
            expectedGameId = CheapSharkDealMapper.safeExternalGameId(externalGameId);
            if (expectedGameId == null) {
                return Optional.empty();
            }
        }

        if (responses == null || responses.isEmpty()) {
            return Optional.empty();
        }

        List<Candidate> eligible = new ArrayList<>();
        int bestTier = Integer.MIN_VALUE;
        Map<String, String> storeLookup = null;

        for (CheapSharkDealResponse response : responses) {
            if (response == null || response.title() == null || response.title().isBlank()) {
                continue;
            }

            Optional<BigDecimal> salePrice = parseNonNegativePrice(response.salePrice());
            if (salePrice.isEmpty()) {
                continue;
            }

            String candidateGameId = CheapSharkDealMapper.safeExternalGameId(response.gameID());
            WishlistPriceSnapshotMatcher.TitleMatch titleMatch =
                    WishlistPriceSnapshotMatcher.titleMatch(title, response.title());

            if (expectedGameId != null
                    ? !expectedGameId.equals(candidateGameId)
                    : titleMatch == WishlistPriceSnapshotMatcher.TitleMatch.NONE) {
                continue;
            }
            if (storeLookup == null) {
                storeLookup = loadStores.get();
                if (storeLookup == null || storeLookup.isEmpty()) {
                    return Optional.empty();
                }
            }
            if (!mappedStoreMatches(store, response.storeID(), storeLookup)) {
                continue;
            }

            int tier = titleTier(titleMatch);
            if (tier > bestTier) {
                bestTier = tier;
                eligible.clear();
            }
            if (tier == bestTier) {
                eligible.add(new Candidate(
                        response,
                        salePrice.get().setScale(2, RoundingMode.HALF_UP),
                        candidateGameId,
                        CheapSharkDealMapper.safeExternalDealId(response.dealID())
                ));
            }
        }

        if (eligible.isEmpty()) {
            return Optional.empty();
        }

        Candidate best = eligible.get(0);
        if (eligible.size() > 1 && (best.externalGameId() == null || eligible.stream().anyMatch(candidate ->
                !best.externalGameId().equals(candidate.externalGameId())
                        || !best.salePrice().equals(candidate.salePrice())
                        || !Objects.equals(best.externalDealId(), candidate.externalDealId())))) {
            return Optional.empty();
        }

        String formattedPrice = formatUsdPrice(best.salePrice());
        String discount = formatDiscount(best.response().savings());
        return Optional.of(new ObservedOffer(
                formattedPrice,
                best.salePrice(),
                "USD",
                discount,
                best.externalGameId(),
                best.externalDealId(),
                CheapSharkDealMapper.safeHttpsUrl(best.response().thumb())
        ));
    }

    private List<CheapSharkDealResponse> loadDeals(String trimmedTitle) {
        if (cache != null && externalDealsProperties.getCache().isEnabled()) {
            ExternalDealsCacheKey key = ExternalDealsCacheKey.of(LOOKUP_PAGE_SIZE, trimmedTitle, null);
            ExternalDealsCacheEntry<List<CheapSharkDealResponse>> cached = cache.getDeals(key);
            if (cache.isFresh(cached) && cached.value() != null) {
                return cached.value();
            }
            try {
                List<CheapSharkDealResponse> fresh = requestBudget.execute(() ->
                        cheapSharkDealClient.getDeals(LOOKUP_PAGE_SIZE, trimmedTitle, null));
                if (fresh != null) {
                    cache.putDeals(key, fresh);
                }
                return fresh;
            } catch (RuntimeException exception) {
                LOGGER.warn("CheapShark lookup failed for wishlist item ({})", exception.getMessage());
                return List.of();
            }
        }

        try {
            return requestBudget.execute(() ->
                    cheapSharkDealClient.getDeals(LOOKUP_PAGE_SIZE, trimmedTitle, null));
        } catch (RuntimeException exception) {
            LOGGER.warn("CheapShark lookup failed for wishlist item ({})", exception.getMessage());
            return List.of();
        }
    }

    private static int titleTier(WishlistPriceSnapshotMatcher.TitleMatch titleMatch) {
        return switch (titleMatch) {
            case EXACT -> 2;
            case SAFE_CONTAINS -> 1;
            case NONE -> 0;
        };
    }

    private static boolean mappedStoreMatches(
            String wishlistStore,
            String storeId,
            Map<String, String> storeLookup) {
        if (wishlistStore == null || wishlistStore.isBlank()
                || storeId == null || storeId.isBlank()
                || storeLookup == null || storeLookup.isEmpty()) {
            return false;
        }
        String mapped = storeLookup.get(storeId.trim());
        return WishlistPriceSnapshotMatcher.storeMatches(wishlistStore, mapped);
    }

    private static Optional<BigDecimal> parseNonNegativePrice(String value) {
        return value == null ? Optional.empty()
                : WishlistPriceParser.parse("$" + value.trim(), "USD").map(WishlistPriceParser.ParsedPrice::amount);
    }

    private static String formatUsdPrice(BigDecimal price) {
        BigDecimal scaled = price.setScale(2, RoundingMode.HALF_UP);
        return scaled.signum() == 0 ? "FREE" : "$" + scaled.toPlainString();
    }

    private static String formatDiscount(String savings) {
        if (savings == null || savings.isBlank()) {
            return null;
        }
        try {
            int rounded = new BigDecimal(savings.trim())
                    .max(BigDecimal.ZERO)
                    .min(new BigDecimal("100"))
                    .setScale(0, RoundingMode.HALF_UP)
                    .intValue();
            return rounded > 0 ? "-" + rounded + "%" : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    static String computeLowestEver(String existingLowestEver, ObservedOffer offer) {
        return computeLowestEver(existingLowestEver, true, offer);
    }

    static String computeLowestEver(
            String existingLowestEver,
            boolean existingLowestEverVerified,
            ObservedOffer offer) {
        if (!existingLowestEverVerified
                || existingLowestEver == null
                || existingLowestEver.isBlank()
                || "Not established".equalsIgnoreCase(existingLowestEver.trim())
                || "—".equals(existingLowestEver.trim())) {
            return offer.priceLabel();
        }
        Optional<WishlistPriceParser.ParsedPrice> parsedExisting =
                WishlistPriceParser.parse(existingLowestEver, offer.currency());
        if (parsedExisting.isEmpty()) {
            return offer.priceLabel();
        }
        WishlistPriceParser.ParsedPrice existing = parsedExisting.get();
        return offer.priceAmount().compareTo(existing.amount()) < 0
                ? offer.priceLabel()
                : existingLowestEver;
    }

    public record ObservedOffer(
            String priceLabel,
            BigDecimal priceAmount,
            String currency,
            String discount,
            String externalGameId,
            String externalDealId,
            String thumbUrl
    ) {
    }

    private record Candidate(
            CheapSharkDealResponse response,
            BigDecimal salePrice,
            String externalGameId,
            String externalDealId) {
    }
}
