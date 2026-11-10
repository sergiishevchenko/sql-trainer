CREATE TABLE regions (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE sales_reps (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  region_id INTEGER NOT NULL REFERENCES regions(id),
  hire_date TEXT NOT NULL,
  manager_id INTEGER REFERENCES sales_reps(id)
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_cost REAL NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE sales (
  id INTEGER PRIMARY KEY,
  sale_date TEXT NOT NULL,
  rep_id INTEGER NOT NULL REFERENCES sales_reps(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  customer_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  discount REAL NOT NULL DEFAULT 0
);

CREATE TABLE monthly_targets (
  rep_id INTEGER NOT NULL REFERENCES sales_reps(id),
  month TEXT NOT NULL,
  target_amount REAL NOT NULL,
  PRIMARY KEY (rep_id, month)
);
