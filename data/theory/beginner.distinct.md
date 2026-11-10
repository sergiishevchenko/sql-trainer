# DISTINCT

`DISTINCT` убирает из результата **повторяющиеся строки**.

```sql
SELECT DISTINCT country
FROM customers;
```

## Несколько столбцов

`DISTINCT` применяется ко **всей строке результата**, а не к первому столбцу:

```sql
SELECT DISTINCT country, city
FROM customers;
```

Вернутся уникальные **пары** (страна, город).

## DISTINCT и NULL

Все `NULL` считаются одинаковыми для `DISTINCT`, поэтому в результате будет не более одной строки с `NULL`.

## COUNT(DISTINCT ...)

Чтобы посчитать количество уникальных значений, используйте `COUNT(DISTINCT столбец)`:

```sql
SELECT COUNT(DISTINCT city) FROM customers;
```

> `DISTINCT` требует сравнения строк между собой, поэтому на больших таблицах он не бесплатен. Используйте его, когда дубликаты действительно возможны.
