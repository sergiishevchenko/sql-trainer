# Продвинутые JOIN

## Соединение по нескольким условиям

```sql
SELECT s.id, t.target_amount
FROM sales s
JOIN monthly_targets t
  ON t.rep_id = s.rep_id
 AND t.month = strftime('%Y-%m', s.sale_date);
```

## Соединение по диапазону (non-equi join)

Условие `ON` не обязано быть равенством. Отнесём товары к ценовым диапазонам из справочника:

```sql
WITH bands(name, low, high) AS (
  VALUES ('budget', 0, 100), ('mid', 100, 500), ('premium', 500, 100000)
)
SELECT p.name, b.name AS band
FROM products p
JOIN bands b ON p.price >= b.low AND p.price < b.high;
```

## Anti-join и semi-join

| Задача | Шаблон |
|--------|--------|
| строки с парой (semi-join) | `WHERE EXISTS (...)` |
| строки без пары (anti-join) | `LEFT JOIN … WHERE right.key IS NULL` или `NOT EXISTS` |

## Соединение с агрегатом

Чтобы не размножать строки, агрегируйте **до** соединения:

```sql
SELECT c.first_name, t.orders, t.last_order
FROM customers c
JOIN (
  SELECT customer_id, COUNT(*) AS orders, MAX(order_date) AS last_order
  FROM orders GROUP BY customer_id
) t ON t.customer_id = c.id;
```

## Ловушка «размножения» (fan-out)

Если соединить заказ одновременно с позициями и с платежами, каждая позиция умножится на каждый платёж, и суммы окажутся завышены. Решение — агрегировать каждую сторону отдельно (в CTE) и соединять уже агрегаты.

## Последнее значение «на дату»

Найти для каждой продажи план, действующий в этом месяце, или для каждого сотрудника зарплату на заданную дату — частые задачи на соединение по диапазону дат с `MAX` или `ROW_NUMBER`.
