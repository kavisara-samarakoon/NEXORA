package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistAlertEventRepository;
import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Profile("dev")
public class DatabaseUserWishlistService implements UserWishlistService {

    private final WishlistItemRepository wishlistItemRepository;
    private final WishlistAlertEventRepository wishlistAlertEventRepository;
    private final WishlistAlertEventRecorder wishlistAlertEventRecorder;
    private final WishlistPriceHistoryService wishlistPriceHistoryService;

    public DatabaseUserWishlistService(
            WishlistItemRepository wishlistItemRepository,
            WishlistAlertEventRepository wishlistAlertEventRepository,
            WishlistAlertEventRecorder wishlistAlertEventRecorder,
            WishlistPriceHistoryService wishlistPriceHistoryService) {
        this.wishlistItemRepository = wishlistItemRepository;
        this.wishlistAlertEventRepository = wishlistAlertEventRepository;
        this.wishlistAlertEventRecorder = wishlistAlertEventRecorder;
        this.wishlistPriceHistoryService = wishlistPriceHistoryService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WishlistItem> getWishlistItems(long userId) {
        return wishlistItemRepository.findByUserIdAndActiveTrueOrderById(userId).stream()
                .map(WishlistItemMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WishlistAlertEventResponse> getWishlistAlertEvents(long userId) {
        return wishlistAlertEventRepository.findByUserIdOrderByCreatedAtDescIdDesc(
                        userId,
                        PageRequest.of(0, WishlistAlertHistoryPolicy.RESPONSE_LIMIT)
                ).stream()
                .map(WishlistAlertEventMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WishlistPriceHistoryPoint> getWishlistPriceHistory(
            long userId, long itemId, int limit) {
        wishlistItemRepository.findByIdAndUserIdAndActiveTrue(itemId, userId)
                .orElseThrow(WishlistItemNotFoundException::new);
        return wishlistPriceHistoryService.listRecent(userId, itemId, limit);
    }

    @Override
    @Transactional
    public WishlistItem addWishlistItem(long userId, AddWishlistItemRequest request) {
        WishlistItemValues values = WishlistItemValues.from(request);
        return wishlistItemRepository
                .findFirstByUserIdAndActiveTrueAndTitleIgnoreCaseAndStoreIgnoreCaseOrderByIdAsc(
                        userId,
                        values.title(),
                        values.store()
                )
                .map(WishlistItemMapper::toResponse)
                .orElseGet(() -> saveWishlistItem(userId, values));
    }

    private WishlistItem saveWishlistItem(long userId, WishlistItemValues values) {
        com.nexora.api.wishlist.persistence.WishlistItem savedItem =
                wishlistItemRepository.saveAndFlush(
                        new com.nexora.api.wishlist.persistence.WishlistItem(
                                null,
                                values.title(),
                                values.store(),
                                values.currentPrice(),
                                values.targetPrice(),
                                values.lowestEver(),
                                values.discount(),
                                values.status(),
                                values.alertActive(),
                                values.priority(),
                                true,
                                userId
                        )
                );
        wishlistPriceHistoryService.recordSnapshot(userId, savedItem, "wishlist-create");
        WishlistAlertEvaluation evaluation = evaluate(savedItem);
        if (evaluation.targetReached()) {
            wishlistAlertEventRecorder.recordTargetReachedEvent(
                    userId, savedItem, evaluation);
        }
        return WishlistItemMapper.toResponse(savedItem);
    }

    @Override
    @Transactional
    public WishlistItem updateWishlistAlert(
            long userId, long itemId, UpdateWishlistAlertRequest request) {
        com.nexora.api.wishlist.persistence.WishlistItem item = wishlistItemRepository
                .findByIdAndUserIdAndActiveTrue(itemId, userId)
                .orElseThrow(WishlistItemNotFoundException::new);
        WishlistAlertEvaluation previousEvaluation = evaluate(item);
        item.updateAlertSettings(
                trimmed(request.targetPrice()),
                request.alertActive(),
                trimmed(request.priority())
        );
        com.nexora.api.wishlist.persistence.WishlistItem savedItem =
                wishlistItemRepository.saveAndFlush(item);
        WishlistAlertEvaluation newEvaluation = evaluate(savedItem);
        if (!previousEvaluation.targetReached() && newEvaluation.targetReached()) {
            wishlistAlertEventRecorder.recordTargetReachedEvent(
                    userId, savedItem, newEvaluation);
        }
        return WishlistItemMapper.toResponse(savedItem);
    }

    @Override
    @Transactional
    public void deleteWishlistItem(long userId, long itemId) {
        com.nexora.api.wishlist.persistence.WishlistItem item = wishlistItemRepository
                .findByIdAndUserIdAndActiveTrue(itemId, userId)
                .orElseThrow(WishlistItemNotFoundException::new);
        item.deactivate();
        wishlistItemRepository.saveAndFlush(item);
    }

    private static String trimmed(String value) {
        return value == null ? null : value.trim();
    }

    private static WishlistAlertEvaluation evaluate(
            com.nexora.api.wishlist.persistence.WishlistItem item) {
        return WishlistAlertEvaluator.evaluate(
                item.getCurrentPrice(),
                item.getTargetPrice(),
                item.isAlertActive()
        );
    }

}
