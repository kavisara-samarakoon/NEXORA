CREATE TABLE wishlist_price_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    wishlist_item_id BIGINT NOT NULL,
    item_title VARCHAR(255) NOT NULL,
    store VARCHAR(255) NOT NULL,
    price_label VARCHAR(255) NOT NULL,
    price_amount NUMERIC(12, 2) NULL,
    currency VARCHAR(16) NULL,
    source VARCHAR(64) NOT NULL,
    observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlist_price_history_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_wishlist_price_history_item
        FOREIGN KEY (wishlist_item_id) REFERENCES wishlist_items(id),
    CONSTRAINT ck_wishlist_price_history_title_not_blank
        CHECK (BTRIM(item_title) <> ''),
    CONSTRAINT ck_wishlist_price_history_store_not_blank
        CHECK (BTRIM(store) <> ''),
    CONSTRAINT ck_wishlist_price_history_label_not_blank
        CHECK (BTRIM(price_label) <> ''),
    CONSTRAINT ck_wishlist_price_history_source_not_blank
        CHECK (BTRIM(source) <> '')
);

CREATE INDEX ix_wishlist_price_history_user_item_observed
    ON wishlist_price_history (user_id, wishlist_item_id, observed_at);

CREATE INDEX ix_wishlist_price_history_item_observed
    ON wishlist_price_history (wishlist_item_id, observed_at);

CREATE INDEX ix_wishlist_price_history_user_observed
    ON wishlist_price_history (user_id, observed_at);

CREATE INDEX ix_wishlist_price_history_source
    ON wishlist_price_history (source);
