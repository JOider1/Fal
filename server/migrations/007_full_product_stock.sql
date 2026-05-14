-- Кожен товар має усі розміри з таблиці sizes; кількість може бути 0 (немає в наявності — тоді фільтр за цим розміром товар не покаже).

DELETE FROM product_stock;

INSERT INTO product_stock (product_id, size_id, quantity)
SELECT
  p.id,
  s.id,
  CASE
    WHEN (p.id * 3 + s.id * 5) % 13 = 0 THEN 0
    ELSE 1 + ((p.id * 7 + s.id * 11) % 18)
  END
FROM products p
CROSS JOIN sizes s;
