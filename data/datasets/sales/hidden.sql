INSERT INTO products (id, name, category, unit_cost, unit_price) VALUES
  (9, 'Cloud Credits', 'Software', 10, 50);

INSERT INTO sales_reps (id, name, region_id, hire_date, manager_id) VALUES
  (9, 'Sophie Bell', 1, '2024-05-01', 1);

INSERT INTO sales (id, sale_date, rep_id, product_id, customer_type, quantity, discount) VALUES
  (61, '2024-06-27', 6, 1, 'new', 2, 0),
  (62, '2024-01-30', 8, 7, 'returning', 1, 0),
  (63, '2024-03-30', 4, 2, 'returning', 3, 0.1),
  (64, '2024-05-30', 9, 9, 'new', 20, 0);
