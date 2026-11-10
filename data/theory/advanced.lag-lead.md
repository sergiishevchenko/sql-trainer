# LAG и LEAD

`LAG` и `LEAD` дают доступ к значениям **предыдущей** и **следующей** строки окна без self join.

```sql
SELECT order_date, id,
       LAG(order_date)  OVER (ORDER BY order_date, id) AS prev_date,
       LEAD(order_date) OVER (ORDER BY order_date, id) AS next_date
FROM orders;
```

## Синтаксис

```sql
LAG(выражение, смещение = 1, значение_по_умолчанию = NULL) OVER (...)
```

- Для первой строки `LAG` вернёт NULL (или значение по умолчанию).
- `LAG(x, 2)` — значение двумя строками раньше.

## Изменение между периодами

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', sale_date) AS month, SUM(quantity) AS units
  FROM sales GROUP BY month
)
SELECT month, units,
       units - LAG(units) OVER (ORDER BY month) AS change,
       ROUND(100.0 * (units - LAG(units) OVER (ORDER BY month))
             / LAG(units) OVER (ORDER BY month), 1) AS change_pct
FROM monthly;
```

## Интервалы между событиями

```sql
SELECT customer_id, order_date,
       julianday(order_date)
         - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS days_since_prev
FROM orders;
```

С `PARTITION BY` предыдущая строка ищется только внутри группы — у первого заказа каждого клиента результат будет NULL.

## FIRST_VALUE и LAST_VALUE

`FIRST_VALUE(x) OVER (PARTITION BY … ORDER BY …)` — значение из первой строки окна. Для `LAST_VALUE` нужна рамка `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, иначе «последней» будет текущая строка.
