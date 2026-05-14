-- Схема каталогу одягу (локальна SQLite)

CREATE TABLE brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE colors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE sizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE clothing_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL CHECK (price >= 0),
  brand_id INTEGER NOT NULL REFERENCES brands(id),
  color_id INTEGER NOT NULL REFERENCES colors(id),
  size_id INTEGER NOT NULL REFERENCES sizes(id),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  clothing_type_id INTEGER NOT NULL REFERENCES clothing_types(id)
);

CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_color ON products(color_id);
CREATE INDEX idx_products_size ON products(size_id);
CREATE INDEX idx_products_season ON products(season_id);
CREATE INDEX idx_products_type ON products(clothing_type_id);
CREATE INDEX idx_products_name ON products(name);

CREATE TABLE schema_migrations (
  filename TEXT PRIMARY KEY
);
