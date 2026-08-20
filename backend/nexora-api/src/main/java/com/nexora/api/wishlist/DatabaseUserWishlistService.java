package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistAlertEvent;
import com.nexora.api.wishlist.persistence.WishlistAlertEventRepository;
import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Profile("dev")
public class DatabaseUserWishlistService implements UserWishlistService {

    private final WishlistItemRepository wishlistItemRepository;
    private final WishlistAlertEventRepository wishlistAlertEventRepository;

    public DatabaseUserWishlistService(
            WishlistItemRepository wishlistItemRepository,
            WishlistAlertEventRepository wishlistAlertEventRepository) {
        this.wishlistItemRepository = wishlistItemRepository;
        this.wishlistAlertEventRepository = wishlistAlertEventRepository;
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
        return wishlistAlertEventRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(WishlistAlertEventMapper::toResponse)
                .toList();
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
        WishlistAlertEvaluation evaluation = evaluate(savedItem);
        if (evaluation.targetReached()) {
            recordAlertEvent(userId, savedItem, evaluation);
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
            recordAlertEvent(userId, savedItem, newEvaluation);
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

    private void recordAlertEvent(
            long userId,
            com.nexora.api.wishlist.persistence.WishlistItem item,
            WishlistAlertEvaluation evaluation) {
        wishlistAlertEventRepository.saveAndFlush(new WishlistAlertEvent(
                null,
                userId,
                item.getId(),
                item.getTitle(),
                item.getStore(),
                item.getCurrentPrice(),
                item.getTargetPrice(),
                evaluation.state(),
                evaluation.targetReached(),
                evaluation.message(),
                null
        ));
    }
}
