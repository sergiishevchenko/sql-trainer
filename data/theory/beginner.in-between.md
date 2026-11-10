# IN и BETWEEN

## IN

`IN` проверяет, входит ли значение в список. Это короткая запись нескольких `OR`:

```sql
SELECT first_name, country
FROM customers
WHERE country IN ('UK', 'France', 'Spain');
```

`NOT IN` — значение не входит в список.

## BETWEEN

`BETWEEN a AND b` — значение в диапазоне **включая границы**:

```sql
SELECT name, price
FROM products
WHERE price BETWEEN 100 AND 500;
```

эквивалентно `price >= 100 AND price <= 500`.

С датами-строками `BETWEEN` тоже работает:

```sql
WHERE order_date BETWEEN '2023-01-01' AND '2023-03-31'
```

> Осторожно с `NOT IN` и `NULL`: если в списке есть `NULL`, условие `x NOT IN (1, NULL)` никогда не будет истинным. С подзапросами это частая ловушка.
