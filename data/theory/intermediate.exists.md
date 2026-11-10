# EXISTS

`EXISTS (подзапрос)` истинно, если подзапрос вернул **хотя бы одну строку**. Сами значения не важны, поэтому внутри принято писать `SELECT 1`.

```sql
SELECT c.id, c.first_name
FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
```

Клиенты, у которых есть хотя бы один заказ.

## NOT EXISTS

```sql
SELECT p.name
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
);
```

Товары, которые ни разу не покупали.

## Почему EXISTS удобен

- Подзапрос **коррелированный**: условие связывает его с внешней строкой.
- СУБД может остановиться на первой найденной строке.
- `NOT EXISTS` корректно работает с NULL, в отличие от `NOT IN` (см. следующий модуль).
- Внешняя строка не дублируется, даже если пар много (в отличие от `JOIN`).

## Сложные условия

Внутри `EXISTS` можно использовать любые условия:

```sql
SELECT c.first_name
FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.id AND o.status = 'cancelled'
);
```

## «Для всех» через двойное отрицание

«Клиенты, у которых **все** заказы доставлены» = «нет ни одного недоставленного заказа»:

```sql
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status <> 'delivered')
```
