ALTER TABLE wishlist_items
    ADD COLUMN user_id BIGINT NULL;

ALTER TABLE wishlist_items
    ADD CONSTRAINT fk_wishlist_items_user
        FOREIGN KEY (user_id) REFERENCES users(id);

CREATE INDEX ix_wishlist_items_user_active
    ON wishlist_items (user_id, is_active, id);
