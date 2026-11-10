# SELECT

`SELECT` defines **which columns** end up in the result and in which order.

```sql
SELECT name, price
FROM products;
```

## Computed expressions

Besides column names, `SELECT` accepts expressions: arithmetic, functions and constants.

```sql
SELECT name, price, price * 0.9 AS sale_price
FROM products;
```

- `AS` sets the name of a result column (an alias).
- Arithmetic: `+`, `-`, `*`, `/`, `%`. In SQLite dividing two integers is integer division: `7 / 2 = 3`, while `7 / 2.0 = 3.5`.
- Strings are concatenated with the `||` operator: `first_name || ' ' || last_name`.
- `ROUND(x, n)` rounds to `n` decimal places.

## SELECT without a table

SQLite can evaluate expressions without `FROM`:

```sql
SELECT 2 + 2 AS answer, UPPER('sql') AS word;
```

> Tip: avoid `SELECT *` in real reports. An explicit column list makes a query clearer and more resilient to schema changes.
