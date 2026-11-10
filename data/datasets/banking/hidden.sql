INSERT INTO clients (id, full_name, birth_date, city, segment, branch_id, joined_at) VALUES
  (16, 'Lieke Smits', '1999-09-09', 'Amsterdam', 'retail', 1, '2024-02-01');

INSERT INTO accounts (id, client_id, account_type, currency, opened_at, closed_at, balance) VALUES
  (23, 16, 'checking', 'EUR', '2024-02-01', NULL, 2750.00);

INSERT INTO transactions (id, account_id, tx_date, amount, tx_type, description, counterparty_account_id) VALUES
  (51, 23, '2024-02-05 10:00', 3000.00, 'deposit', 'Salary', NULL),
  (52, 23, '2024-03-02 12:00', -250.00, 'withdrawal', 'Groceries', NULL),
  (53, 3, '2024-03-20 09:00', -410.00, 'withdrawal', 'Furniture', NULL);

INSERT INTO loans (id, client_id, amount, interest_rate, issued_at, term_months, status) VALUES
  (11, 16, 10000, 8.1, '2024-02-10', 36, 'active');

UPDATE accounts SET balance = balance + 500 WHERE id = 6;
