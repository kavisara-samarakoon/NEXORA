CREATE TABLE games (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    rating NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stores (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deals (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL REFERENCES games(id),
    store_id BIGINT NOT NULL REFERENCES stores(id),
    discount_label VARCHAR NOT NULL,
    discount_value INTEGER,
    price_old VARCHAR NOT NULL,
    price_new VARCHAR NOT NULL,
    price_value NUMERIC,
    status VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO games (title, category, rating)
VALUES
    ('Elden Ring: Shadow of the Erdtree', 'Action RPG', 4.8),
    ('Cyberpunk 2077: Phantom Liberty', 'RPG', 4.6),
    ('Hades II — Early Access', 'Roguelike', 4.9),
    ('Baldur''s Gate 3', 'RPG', 4.9),
    ('Starfield: Shattered Space', 'Sci-Fi RPG', 3.8),
    ('Assassin''s Creed Mirage', 'Action', 4.2),
    ('GTA V: Premium Edition', 'Open World', 4.5),
    ('Ghost of Tsushima: Director''s Cut', 'Action Adventure', 4.7);

INSERT INTO stores (name)
VALUES
    ('Steam'),
    ('Epic Games'),
    ('Humble'),
    ('GOG'),
    ('Ubisoft');

INSERT INTO deals (
    id,
    game_id,
    store_id,
    discount_label,
    discount_value,
    price_old,
    price_new,
    price_value,
    status
)
VALUES
    (1, (SELECT id FROM games WHERE title = 'Elden Ring: Shadow of the Erdtree'),
        (SELECT id FROM stores WHERE name = 'Steam'), '-75%', 75, '$39.99', '$9.99', 9.99, 'Historical Low'),
    (2, (SELECT id FROM games WHERE title = 'Cyberpunk 2077: Phantom Liberty'),
        (SELECT id FROM stores WHERE name = 'Epic Games'), '-60%', 60, '$29.99', '$11.99', 11.99, 'Great Deal'),
    (3, (SELECT id FROM games WHERE title = 'Hades II — Early Access'),
        (SELECT id FROM stores WHERE name = 'Humble'), '-85%', 85, '$29.99', '$4.49', 4.49, 'Lowest Ever'),
    (4, (SELECT id FROM games WHERE title = 'Baldur''s Gate 3'),
        (SELECT id FROM stores WHERE name = 'GOG'), '-50%', 50, '$59.99', '$29.99', 29.99, 'Good Price'),
    (5, (SELECT id FROM games WHERE title = 'Starfield: Shattered Space'),
        (SELECT id FROM stores WHERE name = 'Steam'), '-40%', 40, '$69.99', '$41.99', 41.99, 'Average'),
    (6, (SELECT id FROM games WHERE title = 'Assassin''s Creed Mirage'),
        (SELECT id FROM stores WHERE name = 'Ubisoft'), '-70%', 70, '$49.99', '$14.99', 14.99, 'Great Deal'),
    (7, (SELECT id FROM games WHERE title = 'GTA V: Premium Edition'),
        (SELECT id FROM stores WHERE name = 'Epic Games'), '-100%', 100, '$29.99', 'FREE', 0, 'Free Weekend'),
    (8, (SELECT id FROM games WHERE title = 'Ghost of Tsushima: Director''s Cut'),
        (SELECT id FROM stores WHERE name = 'Steam'), '-55%', 55, '$59.99', '$26.99', 26.99, 'Good Price');

SELECT setval(pg_get_serial_sequence('deals', 'id'), (SELECT MAX(id) FROM deals));
