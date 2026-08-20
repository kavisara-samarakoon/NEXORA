package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Profile("dev")
public class DatabaseUserWishlistService implements UserWishlistService {

    private final WishlistItemRepository wishlistItemRepository;

    public DatabaseUserWishlistService(WishlistItemRepository wishlistItemRepository) {
        this.wishlistItemRepository = wishlistItemRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WishlistItem> getWishlistItems(long userId) {
        return wishlistItemRepository.findByUserIdAndActiveTrueOrderById(userId).stream()
                .map(WishlistItemMapper::toResponse)
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
        return WishlistItemMapper.toResponse(savedItem);
    }

    @Override
    @Transactional
    public WishlistItem updateWishlistAlert(
            long userId, long itemId, UpdateWishlistAlertRequest request) {
        com.nexora.api.wishlist.persistence.WishlistItem item = wishlistItemRepository
                .findByIdAndUserIdAndActiveTrue(itemId, userId)
                .orElseThrow(WishlistItemNotFoundException::new);
        item.updateAlertSettings(
                trimmed(request.targetPrice()),
                request.alertActive(),
                trimmed(request.priority())
        );
        return WishlistItemMapper.toResponse(wishlistItemRepository.saveAndFlush(item));
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
}
