package com.nexora.api.wishlist.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "wishlist_items")
public class WishlistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String store;

    @Column(name = "current_price", nullable = false)
    private String currentPrice;

    @Column(name = "target_price", nullable = false)
    private String targetPrice;

    @Column(name = "lowest_ever", nullable = false)
    private String lowestEver;

    private String discount;

    @Column(nullable = false)
    private String status;

    @Column(name = "alert_active", nullable = false)
    private boolean alertActive;

    @Column(nullable = false)
    private String priority;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "user_id")
    private Long userId;

    protected WishlistItem() {
    }

    public WishlistItem(Long id, String title, String store, String currentPrice,
                        String targetPrice, String lowestEver, String discount,
                        String status, boolean alertActive, String priority,
                        boolean active) {
        this(id, title, store, currentPrice, targetPrice, lowestEver, discount,
                status, alertActive, priority, active, null);
    }

    public WishlistItem(Long id, String title, String store, String currentPrice,
                        String targetPrice, String lowestEver, String discount,
                        String status, boolean alertActive, String priority,
                        boolean active, Long userId) {
        this.id = id;
        this.title = title;
        this.store = store;
        this.currentPrice = currentPrice;
        this.targetPrice = targetPrice;
        this.lowestEver = lowestEver;
        this.discount = discount;
        this.status = status;
        this.alertActive = alertActive;
        this.priority = priority;
        this.active = active;
        this.userId = userId;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
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

    public String getLowestEver() {
        return lowestEver;
    }

    public String getDiscount() {
        return discount;
    }

    public String getStatus() {
        return status;
    }

    public boolean isAlertActive() {
        return alertActive;
    }

    public String getPriority() {
        return priority;
    }

    public boolean isActive() {
        return active;
    }

    public Long getUserId() {
        return userId;
    }

    public void deactivate() {
        active = false;
    }

    public void updateAlertSettings(String targetPrice, Boolean alertActive, String priority) {
        if (targetPrice != null) {
            this.targetPrice = targetPrice;
        }
        if (alertActive != null) {
            this.alertActive = alertActive;
        }
        if (priority != null) {
            this.priority = priority;
        }
    }
}
