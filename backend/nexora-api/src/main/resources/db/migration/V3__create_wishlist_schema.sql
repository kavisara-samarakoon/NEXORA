CREATE TABLE wishlist_items (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    store VARCHAR NOT NULL,
    current_price VARCHAR NOT NULL,
    target_price VARCHAR NOT NULL,
    lowest_ever VARCHAR NOT NULL,
    discount VARCHAR NULL,
    status VARCHAR NOT NULL,
    alert_active BOOLEAN NOT NULL,
    priority VARCHAR NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO wishlist_items (
    id,
    title,
    store,
    current_price,
    target_price,
    lowest_ever,
    discount,
    status,
    alert_active,
    priority
)
VALUES
    (1, 'Ghost of Tsushima: Director''s Cut', 'Steam', '$39.99', '$24.99',
        '$29.99', '-25%', 'price-drop', TRUE, 'high'),
    (2, 'Persona 5 Royal', 'Steam', '$29.99', '$19.99',
        '$29.99', '-50%', 'price-drop', TRUE, 'high'),
    (3, 'Monster Hunter Wilds', 'Epic Games', '$69.99', '$44.99',
        '$59.99', NULL, 'tracking', TRUE, 'medium'),
    (4, 'The Witcher 4', 'GOG', 'TBA', '$49.99',
        '—', NULL, 'tracking', TRUE, 'low'),
    (5, 'Hollow Knight: Silksong', 'Steam', 'FREE', '$0.00',
        'FREE', '-100%', 'free-now', FALSE, 'high'),
    (6, 'Starfield: Shattered Space', 'Steam', '$41.99', '$29.99',
        '$41.99', '-40%', 'price-drop', TRUE, 'medium'),
    (7, 'Baldur''s Gate 3', 'GOG', '$59.99', '$39.99',
        '$47.99', NULL, 'tracking', FALSE, 'low'),
    (8, 'Dead Cells: Return to Castlevania', 'Epic Games', 'FREE', '$0.00',
        'FREE', '-100%', 'free-now', FALSE, 'high');

SELECT setval(
    pg_get_serial_sequence('wishlist_items', 'id'),
    (SELECT MAX(id) FROM wishlist_items)
);
