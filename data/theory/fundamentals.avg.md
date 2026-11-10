# AVG

`AVG(выражение)` возвращает среднее арифметическое непустых значений.

```sql
SELECT AVG(price) AS avg_price
FROM products;
```

## AVG игнорирует NULL

Среднее считается как `SUM(x) / COUNT(x)` — по строкам, где значение **не NULL**:

```sql
SELECT AVG(box_office_musd)                     AS avg_known,
       SUM(box_office_musd) / COUNT(*)          AS avg_all_rows
FROM movies;
```

Если NULL нужно считать нулём, замените его явно: `AVG(COALESCE(x, 0))`.

## Округление

```sql
SELECT ROUND(AVG(salary), 2) AS avg_salary
FROM employees;
```

## Целочисленное деление

В SQLite деление двух целых чисел — **целочисленное**: `7 / 2 = 3`. `AVG` всегда возвращает дробное число, но при ручном вычислении среднего умножайте на `1.0`:

```sql
SELECT SUM(quantity) * 1.0 / COUNT(*) AS avg_quantity
FROM order_items;
```

## Сравнение со средним

Агрегат нельзя использовать в `WHERE` напрямую. Чтобы сравнить строки со средним, нужен подзапрос (это тема уровня Intermediate):

```sql
SELECT name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products);
```
