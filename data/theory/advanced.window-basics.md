# Оконные функции

Обычный агрегат с `GROUP BY` **схлопывает** строки группы в одну. Оконная функция считает агрегат по «окну» связанных строк, но **сохраняет каждую строку**.

```sql
SELECT first_name, department_id, salary,
       AVG(salary) OVER () AS company_avg
FROM employees;
```

`OVER ()` — окно из всех строк результата. У каждого сотрудника рядом с зарплатой появится средняя по компании.

## Синтаксис

```sql
функция(...) OVER (
  [PARTITION BY ...]   -- на какие группы делить строки
  [ORDER BY ...]       -- порядок внутри окна
  [ROWS / RANGE ...]   -- рамка окна
)
```

## Сравнение со средним без подзапроса

```sql
SELECT name, price,
       price - AVG(price) OVER () AS diff_from_avg,
       ROUND(100.0 * price / SUM(price) OVER (), 2) AS share_pct
FROM products;
```

## Где можно использовать

Оконные функции вычисляются **после** `WHERE`, `GROUP BY` и `HAVING`, поэтому:

- их можно писать в `SELECT` и `ORDER BY`;
- **нельзя** — в `WHERE`, `GROUP BY`, `HAVING`. Чтобы отфильтровать по оконной функции, оберните запрос в подзапрос или CTE.

```sql
SELECT * FROM (
  SELECT name, price, AVG(price) OVER () AS avg_price FROM products
) WHERE price > avg_price;
```

## Окно после GROUP BY

Окно работает с уже сгруппированными строками — можно взять агрегат от агрегата:

```sql
SELECT status, COUNT(*) AS n,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM orders
GROUP BY status;
```
