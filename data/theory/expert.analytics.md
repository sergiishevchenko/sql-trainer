# Сложные аналитические запросы

Аналитический запрос обычно отвечает на вопрос «как меняется показатель» — во времени, между группами или относительно целого. Основные приёмы:

## Сравнение периодов

Сначала агрегируем по периоду, затем сравниваем соседние периоды через `LAG`:

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders
  FROM orders
  GROUP BY month
)
SELECT month, orders,
       orders - LAG(orders) OVER (ORDER BY month) AS diff,
       ROUND(100.0 * (orders - LAG(orders) OVER (ORDER BY month))
             / LAG(orders) OVER (ORDER BY month), 1) AS growth_pct
FROM monthly;
```

## Условная агрегация (pivot)

Превращает значения в столбцы:

```sql
SELECT strftime('%Y', order_date) AS year,
       SUM(status = 'delivered') AS delivered,
       SUM(status = 'cancelled') AS cancelled
FROM orders
GROUP BY year;
```

В SQLite сравнение возвращает 1 или 0, поэтому `SUM(условие)` считает строки, где условие истинно. Переносимый вариант — `SUM(CASE WHEN … THEN 1 ELSE 0 END)`.

## Доли и вклад

```sql
SELECT category, revenue,
       ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) AS share_pct
FROM category_revenue;
```

## Когорты

Когорта — группа пользователей, объединённых общим событием (например, месяцем первой покупки). Типичный план:

1. Найти дату первого события для каждого пользователя (`MIN` по пользователю).
2. Соединить её с последующими событиями.
3. Посчитать, сколько пользователей когорты вернулось через N периодов.

```sql
WITH first AS (
  SELECT customer_id, MIN(strftime('%Y-%m', order_date)) AS cohort
  FROM orders GROUP BY customer_id
)
SELECT f.cohort, COUNT(DISTINCT o.customer_id) AS active
FROM first f
JOIN orders o ON o.customer_id = f.customer_id
GROUP BY f.cohort;
```

## Советы

- Агрегируйте **до** применения окон: окно по уже сгруппированным данным дешевле и понятнее.
- Явно обрабатывайте деление на ноль: `NULLIF(знаменатель, 0)`.
- Задавайте однозначный порядок (`ORDER BY month, id`), чтобы результаты были воспроизводимыми.
