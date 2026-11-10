# Практические задачи Data Analyst

Аналитик превращает данные в ответы для бизнеса: метрики, отчёты, дашборды. SQL — основной инструмент.

## Метрики для дашборда

Одна строка — несколько KPI сразу:

```sql
SELECT COUNT(DISTINCT customer_id)                 AS buyers,
       COUNT(*)                                    AS orders,
       ROUND(SUM(total) / COUNT(*), 2)             AS aov,
       ROUND(100.0 * SUM(status = 'cancelled') / COUNT(*), 1) AS cancel_rate
FROM order_facts;
```

## Динамика по месяцам

```sql
WITH m AS (
  SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue
  FROM order_facts GROUP BY month
)
SELECT month, revenue,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / LAG(revenue) OVER (ORDER BY month), 1) AS mom_pct
FROM m;
```

MoM (month over month) — рост к предыдущему месяцу.

## Топ-N в каждой группе

```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) AS rn
  FROM product_revenue
)
SELECT * FROM ranked WHERE rn <= 3;
```

## Сводная таблица (pivot)

```sql
SELECT region,
       SUM(CASE WHEN month = '2024-01' THEN revenue ELSE 0 END) AS jan,
       SUM(CASE WHEN month = '2024-02' THEN revenue ELSE 0 END) AS feb
FROM fact GROUP BY region;
```

## Воронка

Считайте пользователей на каждом шаге и долю от предыдущего шага. В учебной базе роль воронки играют статусы заказов: оформлен → отправлен → доставлен.

## Сравнение с целым

- Доля в группе: `x / SUM(x) OVER (PARTITION BY group)`.
- Отклонение от среднего: `x - AVG(x) OVER ()`.
- Ранг внутри группы: `RANK() OVER (PARTITION BY group ORDER BY x DESC)`.

## Чек-лист аналитика

1. Совпадают ли итоги с «сырыми» данными? Сверьте общую сумму.
2. Нет ли задвоения из-за соединений?
3. Как учтены NULL и отменённые заказы?
4. Понятны ли названия столбцов человеку из бизнеса?
