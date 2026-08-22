package com.nexora.api.wishlist.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "wishlist_price_history")
public class WishlistPriceHistoryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "wishlist_item_id", nullable = false)
    private Long wishlistItemId;

    @Column(name = "item_title", nullable = false, length = 255)
    private String itemTitle;

    @Column(nullable = false, length = 255)
    private String store;

    @Column(name = "price_label", nullable = false, length = 255)
    private String priceLabel;

    @Column(name = "price_amount", precision = 12, scale = 2)
    private BigDecimal priceAmount;

    @Column(length = 16)
    private String currency;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "observed_at", nullable = false, updatable = false)
    private LocalDateTime observedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected WishlistPriceHistoryEntry() {
    }

    public WishlistPriceHistoryEntry(
            Long id,
            long userId,
            long wishlistItemId,
            String itemTitle,
            String store,
            String priceLabel,
            BigDecimal priceAmount,
            String currency,
            String source,
            LocalDateTime observedAt,
            LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.wishlistItemId = wishlistItemId;
        this.itemTitle = itemTitle;
        this.store = store;
        this.priceLabel = priceLabel;
        this.priceAmount = priceAmount;
        this.currency = currency;
        this.source = source;
        this.observedAt = observedAt;
        this.createdAt = createdAt;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (observedAt == null) {
            observedAt = now;
        }
        if (createdAt == null) {
            createdAt = now;
        }
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getWishlistItemId() {
        return wishlistItemId;
    }

    public String getItemTitle() {
        return itemTitle;
    }

    public String getStore() {
        return store;
    }

    public String getPriceLabel() {
        return priceLabel;
    }

    public BigDecimal getPriceAmount() {
        return priceAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getSource() {
        return source;
    }

    public LocalDateTime getObservedAt() {
        return observedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
