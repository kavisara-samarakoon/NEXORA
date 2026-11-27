package com.nexora.api.wishlist.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Locale;

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

    @Column(name = "external_game_id", length = 64)
    private String externalGameId;

    @Column(name = "external_deal_id", length = 128)
    private String externalDealId;

    @Column(nullable = false, length = 16)
    private String currency = "UNKNOWN";

    @Column(name = "thumb_url", length = 512)
    private String thumbUrl;

    @Column(name = "price_source", nullable = false, length = 64)
    private String priceSource = "unverified";

    @Column(name = "lowest_ever_source", nullable = false, length = 64)
    private String lowestEverSource = "unverified";

    @Column(name = "last_checked_at")
    private LocalDateTime lastCheckedAt;

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
        this(id, title, store, currentPrice, targetPrice, lowestEver, discount,
                status, alertActive, priority, active, userId, null, null,
                inferInitialCurrency(currentPrice), null,
                userId == null ? "seeded-sample" : "unverified",
                userId == null ? "seeded-sample" : "unverified");
    }

    public WishlistItem(Long id, String title, String store, String currentPrice,
                        String targetPrice, String lowestEver, String discount,
                        String status, boolean alertActive, String priority,
                        boolean active, Long userId, String externalGameId,
                        String externalDealId, String currency, String thumbUrl) {
        this(id, title, store, currentPrice, targetPrice, lowestEver, discount,
                status, alertActive, priority, active, userId, externalGameId,
                externalDealId, currency, thumbUrl, "unverified", "unverified");
    }

    public WishlistItem(Long id, String title, String store, String currentPrice,
                        String targetPrice, String lowestEver, String discount,
                        String status, boolean alertActive, String priority,
                        boolean active, Long userId, String externalGameId,
                        String externalDealId, String currency, String thumbUrl,
                        String priceSource, String lowestEverSource) {
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
        this.externalGameId = externalGameId;
        this.externalDealId = externalDealId;
        this.currency = currency == null || currency.isBlank()
                ? inferInitialCurrency(currentPrice)
                : currency.trim().toUpperCase(Locale.ROOT);
        this.thumbUrl = thumbUrl;
        this.priceSource = priceSource == null || priceSource.isBlank() ? "unverified" : priceSource;
        this.lowestEverSource = lowestEverSource == null || lowestEverSource.isBlank()
                ? "unverified"
                : lowestEverSource;
    }

    private static String inferInitialCurrency(String currentPrice) {
        if (currentPrice == null) return "UNKNOWN";
        String trimmed = currentPrice.trim();
        String upper = trimmed.toUpperCase(Locale.ROOT);
        if (trimmed.startsWith("$") || trimmed.endsWith("$") || upper.startsWith("USD ")) {
            return "USD";
        }
        if (trimmed.startsWith("€") || upper.startsWith("EUR ")) {
            return "EUR";
        }
        if (trimmed.startsWith("£") || upper.startsWith("GBP ")) {
            return "GBP";
        }
        return "UNKNOWN";
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

    public String getExternalGameId() {
        return externalGameId;
    }

    public String getExternalDealId() {
        return externalDealId;
    }

    public String getCurrency() {
        return currency;
    }

    public String getThumbUrl() {
        return thumbUrl;
    }

    public String getPriceSource() {
        return priceSource;
    }

    public String getLowestEverSource() {
        return lowestEverSource;
    }

    public LocalDateTime getLastCheckedAt() {
        return lastCheckedAt;
    }

    public void markChecked(LocalDateTime checkedAt) {
        this.lastCheckedAt = checkedAt;
    }

    public void deactivate() {
        active = false;
    }

    public void updateCurrentPrice(String currentPrice) {
        if (currentPrice == null) {
            return;
        }

        String trimmedCurrentPrice = currentPrice.trim();
        if (!trimmedCurrentPrice.isEmpty()) {
            this.currentPrice = trimmedCurrentPrice;
        }
    }

    public void updateObservedOffer(
            String currentPrice,
            String lowestEver,
            String discount,
            String status,
            String externalGameId,
            String externalDealId,
            String thumbUrl,
            String priceSource,
            String lowestEverSource) {
        if (this.externalGameId != null && !this.externalGameId.isBlank()
                && externalGameId != null && !externalGameId.isBlank()
                && !this.externalGameId.trim().equals(externalGameId.trim())) {
            throw new IllegalStateException("Cannot overwrite an established external game identity.");
        }
        updateCurrentPrice(currentPrice);
        if (lowestEver != null && !lowestEver.isBlank()) {
            this.lowestEver = lowestEver.trim();
        }
        this.discount = discount;
        if (status != null && !status.isBlank()) {
            this.status = status.trim();
        }
        if ((this.externalGameId == null || this.externalGameId.isBlank())
                && externalGameId != null && !externalGameId.isBlank()) {
            this.externalGameId = externalGameId.trim();
        }
        this.externalDealId = externalDealId == null || externalDealId.isBlank() ? null : externalDealId.trim();
        if (thumbUrl != null && !thumbUrl.isBlank()) {
            this.thumbUrl = thumbUrl.trim();
        }
        if (priceSource != null && !priceSource.isBlank()) {
            this.priceSource = priceSource.trim();
        }
        if (lowestEverSource != null && !lowestEverSource.isBlank()) {
            this.lowestEverSource = lowestEverSource.trim();
        }
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
