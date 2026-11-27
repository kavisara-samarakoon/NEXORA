ALTER TABLE wishlist_items
    ADD COLUMN external_game_id VARCHAR(64) NULL,
    ADD COLUMN external_deal_id VARCHAR(128) NULL,
    ADD COLUMN currency VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN thumb_url VARCHAR(512) NULL,
    ADD COLUMN price_source VARCHAR(64) NOT NULL DEFAULT 'unverified',
    ADD COLUMN lowest_ever_source VARCHAR(64) NOT NULL DEFAULT 'unverified',
    ADD COLUMN last_checked_at TIMESTAMP NULL;

UPDATE wishlist_items
SET currency = CASE
        WHEN BTRIM(current_price) ~ '^(\$|USD([[:space:]]|$))'
          OR BTRIM(current_price) ~ '^[0-9][0-9,]*(\.[0-9]+)?\$$'
            THEN 'USD'
        WHEN BTRIM(current_price) ~ '^(€|EUR([[:space:]]|$))'
            THEN 'EUR'
        WHEN BTRIM(current_price) ~ '^(£|GBP([[:space:]]|$))'
            THEN 'GBP'
        WHEN UPPER(BTRIM(current_price)) = 'FREE' AND (
            BTRIM(target_price) ~ '^(\$|USD([[:space:]]|$))'
            OR BTRIM(target_price) ~ '^[0-9][0-9,]*(\.[0-9]+)?\$$'
        ) THEN 'USD'
        WHEN UPPER(BTRIM(current_price)) = 'FREE'
          AND BTRIM(target_price) ~ '^(€|EUR([[:space:]]|$))'
            THEN 'EUR'
        WHEN UPPER(BTRIM(current_price)) = 'FREE'
          AND BTRIM(target_price) ~ '^(£|GBP([[:space:]]|$))'
            THEN 'GBP'
        ELSE 'UNKNOWN'
    END,
    price_source = CASE
        WHEN user_id IS NULL THEN 'seeded-sample'
        ELSE 'unverified'
    END,
    lowest_ever_source = CASE
        WHEN user_id IS NULL THEN 'seeded-sample'
        ELSE 'unverified'
    END;

WITH ranked_duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, LOWER(BTRIM(title)), LOWER(BTRIM(store))
               ORDER BY id ASC
           ) AS row_num
    FROM wishlist_items
    WHERE user_id IS NOT NULL
      AND is_active = TRUE
)
UPDATE wishlist_items
SET is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
    SELECT id FROM ranked_duplicates WHERE row_num > 1
);

CREATE UNIQUE INDEX uk_wishlist_items_user_active_title_store
    ON wishlist_items (user_id, LOWER(BTRIM(title)), LOWER(BTRIM(store)))
    WHERE user_id IS NOT NULL AND is_active = TRUE;

ALTER TABLE wishlist_price_history
    ADD COLUMN external_game_id VARCHAR(64) NULL,
    ADD COLUMN external_deal_id VARCHAR(128) NULL;

ALTER TABLE wishlist_alert_events
    ADD COLUMN delivery_status VARCHAR(64) NOT NULL DEFAULT 'not-delivered',
    ADD COLUMN observation_source VARCHAR(64) NULL;
