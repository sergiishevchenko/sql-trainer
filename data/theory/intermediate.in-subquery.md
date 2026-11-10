# IN с подзапросами

Подзапрос может вернуть **список** значений для оператора `IN`:

```sql
SELECT first_name, last_name
FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE status = 'cancelled');
```

Подзапрос должен возвращать **один столбец**.

## NOT IN

```sql
SELECT name
FROM products
WHERE id NOT IN (SELECT product_id FROM order_items);
```

## Ловушка NOT IN и NULL

Если подзапрос вернул хотя бы один NULL, `NOT IN` вернёт **пустой результат**:

```sql
SELECT id FROM departments
WHERE id NOT IN (SELECT department_id FROM employees);
-- пусто, если у кого-то department_id IS NULL
```

Почему: `x NOT IN (1, 2, NULL)` = `x <> 1 AND x <> 2 AND x <> NULL`, а `x <> NULL` — это NULL, и всё условие не может быть истинным.

Решения:

```sql
WHERE id NOT IN (SELECT department_id FROM employees WHERE department_id IS NOT NULL)

WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id)
```

## IN против JOIN

`IN` не дублирует строки внешней таблицы. `JOIN` повторит клиента столько раз, сколько у него заказов, — тогда нужен `DISTINCT`.

## Многоуровневая вложенность

```sql
SELECT name FROM products
WHERE id IN (
  SELECT product_id FROM order_items
  WHERE order_id IN (SELECT id FROM orders WHERE shipping_city = 'Paris')
);
```
