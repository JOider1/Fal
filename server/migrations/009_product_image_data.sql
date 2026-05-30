-- Зберігання зображення товару, завантаженого через адмінпанель.
-- image_data містить data-URL (наприклад "data:image/jpeg;base64,...").
-- Якщо колонка порожня — використовується файл із public/images/products
-- або зображення-заглушка за замовчуванням.
ALTER TABLE products ADD COLUMN image_data TEXT;
