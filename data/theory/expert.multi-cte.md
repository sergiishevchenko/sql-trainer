# Многоуровневые CTE

Сложную задачу удобно решать как **конвейер**: каждая CTE — один понятный шаг, следующая опирается на предыдущие.

```sql
WITH
  order_totals AS (          -- шаг 1: сумма каждого заказа
    SELECT order_id, SUM(quantity * unit_price) AS total
    FROM order_items GROUP BY order_id
  ),
  customer_stats AS (        -- шаг 2: показатели клиента
    SELECT o.customer_id, COUNT(*) AS orders, SUM(t.total) AS revenue
    FROM orders o JOIN order_totals t ON t.order_id = o.id
    GROUP BY o.customer_id
  ),
  segments AS (              -- шаг 3: сегментация
    SELECT *, CASE WHEN revenue >= 2000 THEN 'gold' ELSE 'regular' END AS segment
    FROM customer_stats
  )
SELECT segment, COUNT(*), ROUND(AVG(revenue), 2)
FROM segments
GROUP BY segment;
```

## Принципы

- **Один шаг — одна ответственность.** Фильтрация, агрегация, ранжирование и форматирование — в разных CTE.
- **Говорящие имена.** `order_totals` читается лучше, чем `t1`.
- **Переиспользование.** К одной CTE можно обращаться несколько раз: и как к источнику строк, и в подзапросе (`(SELECT SUM(x) FROM step)`).
- **Отладка по шагам.** Замените финальный `SELECT` на `SELECT * FROM step2`, чтобы проверить промежуточный результат.

## Список столбцов CTE

Имена столбцов можно задать сразу после имени CTE:

```sql
WITH totals(order_id, total) AS (
  SELECT order_id, SUM(quantity * unit_price) FROM order_items GROUP BY order_id
)
SELECT * FROM totals WHERE total > 1000;
```

## Несколько веток от одного источника

```sql
WITH base AS (...),
     stats AS (SELECT ... FROM base GROUP BY ...),
     best  AS (SELECT ..., ROW_NUMBER() OVER (...) AS rn FROM base)
SELECT ... FROM stats JOIN best ON ... AND best.rn = 1;
```

Так собирают отчёты, где в одной строке нужны агрегаты и «лучший элемент» группы.

## Подводные камни

- CTE без псевдонима у вычисляемого столбца нельзя использовать по имени.
- Большие цепочки — повод проверить, не повторяется ли один и тот же расчёт: вынесите его в отдельную CTE.
