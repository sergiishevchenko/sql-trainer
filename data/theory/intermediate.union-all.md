# UNION ALL, INTERSECT, EXCEPT

## UNION ALL

`UNION ALL` склеивает результаты **без удаления дубликатов**. Он быстрее `UNION` и сохраняет количество строк, что важно для подсчётов:

```sql
SELECT 'deposit' AS kind, amount FROM transactions WHERE tx_type = 'deposit'
UNION ALL
SELECT 'withdrawal', amount FROM transactions WHERE tx_type = 'withdrawal';
```

Если бы две операции совпали по сумме, `UNION` склеил бы их в одну строку и итог был бы неверным.

## INTERSECT

Строки, которые есть в **обоих** результатах (без дубликатов):

```sql
SELECT customer_id FROM orders WHERE status = 'delivered'
INTERSECT
SELECT customer_id FROM reviews;
```

Клиенты, у которых есть доставленный заказ **и** отзыв.

## EXCEPT

Строки первого результата, которых **нет** во втором:

```sql
SELECT id FROM customers
EXCEPT
SELECT customer_id FROM orders;
```

Клиенты без заказов. (В Oracle этот оператор называется `MINUS`.)

## Приоритет и скобки

Операции выполняются слева направо. В SQLite нельзя ставить скобки вокруг отдельных `SELECT` — для сложных комбинаций используйте подзапросы или CTE.

## Агрегация по объединению

```sql
SELECT kind, SUM(amount)
FROM (
  SELECT 'in' AS kind, amount FROM transactions WHERE amount > 0
  UNION ALL
  SELECT 'out', amount FROM transactions WHERE amount < 0
)
GROUP BY kind;
```
