-- Залишки по розмірах: у кожного товара кілька розмірів і кількість на складі

CREATE TABLE product_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_id INTEGER NOT NULL REFERENCES sizes(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE(product_id, size_id)
);

CREATE INDEX idx_product_stock_product ON product_stock(product_id);
CREATE INDEX idx_product_stock_size ON product_stock(size_id);

-- Для кожного товару кілька розмірів із різними залишками (демо-дані)
INSERT INTO product_stock (product_id, size_id, quantity)
SELECT p.id, 1, 1 + ((p.id * 3) % 5) FROM products p;

INSERT INTO product_stock (product_id, size_id, quantity)
SELECT p.id, 2, 2 + ((p.id * 5) % 8) FROM products p;

INSERT INTO product_stock (product_id, size_id, quantity)
SELECT p.id, 3, 3 + ((p.id * 7) % 10) FROM products p;

INSERT INTO product_stock (product_id, size_id, quantity)
SELECT p.id, 4, 2 + ((p.id * 11) % 7) FROM products p;

INSERT INTO product_stock (product_id, size_id, quantity)
SELECT p.id, 5, 1 + ((p.id * 13) % 6) FROM products p WHERE (p.id % 3) <> 0;
