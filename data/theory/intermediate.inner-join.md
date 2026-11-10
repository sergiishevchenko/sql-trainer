# INNER JOIN

Данные в реляционной базе разнесены по таблицам: заказы хранят `customer_id`, а имя клиента — в `customers`. `JOIN` соединяет строки разных таблиц по условию.

```sql
SELECT o.id, o.order_date, c.first_name, c.last_name
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id;
```

## Как это работает

Для каждой пары строк (`o`, `c`) проверяется условие `ON`. В результат попадают только пары, для которых условие истинно. Строки без пары **отбрасываются** с обеих сторон.

- Слово `INNER` можно опустить: `JOIN` = `INNER JOIN`.
- Если у строки несколько пар, она повторится несколько раз (один клиент — много заказов).

## Несколько таблиц

```sql
SELECT o.id, p.name, oi.quantity
FROM order_items AS oi
JOIN orders   AS o ON o.id = oi.order_id
JOIN products AS p ON p.id = oi.product_id;
```

## JOIN + агрегация

```sql
SELECT c.country, COUNT(*) AS orders
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.country;
```

## Неоднозначные имена

Если столбец с одинаковым именем есть в обеих таблицах (`id`, `name`), обязательно указывайте таблицу: `p.name`, `c.name`. Иначе — ошибка `ambiguous column name`.

## USING

Если столбцы называются одинаково в обеих таблицах, можно писать `JOIN t2 USING (col)`.
