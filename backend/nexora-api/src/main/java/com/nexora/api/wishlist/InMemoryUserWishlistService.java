package com.nexora.api.wishlist;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Profile("!dev")
public class InMemoryUserWishlistService implements UserWishlistService {

    private final AtomicLong ids = new AtomicLong();
    private final Map<Long, StoredWishlistItem> items = new ConcurrentHashMap<>();

    @Override
    public List<WishlistItem> getWishlistItems(long userId) {
        return items.values().stream()
                .filter(item -> item.userId() == userId && item.active())
                .map(StoredWishlistItem::item)
                .sorted(Comparator.comparingLong(WishlistItem::id))
                .toList();
    }

    @Override
    public synchronized WishlistItem addWishlistItem(long userId, AddWishlistItemRequest request) {
        long id = ids.incrementAndGet();
        WishlistItem item = WishlistItemMapper.toResponse(id, WishlistItemValues.from(request));
        items.put(id, new StoredWishlistItem(userId, item, true));
        return item;
    }

    @Override
    public synchronized void deleteWishlistItem(long userId, long itemId) {
        StoredWishlistItem storedItem = items.get(itemId);
        if (storedItem == null || storedItem.userId() != userId || !storedItem.active()) {
            throw new WishlistItemNotFoundException();
        }
        items.put(itemId, new StoredWishlistItem(userId, storedItem.item(), false));
    }

    private record StoredWishlistItem(long userId, WishlistItem item, boolean active) {
    }
}
