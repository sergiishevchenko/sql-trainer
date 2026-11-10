# AND / OR / NOT

Условия в `WHERE` комбинируются логическими операторами:

- `AND` — истинно, если **оба** условия истинны;
- `OR` — истинно, если **хотя бы одно** истинно;
- `NOT` — инвертирует условие.

```sql
SELECT name, price, stock
FROM products
WHERE price < 100 AND stock > 0;
```

## Приоритет операторов

`NOT` выполняется первым, затем `AND`, и только потом `OR`. Поэтому запрос

```sql
WHERE city = 'London' OR city = 'Paris' AND is_vip = 1
```

на самом деле означает `city = 'London' OR (city = 'Paris' AND is_vip = 1)`.

Всегда ставьте **скобки**, когда смешиваете `AND` и `OR`:

```sql
WHERE (city = 'London' OR city = 'Paris') AND is_vip = 1
```

## NOT

```sql
SELECT title FROM movies WHERE NOT (rating >= 8);
```

> Логические операторы работают с трёхзначной логикой: если в условии участвует `NULL`, результат может быть «неизвестно», и строка не попадёт в выборку. Подробнее — в модуле про NULL.
