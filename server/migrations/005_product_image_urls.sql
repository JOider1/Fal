-- Шлях до фото: API підставить файл 1.jpg / 1.png тощо з папки public/images/products/

UPDATE products SET image_url = '/api/product-images/' || id;
