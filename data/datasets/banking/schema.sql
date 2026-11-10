CREATE TABLE branches (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE clients (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  city TEXT NOT NULL,
  segment TEXT NOT NULL,
  branch_id INTEGER REFERENCES branches(id),
  joined_at TEXT NOT NULL
);

CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  account_type TEXT NOT NULL,
  currency TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  balance REAL NOT NULL
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  tx_date TEXT NOT NULL,
  amount REAL NOT NULL,
  tx_type TEXT NOT NULL,
  description TEXT,
  counterparty_account_id INTEGER REFERENCES accounts(id)
);

CREATE TABLE loans (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  amount REAL NOT NULL,
  interest_rate REAL NOT NULL,
  issued_at TEXT NOT NULL,
  term_months INTEGER NOT NULL,
  status TEXT NOT NULL
);
