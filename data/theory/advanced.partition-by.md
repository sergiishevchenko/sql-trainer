# PARTITION BY

`PARTITION BY` делит строки на независимые окна — как `GROUP BY`, но без схлопывания строк. Оконная функция вычисляется отдельно для каждой партиции.

```sql
SELECT first_name, department_id, salary,
       AVG(salary) OVER (PARTITION BY department_id) AS dept_avg,
       salary - AVG(salary) OVER (PARTITION BY department_id) AS diff
FROM employees;
```

Каждый сотрудник видит среднюю зарплату **своего** отдела.

## GROUP BY против PARTITION BY

| | GROUP BY | PARTITION BY |
|---|---|---|
| Строк в результате | по одной на группу | все исходные |
| Детали строк | теряются | сохраняются |
| Где пишется | после `WHERE` | внутри `OVER (...)` |

## Доля внутри группы

```sql
SELECT category_id, name, price,
       ROUND(100.0 * price / SUM(price) OVER (PARTITION BY category_id), 1) AS pct_of_category
FROM products
WHERE category_id IS NOT NULL;
```

## Несколько партиций в одном запросе

В одном `SELECT` можно использовать окна с разными `PARTITION BY`:

```sql
SELECT title, genre_id, director_id, rating,
       AVG(rating) OVER (PARTITION BY genre_id)    AS genre_avg,
       AVG(rating) OVER (PARTITION BY director_id) AS director_avg
FROM movies;
```

## Именованные окна

Чтобы не повторять определение, используйте `WINDOW`:

```sql
SELECT name, price,
       MIN(price) OVER w AS min_in_cat,
       MAX(price) OVER w AS max_in_cat
FROM products
WINDOW w AS (PARTITION BY category_id);
```
