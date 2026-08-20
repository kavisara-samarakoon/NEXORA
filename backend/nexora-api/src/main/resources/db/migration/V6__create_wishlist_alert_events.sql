CREATE TABLE wishlist_alert_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    wishlist_item_id BIGINT NOT NULL,
    item_title VARCHAR(255) NOT NULL,
    store VARCHAR(255) NOT NULL,
    current_price VARCHAR(255) NOT NULL,
    target_price VARCHAR(255) NOT NULL,
    evaluation_state VARCHAR(64) NOT NULL,
    target_reached BOOLEAN NOT NULL,
    message VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlist_alert_events_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_wishlist_alert_events_item
        FOREIGN KEY (wishlist_item_id) REFERENCES wishlist_items(id)
);

CREATE INDEX ix_wishlist_alert_events_user_created
    ON wishlist_alert_events (user_id, created_at);

CREATE INDEX ix_wishlist_alert_events_item_created
    ON wishlist_alert_events (wishlist_item_id, created_at);

CREATE INDEX ix_wishlist_alert_events_state
    ON wishlist_alert_events (evaluation_state);
