# CTE — Common Table Expressions

CTE (`WITH`) — именованный подзапрос, объявленный **перед** основным запросом. Он делает сложные запросы читаемыми: каждый шаг получает имя.

```sql
WITH order_totals AS (
  SELECT order_id, SUM(quantity * unit_price) AS total
  FROM order_items
  GROUP BY order_id
)
SELECT AVG(total) AS avg_check, MAX(total) AS max_check
FROM order_totals;
```

## Несколько CTE

Перечисляются через запятую. Каждая следующая может ссылаться на предыдущие:

```sql
WITH totals AS (
  SELECT order_id, SUM(quantity * unit_price) AS total
  FROM order_items GROUP BY order_id
),
big_orders AS (
  SELECT order_id FROM totals WHERE total > 1000
)
SELECT o.id, o.order_date
FROM orders o
JOIN big_orders b ON b.order_id = o.id;
```

## CTE против подзапроса

| | Подзапрос | CTE |
|---|---|---|
| Читаемость | вложенность «изнутри наружу» | шаги сверху вниз |
| Переиспользование | нужно копировать | можно сослаться несколько раз |
| Рекурсия | нет | `WITH RECURSIVE` |

## Имена столбцов

Можно задать явно: `WITH t(order_id, total) AS (...)`.

## Область видимости

CTE существует только в рамках **одного** запроса, в котором объявлена.
