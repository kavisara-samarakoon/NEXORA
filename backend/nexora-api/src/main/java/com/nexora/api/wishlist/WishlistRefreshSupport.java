package com.nexora.api.wishlist;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.ToLongFunction;

final class WishlistRefreshSupport {

    static final int MAX_REFRESH_ITEMS_PER_REQUEST = 10;
    static final String REFRESH_SOURCE = "cheapshark-refresh";
    static final String SCHEDULED_SOURCE = "cheapshark-scheduled";

    private WishlistRefreshSupport() {
    }

    static boolean isVerifiedProviderSource(String source) {
        if (source == null || source.isBlank()) {
            return false;
        }
        String normalized = source.trim();
        return REFRESH_SOURCE.equals(normalized) || SCHEDULED_SOURCE.equals(normalized);
    }

    static boolean isUsdEligible(String currency) {
        return "USD".equalsIgnoreCase(currency == null ? null : currency.trim());
    }

    static String resolveNextStatus(CheapSharkWishlistLiveLookup.ObservedOffer offer) {
        if (offer.priceAmount().signum() == 0) {
            return "free-now";
        }
        return offer.discount() != null ? "price-drop" : "tracking";
    }

    static boolean canApplyOffer(String existingExternalGameId, CheapSharkWishlistLiveLookup.ObservedOffer offer) {
        if (offer == null || !"USD".equalsIgnoreCase(offer.currency())) {
            return false;
        }
        if (existingExternalGameId == null || existingExternalGameId.isBlank()) {
            return true;
        }
        return offer.externalGameId() != null
                && existingExternalGameId.trim().equals(offer.externalGameId().trim());
    }

    static boolean applyVerifiedOffer(
            com.nexora.api.wishlist.persistence.WishlistItem item,
            CheapSharkWishlistLiveLookup.ObservedOffer offer,
            String source) {
        String lowest = CheapSharkWishlistLiveLookup.computeLowestEver(item.getLowestEver(),
                isVerifiedProviderSource(item.getLowestEverSource()), offer);
        String status = resolveNextStatus(offer);
        String gameId = item.getExternalGameId() != null && !item.getExternalGameId().isBlank()
                ? item.getExternalGameId() : offer.externalGameId();
        String thumb = offer.thumbUrl() != null ? offer.thumbUrl() : item.getThumbUrl();
        if (!hasMaterialOfferChange(item.getCurrentPrice(), item.getLowestEver(),
                item.getLowestEverSource(), item.getDiscount(), item.getStatus(),
                item.getExternalGameId(), item.getExternalDealId(), item.getThumbUrl(),
                item.getPriceSource(), lowest, status, gameId, offer.externalDealId(), thumb, offer)) {
            return false;
        }
        String lowestSource = lowestSource(item.getLowestEver(), item.getLowestEverSource(), lowest, source);
        item.updateObservedOffer(offer.priceLabel(), lowest, offer.discount(), status, gameId,
                offer.externalDealId(), thumb, source, lowestSource);
        return true;
    }

    static String lowestSource(String previousLowest, String previousSource, String lowest, String source) {
        return isVerifiedProviderSource(previousSource) && Objects.equals(previousLowest, lowest)
                ? previousSource : source;
    }

    static boolean hasMaterialOfferChange(
            String currentPrice,
            String lowestEver,
            String lowestEverSource,
            String discount,
            String status,
            String externalGameId,
            String externalDealId,
            String thumbUrl,
            String priceSource,
            String nextLowest,
            String nextStatus,
            String nextExternalGameId,
            String nextExternalDealId,
            String nextThumbUrl,
            CheapSharkWishlistLiveLookup.ObservedOffer offer) {
        return !Objects.equals(offer.priceLabel(), currentPrice)
                || !Objects.equals(nextLowest, lowestEver)
                || !isVerifiedProviderSource(lowestEverSource)
                || !Objects.equals(offer.discount(), discount)
                || !Objects.equals(nextStatus, status)
                || !isVerifiedProviderSource(priceSource)
                || !Objects.equals(nextExternalGameId, externalGameId)
                || !Objects.equals(nextExternalDealId, externalDealId)
                || !Objects.equals(nextThumbUrl, thumbUrl);
    }

    static <T> BatchSelection<T> selectBatch(
            List<T> eligibleItems,
            Long cursor,
            ToLongFunction<T> idExtractor,
            int limit) {
        if (limit <= 0) {
            return new BatchSelection<>(List.of(), false, null);
        }
        // Use an immutable key for the whole cycle. Refreshing a page changes its check timestamps.
        List<T> page = eligibleItems.stream()
                .filter(item -> cursor == null || idExtractor.applyAsLong(item) > cursor)
                .sorted(Comparator.comparingLong(idExtractor))
                .limit((long) limit + 1)
                .toList();
        boolean hasMore = page.size() > limit;
        List<T> batch = hasMore ? page.subList(0, limit) : page;
        Long nextCursor = hasMore ? idExtractor.applyAsLong(batch.get(batch.size() - 1)) : null;
        return new BatchSelection<>(List.copyOf(batch), hasMore, nextCursor);
    }

    record BatchSelection<T>(List<T> batch, boolean hasMore, Long nextCursor) {
    }
}
