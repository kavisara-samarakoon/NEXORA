package com.nexora.api.deals.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "deals")
public class Deal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "discount_label", nullable = false)
    private String discountLabel;

    @Column(name = "discount_value")
    private Integer discountValue;

    @Column(name = "price_old", nullable = false)
    private String priceOld;

    @Column(name = "price_new", nullable = false)
    private String priceNew;

    @Column(name = "price_value")
    private BigDecimal priceValue;

    @Column(nullable = false)
    private String status;

    @Column(name = "is_active")
    private boolean active;

    protected Deal() {
    }

    public Deal(Long id, Game game, Store store, String discountLabel, Integer discountValue,
                String priceOld, String priceNew, BigDecimal priceValue, String status, boolean active) {
        this.id = id;
        this.game = game;
        this.store = store;
        this.discountLabel = discountLabel;
        this.discountValue = discountValue;
        this.priceOld = priceOld;
        this.priceNew = priceNew;
        this.priceValue = priceValue;
        this.status = status;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public Game getGame() {
        return game;
    }

    public Store getStore() {
        return store;
    }

    public String getDiscountLabel() {
        return discountLabel;
    }

    public Integer getDiscountValue() {
        return discountValue;
    }

    public String getPriceOld() {
        return priceOld;
    }

    public String getPriceNew() {
        return priceNew;
    }

    public BigDecimal getPriceValue() {
        return priceValue;
    }

    public String getStatus() {
        return status;
    }

    public boolean isActive() {
        return active;
    }
}
