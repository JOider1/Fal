-- Доводимо кількість брендів до 12 і перераховуємо прив’язку товарів

INSERT OR IGNORE INTO brands (name) VALUES ('Massimo Dutti');
INSERT OR IGNORE INTO brands (name) VALUES ('Oysho');
INSERT OR IGNORE INTO brands (name) VALUES ('COS');
INSERT OR IGNORE INTO brands (name) VALUES ('Benetton');

UPDATE products SET brand_id = ((id - 1) % 12) + 1;
