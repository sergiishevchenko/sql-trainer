# Продвинутые CTE

CTE — главный инструмент для сложной логики: каждый шаг получает имя, и запрос читается как конвейер.

## Конвейер преобразований

```sql
WITH
order_totals AS (           -- 1. сумма каждого заказа
  SELECT order_id, SUM(quantity * unit_price) AS total
  FROM order_items GROUP BY order_id
),
customer_stats AS (         -- 2. статистика по клиенту
  SELECT o.customer_id, COUNT(*) AS orders, SUM(t.total) AS revenue
  FROM orders o JOIN order_totals t ON t.order_id = o.id
  GROUP BY o.customer_id
),
segmented AS (              -- 3. сегментация
  SELECT *, CASE WHEN revenue >= 2000 THEN 'gold' ELSE 'regular' END AS segment
  FROM customer_stats
)
SELECT segment, COUNT(*), ROUND(AVG(revenue), 2)
FROM segmented GROUP BY segment;
```

## Переиспользование

Одну CTE можно использовать несколько раз — например, для сравнения с итогом:

```sql
WITH dept AS (
  SELECT department_id, SUM(salary) AS payroll FROM employees GROUP BY department_id
)
SELECT department_id, payroll,
       ROUND(100.0 * payroll / (SELECT SUM(payroll) FROM dept), 1) AS pct
FROM dept;
```

## CTE + оконные функции

Фильтровать по оконной функции можно только уровнем выше — CTE для этого идеальна:

```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY genre_id ORDER BY rating DESC, id) AS rn
  FROM movies
)
SELECT title, genre_id, rating FROM ranked WHERE rn = 1;
```

## Советы

- Называйте CTE по смыслу: `active_clients`, а не `t1`.
- Один шаг — одно преобразование.
- Проверяйте каждый шаг отдельно: `SELECT * FROM step LIMIT 10`.
