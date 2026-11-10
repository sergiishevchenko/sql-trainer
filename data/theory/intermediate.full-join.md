# FULL OUTER JOIN

`FULL OUTER JOIN` сохраняет **все** строки обеих таблиц. Где пары нет, недостающая сторона заполняется NULL.

```sql
SELECT p.name AS product, c.name AS category
FROM products AS p
FULL OUTER JOIN categories AS c ON c.id = p.category_id;
```

В результате будут:

- товары с категорией (обе стороны заполнены);
- товары без категории (`category = NULL`);
- категории без товаров (`product = NULL`).

## Когда это нужно

- **Сверка данных**: сравнить два списка и найти расхождения с обеих сторон.
- Объединение двух источников, где у каждого есть записи, которых нет у другого.

```sql
SELECT COALESCE(a.id, b.id) AS id,
       CASE WHEN a.id IS NULL THEN 'only in B'
            WHEN b.id IS NULL THEN 'only in A'
            ELSE 'both' END AS presence
FROM table_a a
FULL OUTER JOIN table_b b ON b.id = a.id;
```

## Эмуляция через UNION

В СУБД без `FULL JOIN` его заменяют объединением двух `LEFT JOIN`:

```sql
SELECT p.name, c.name FROM products p LEFT JOIN categories c ON c.id = p.category_id
UNION
SELECT p.name, c.name FROM categories c LEFT JOIN products p ON p.category_id = c.id;
```

## COALESCE для ключей

Ключ может прийти с любой стороны — используйте `COALESCE(a.key, b.key)`.
