# HAVING

`HAVING` фильтрует **группы** после агрегации — так же, как `WHERE` фильтрует строки.

```sql
SELECT customer_id, COUNT(*) AS orders
FROM orders
GROUP BY customer_id
HAVING COUNT(*) >= 2;
```

## WHERE против HAVING

| | WHERE | HAVING |
|---|---|---|
| Когда | до группировки | после группировки |
| Что фильтрует | строки | группы |
| Агрегаты | нельзя | можно |

Их можно сочетать:

```sql
SELECT department_id, AVG(salary) AS avg_salary
FROM employees
WHERE hire_date >= '2018-01-01'
GROUP BY department_id
HAVING AVG(salary) > 80000;
```

Сначала отбираются сотрудники, нанятые с 2018 года, затем они группируются по отделам, и остаются только отделы со средней зарплатой выше 80 000.

## Псевдонимы в HAVING

SQLite разрешает ссылаться на псевдоним из `SELECT`:

```sql
SELECT brand, COUNT(*) AS products
FROM products
GROUP BY brand
HAVING products > 1;
```

В других СУБД (например, PostgreSQL) это не работает — там надёжнее повторить агрегат: `HAVING COUNT(*) > 1`.

## Совет по производительности

Условия на обычные столбцы (не агрегаты) пишите в `WHERE`: так в группировку попадёт меньше строк.
