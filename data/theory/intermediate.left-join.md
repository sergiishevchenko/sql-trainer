# LEFT JOIN

`LEFT JOIN` возвращает **все** строки левой таблицы. Если пары справа нет, столбцы правой таблицы заполняются NULL.

```sql
SELECT c.first_name, o.id AS order_id
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id;
```

Клиенты без заказов тоже попадут в результат — с `order_id = NULL`.

## Поиск строк без пары (anti-join)

```sql
SELECT c.id, c.first_name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

Это классический способ найти «клиентов без заказов», «товары без продаж» и т.п.

## Подсчёт с нулями

`COUNT(*)` посчитает строку с NULL как 1. Считайте по столбцу правой таблицы:

```sql
SELECT c.id, COUNT(o.id) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id;
```

## ON против WHERE

Условие на правую таблицу в `WHERE` **превращает** `LEFT JOIN` в `INNER JOIN` — строки с NULL отбрасываются:

```sql
-- Клиенты без доставленных заказов исчезнут:
... LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'delivered';

-- Все клиенты сохранятся, к ним присоединятся только доставленные заказы:
... LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'delivered';
```
