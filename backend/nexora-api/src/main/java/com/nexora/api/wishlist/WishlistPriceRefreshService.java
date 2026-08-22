package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItem;
import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

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

        for (WishlistItem item : wishlistItemRepository.findActiveUserAlertItemsForRefresh()) {
            scannedItems++;

            // Keep the service safe even if a custom repository implementation returns
            // a row outside the query contract.
            if (item == null || !item.isActive()
                    || item.getUserId() == null || !item.isAlertActive()) {
                skippedItems++;
                continue;
            }

            WishlistAlertEvaluation previousEvaluation = evaluate(item);
            Optional<String> providedPrice;
            try {
                providedPrice = priceSnapshotProvider.findCurrentPrice(item);
            } catch (RuntimeException exception) {
                LOGGER.warn(
                        "Wishlist price provider failed for item {}; skipping it ({})",
                        item.getId(),
                        exception.getMessage()
                );
                skippedItems++;
                continue;
            }
            if (providedPrice == null || providedPrice.isEmpty()
                    || providedPrice.get() == null || providedPrice.get().isBlank()) {
                skippedItems++;
                continue;
            }

            String latestPrice = providedPrice.get().trim();
            if (!latestPrice.equals(item.getCurrentPrice())) {
                item.updateCurrentPrice(latestPrice);
                wishlistItemRepository.save(item);
                priceHistoryService.recordSnapshot(
                        item.getUserId(), item, priceSnapshotProvider.priceHistorySource());
                refreshedItems++;
            }

            WishlistAlertEvaluation newEvaluation = evaluate(item);
            if (!previousEvaluation.targetReached() && newEvaluation.targetReached()) {
                alertEventRecorder.recordTargetReachedEvent(
                        item.getUserId(), item, newEvaluation);
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

    private static WishlistAlertEvaluation evaluate(WishlistItem item) {
        return WishlistAlertEvaluator.evaluate(
                item.getCurrentPrice(),
                item.getTargetPrice(),
                item.isAlertActive()
        );
    }
}
