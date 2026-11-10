# Подзапросы

Подзапрос — `SELECT` внутри другого запроса. Он пишется в скобках.

## Скалярный подзапрос

Возвращает **одно значение** и может стоять везде, где допустимо значение:

```sql
SELECT name, price,
       price - (SELECT AVG(price) FROM products) AS diff_from_avg
FROM products;
```

## Подзапрос в WHERE

```sql
SELECT name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products);
```

## Табличный подзапрос (в FROM)

Результат подзапроса используется как временная таблица. Ему нужен алиас:

```sql
SELECT AVG(order_total) AS avg_check
FROM (
  SELECT order_id, SUM(quantity * unit_price) AS order_total
  FROM order_items
  GROUP BY order_id
) AS t;
```

Это способ посчитать «агрегат от агрегата».

## Коррелированный подзапрос

Ссылается на столбцы внешнего запроса и выполняется **для каждой строки** внешнего запроса:

```sql
SELECT e.first_name, e.salary, e.department_id
FROM employees e
WHERE e.salary > (
  SELECT AVG(x.salary) FROM employees x WHERE x.department_id = e.department_id
);
```

Сотрудники, получающие больше среднего **по своему отделу**.

## Ошибки

- Скалярный подзапрос, вернувший несколько строк: SQLite молча возьмёт первую, другие СУБД выдадут ошибку.
- Если подзапрос не вернул строк, его значение — NULL.
