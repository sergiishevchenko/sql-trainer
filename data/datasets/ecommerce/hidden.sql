INSERT INTO customers (id, first_name, last_name, email, city, country, birth_date, registered_at, is_vip) VALUES
  (21, 'Zoe', 'Adams', 'zoe.adams@gmail.com', 'London', 'UK', '1992-05-05', '2024-03-01', 1),
  (22, 'Igor', 'Volkov', NULL, 'Moscow', 'Russia', '1980-01-01', '2024-03-02', 0);

INSERT INTO products (id, name, category_id, brand, price, stock, created_at) VALUES
  (27, 'Smart Watch', 10, 'Garmin', 349.00, 9, '2024-03-01'),
  (28, 'Cookbook Basics', 7, 'Penguin', 29.00, 15, '2024-03-02');

INSERT INTO orders (id, customer_id, order_date, status, shipping_city, shipping_cost) VALUES
  (31, 21, '2024-03-29', 'processing', 'London', 7.50),
  (32, 22, '2023-06-30', 'delivered', 'Moscow', 5.00);

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
  (48, 31, 27, 1, 349.00),
  (49, 31, 15, 2, 39.00),
  (50, 32, 1, 1, 999.00);

INSERT INTO reviews (id, product_id, customer_id, rating, comment, created_at) VALUES
  (23, 27, 21, 5, 'Accurate GPS', '2024-03-30');

UPDATE products SET stock = stock + 3 WHERE id IN (2, 9);
