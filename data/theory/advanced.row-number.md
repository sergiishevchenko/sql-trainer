# ROW_NUMBER

`ROW_NUMBER()` нумерует строки окна 1, 2, 3… в порядке, заданном `ORDER BY` внутри `OVER`. Номера **уникальны**, даже если значения сортировки совпадают.

```sql
SELECT name, price,
       ROW_NUMBER() OVER (ORDER BY price DESC) AS rn
FROM products;
```

При равных ценах порядок между ними не определён. Добавляйте тай-брейкер: `ORDER BY price DESC, id`.

## Нумерация внутри групп

```sql
SELECT department_id, first_name, salary,
       ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC, id) AS rn
FROM employees;
```

Нумерация начинается заново в каждом отделе.

## Top-N в каждой группе

Самый частый приём — отобрать по N лучших строк в каждой группе:

```sql
WITH ranked AS (
  SELECT department_id, first_name, salary,
         ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC, id) AS rn
  FROM employees
)
SELECT * FROM ranked WHERE rn <= 2;
```

## Дедупликация

Оставить одну строку на ключ — например, последний заказ клиента:

```sql
WITH last_orders AS (
  SELECT o.*, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS rn
  FROM orders o
)
SELECT id, customer_id, order_date FROM last_orders WHERE rn = 1;
```

## Пагинация

`ROW_NUMBER` позволяет выбрать «страницу» результата: `WHERE rn BETWEEN 11 AND 20`.
