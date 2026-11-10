# ORDER BY

Без `ORDER BY` порядок строк **не гарантирован**. Чтобы отсортировать результат, укажите столбцы сортировки:

```sql
SELECT name, price
FROM products
ORDER BY price DESC;
```

- `ASC` — по возрастанию (по умолчанию), `DESC` — по убыванию.
- Сортировать можно по нескольким столбцам: сначала по первому, при равенстве — по второму.

```sql
SELECT last_name, first_name, city
FROM customers
ORDER BY city ASC, last_name DESC;
```

## Сортировка по выражению и псевдониму

```sql
SELECT name, price * stock AS stock_value
FROM products
ORDER BY stock_value DESC;
```

`ORDER BY` выполняется после `SELECT`, поэтому в нём можно использовать псевдонимы.

## NULL при сортировке

В SQLite `NULL` считается меньше любого значения: при `ASC` такие строки идут первыми, при `DESC` — последними. Можно управлять явно: `ORDER BY email NULLS LAST`.

> Если важно стабильное упорядочивание, добавляйте уникальный столбец (например, `id`) последним ключом сортировки.
