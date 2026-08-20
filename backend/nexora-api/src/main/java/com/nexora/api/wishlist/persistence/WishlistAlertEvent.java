package com.nexora.api.wishlist.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "wishlist_alert_events")
public class WishlistAlertEvent {

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

    @Column(name = "current_price", nullable = false, length = 255)
    private String currentPrice;

    @Column(name = "target_price", nullable = false, length = 255)
    private String targetPrice;

    @Column(name = "evaluation_state", nullable = false, length = 64)
    private String evaluationState;

    @Column(name = "target_reached", nullable = false)
    private boolean targetReached;

    @Column(nullable = false, length = 255)
    private String message;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected WishlistAlertEvent() {
    }

    public WishlistAlertEvent(
            Long id,
            long userId,
            long wishlistItemId,
            String itemTitle,
            String store,
            String currentPrice,
            String targetPrice,
            String evaluationState,
            boolean targetReached,
            String message,
            LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.wishlistItemId = wishlistItemId;
        this.itemTitle = itemTitle;
        this.store = store;
        this.currentPrice = currentPrice;
        this.targetPrice = targetPrice;
        this.evaluationState = evaluationState;
        this.targetReached = targetReached;
        this.message = message;
        this.createdAt = createdAt;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now(ZoneOffset.UTC);
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

    public String getCurrentPrice() {
        return currentPrice;
    }

    public String getTargetPrice() {
        return targetPrice;
    }

    public String getEvaluationState() {
        return evaluationState;
    }

    public boolean isTargetReached() {
        return targetReached;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
