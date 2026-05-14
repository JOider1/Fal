-- Користувачі (адмін / звичайний), фото товару, розширення до 8 брендів

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user'))
);

ALTER TABLE products ADD COLUMN image_url TEXT NOT NULL DEFAULT '/images/products/1.svg';

INSERT OR IGNORE INTO brands (name) VALUES ('Pull&Bear');
INSERT OR IGNORE INTO brands (name) VALUES ('Bershka');
INSERT OR IGNORE INTO brands (name) VALUES ('Stradivarius');
INSERT OR IGNORE INTO brands (name) VALUES ('LC Waikiki');

UPDATE products SET
  brand_id = ((id - 1) % 8) + 1,
  image_url = '/images/products/' || printf('%d', ((id - 1) % 8) + 1) || '.svg';
