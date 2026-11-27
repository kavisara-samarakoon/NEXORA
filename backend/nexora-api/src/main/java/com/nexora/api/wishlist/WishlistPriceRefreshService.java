package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItem;
import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.function.Supplier;

@Service
@Profile("dev")
public class WishlistPriceRefreshService {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(WishlistPriceRefreshService.class);

    private final WishlistItemRepository wishlistItemRepository;
    private final WishlistPriceSnapshotProvider priceSnapshotProvider;
    private final WishlistAlertEventRecorder alertEventRecorder;
    private final WishlistPriceHistoryService priceHistoryService;

    public WishlistPriceRefreshService(
            WishlistItemRepository wishlistItemRepository,
            WishlistPriceSnapshotProvider priceSnapshotProvider,
            WishlistAlertEventRecorder alertEventRecorder,
            WishlistPriceHistoryService priceHistoryService) {
        this.wishlistItemRepository = wishlistItemRepository;
        this.priceSnapshotProvider = priceSnapshotProvider;
        this.alertEventRecorder = alertEventRecorder;
        this.priceHistoryService = priceHistoryService;
    }

    @Transactional
    public WishlistPriceRefreshSummary refreshActiveWishlistAlerts() {
        int scannedItems = 0;
        int refreshedItems = 0;
        int targetReachedEventsCreated = 0;
        int skippedItems = 0;
        String source = null;
        boolean sourceLoaded = false;
        LocalDateTime checkedAt = LocalDateTime.now(ZoneOffset.UTC);

        for (WishlistItem item : wishlistItemRepository.findActiveUserAlertItemsForRefresh()) {
            scannedItems++;

            // Keep the service safe even if a custom repository implementation returns
            // a row outside the query contract.
            if (item == null || !item.isActive()
                    || item.getUserId() == null || !item.isAlertActive()) {
                skippedItems++;
                continue;
            }

            if (!sourceLoaded) {
                source = priceSnapshotProvider.priceHistorySource();
                sourceLoaded = true;
            }
            boolean verified = WishlistRefreshSupport.SCHEDULED_SOURCE.equals(source);
            boolean wasVerified = WishlistRefreshSupport.isVerifiedProviderSource(item.getPriceSource());
            if ((verified && !WishlistRefreshSupport.isUsdEligible(item.getCurrency()))
                    || (!verified && wasVerified && !"stored-provider".equals(source))) {
                skippedItems++;
                continue;
            }

            WishlistAlertEvaluation previousEvaluation = evaluate(item);
            if (verified) {
                Optional<CheapSharkWishlistLiveLookup.ObservedOffer> observed = lookup(item,
                        () -> priceSnapshotProvider.findVerifiedOffer(item));
                if (observed.isEmpty() || !WishlistRefreshSupport.canApplyOffer(
                        item.getExternalGameId(), observed.get())) {
                    skippedItems++;
                    continue;
                }

                item.markChecked(checkedAt);
                if (WishlistRefreshSupport.applyVerifiedOffer(item, observed.get(), source)) {
                    wishlistItemRepository.save(item);
                    refreshedItems++;
                }
                priceHistoryService.recordSnapshot(item.getUserId(), item, source);
                WishlistAlertEvaluation current = evaluate(item);
                if ((!wasVerified || !previousEvaluation.targetReached()) && current.targetReached()
                        && alertEventRecorder.recordTargetReachedEvent(item.getUserId(), item, current, source)) {
                    targetReachedEventsCreated++;
                }
                continue;
            }

            Optional<String> providedPrice = lookup(item, () -> priceSnapshotProvider.findCurrentPrice(item))
                    .filter(price -> !price.isBlank()).map(String::trim);
            if (providedPrice.isEmpty()) {
                skippedItems++;
                continue;
            }

            item.markChecked(checkedAt);
            if ("stored-provider".equals(source) || providedPrice.get().equals(item.getCurrentPrice())) {
                continue;
            }

            // Legacy or custom string-only providers cannot establish verified price provenance.
            String unverifiedSource = "price-refresh";
            item.updateCurrentPrice(providedPrice.get());
            wishlistItemRepository.save(item);
            priceHistoryService.recordSnapshot(item.getUserId(), item, unverifiedSource);
            refreshedItems++;

            WishlistAlertEvaluation current = evaluate(item);
            if (!previousEvaluation.targetReached() && current.targetReached()
                    && alertEventRecorder.recordTargetReachedEvent(item.getUserId(), item, current, unverifiedSource)) {
                targetReachedEventsCreated++;
            }
        }

        return new WishlistPriceRefreshSummary(
                scannedItems,
                refreshedItems,
                targetReachedEventsCreated,
                skippedItems
        );
    }

    private static <T> Optional<T> lookup(WishlistItem item, Supplier<Optional<T>> query) {
        try {
            Optional<T> result = query.get();
            return result == null ? Optional.empty() : result;
        } catch (RuntimeException exception) {
            LOGGER.warn("Wishlist price provider failed for item {}; skipping it ({})",
                    item.getId(), exception.getMessage());
            return Optional.empty();
        }
    }

    private static WishlistAlertEvaluation evaluate(WishlistItem item) {
        String currency = WishlistPriceParser.establishStoredCurrency(
                item.getCurrentPrice(), item.getTargetPrice(), item.getCurrency());
        return WishlistAlertEvaluator.evaluate(
                item.getCurrentPrice(),
                item.getTargetPrice(),
                item.isAlertActive(),
                currency
        );
    }
}
