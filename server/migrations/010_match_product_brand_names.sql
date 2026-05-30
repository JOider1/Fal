-- Назви товарів містили бренд-суфікс із міграції 002 (H&M/Zara/Reserved/Mango),
-- але міграції 003/004 перепризначили brand_id по колу між 12 брендами.
-- Через це назва не відповідала фактичному бренду. Прибираємо старий суфікс і
-- додаємо назву фактичного бренду товару.
UPDATE products SET name =
  rtrim(
    replace(replace(replace(replace(name, ' H&M', ''), ' Zara', ''), ' Reserved', ''), ' Mango', '')
  ) || ' ' || (SELECT b.name FROM brands b WHERE b.id = products.brand_id);
