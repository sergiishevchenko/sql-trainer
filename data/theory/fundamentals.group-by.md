# GROUP BY

`GROUP BY` разбивает строки на группы с одинаковыми значениями и считает агрегаты **для каждой группы**.

```sql
SELECT status, COUNT(*) AS orders
FROM orders
GROUP BY status;
```

## Правило SELECT

В `SELECT` запроса с `GROUP BY` могут стоять только:

1. столбцы, перечисленные в `GROUP BY`;
2. агрегатные функции (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`…);
3. выражения из них.

```sql
SELECT department_id,
       COUNT(*)            AS headcount,
       ROUND(AVG(salary))  AS avg_salary
FROM employees
GROUP BY department_id;
```

## Группировка по нескольким столбцам

Группой становится уникальная **комбинация** значений:

```sql
SELECT country, city, COUNT(*) AS customers
FROM customers
GROUP BY country, city;
```

## Группировка по выражению

```sql
SELECT substr(order_date, 1, 7) AS month, COUNT(*) AS orders
FROM orders
GROUP BY month
ORDER BY month;
```

## Порядок выполнения

`FROM` → `WHERE` → `GROUP BY` → агрегаты → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`.

`WHERE` отбрасывает строки **до** группировки, поэтому в нём нельзя использовать агрегаты.

## NULL в группировке

Все строки с NULL в столбце группировки попадают в **одну** группу NULL.
