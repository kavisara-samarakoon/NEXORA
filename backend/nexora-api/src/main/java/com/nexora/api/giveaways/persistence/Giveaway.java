package com.nexora.api.giveaways.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "giveaways")
public class Giveaway {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String platform;

    @Column(name = "platform_label", nullable = false)
    private String platformLabel;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String genre;

    @Column(nullable = false)
    private String timer;

    @Column(name = "days_remaining", nullable = false)
    private int daysRemaining;

    @Column(nullable = false)
    private int claimed;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String tag;

    @Column(name = "original_price", nullable = false)
    private String originalPrice;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    protected Giveaway() {
    }

    public Giveaway(Long id, String platform, String platformLabel, String title,
                    String genre, String timer, int daysRemaining, int claimed,
                    String status, String tag, String originalPrice, boolean active) {
        this.id = id;
        this.platform = platform;
        this.platformLabel = platformLabel;
        this.title = title;
        this.genre = genre;
        this.timer = timer;
        this.daysRemaining = daysRemaining;
        this.claimed = claimed;
        this.status = status;
        this.tag = tag;
        this.originalPrice = originalPrice;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public String getPlatform() {
        return platform;
    }

    public String getPlatformLabel() {
        return platformLabel;
    }

    public String getTitle() {
        return title;
    }

    public String getGenre() {
        return genre;
    }

    public String getTimer() {
        return timer;
    }

    public int getDaysRemaining() {
        return daysRemaining;
    }

    public int getClaimed() {
        return claimed;
    }

    public String getStatus() {
        return status;
    }

    public String getTag() {
        return tag;
    }

    public String getOriginalPrice() {
        return originalPrice;
    }

    public boolean isActive() {
        return active;
    }
}
