# MIN и MAX

`MIN(x)` и `MAX(x)` возвращают наименьшее и наибольшее значение. NULL игнорируются.

```sql
SELECT MIN(price) AS cheapest,
       MAX(price) AS most_expensive
FROM products;
```

## Не только числа

- **Строки** сравниваются лексикографически: `MIN(name)` — первое по алфавиту.
- **Даты** в формате `YYYY-MM-DD` сравниваются как строки, поэтому `MIN(order_date)` — самая ранняя дата.

```sql
SELECT MIN(order_date) AS first_order,
       MAX(order_date) AS last_order
FROM orders;
```

## Диапазон значений

```sql
SELECT MAX(salary) - MIN(salary) AS salary_spread
FROM employees;
```

## Ловушка: остальные столбцы

В стандартном SQL нельзя написать `SELECT name, MAX(price) FROM products` — непонятно, из какой строки брать `name`. SQLite такой запрос выполнит и вернёт `name` из строки с максимумом, но это особенность SQLite. Переносимые способы:

```sql
SELECT name, price FROM products ORDER BY price DESC LIMIT 1;

SELECT name, price FROM products
WHERE price = (SELECT MAX(price) FROM products);
```

Второй вариант вернёт **все** товары с максимальной ценой, если их несколько.

## Скалярные MIN/MAX

С двумя и более аргументами `MIN(a, b)` и `MAX(a, b)` в SQLite работают построчно, как функции `least`/`greatest`:

```sql
SELECT name, MAX(stock, 10) AS at_least_ten FROM products;
```
