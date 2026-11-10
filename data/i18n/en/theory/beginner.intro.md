# What is SQL

**SQL** (Structured Query Language) is the language used to talk to relational databases. Their data is stored in **tables**: every **row** is one record (a customer, an order, a movie) and every **column** is one property of that record (a name, a price, a date).

SQL is a **declarative** language: you describe *what* you want to get, and the database engine decides *how* to do it.

```sql
SELECT first_name, city
FROM customers;
```

This query reads almost like an English sentence: "select the first name and city from the customers table".

## Parts of a query

| Part | Purpose |
|------|---------|
| `SELECT` | which columns to return |
| `FROM` | which table to read from |
| `WHERE` | which rows to keep |
| `ORDER BY` | how to sort the result |

- Keywords are case-insensitive: `select` and `SELECT` are the same. By convention they are written in upper case.
- A query ends with a semicolon `;`.
- `*` means "all columns": `SELECT * FROM products;`

This trainer uses **SQLite**, a compact and extremely widespread database engine. Every query runs against a real database.
