# NULL

`NULL` означает **отсутствие значения** («неизвестно»). Это не ноль и не пустая строка.

## Проверка на NULL

Сравнение с `NULL` через `=` всегда даёт «неизвестно», поэтому `WHERE email = NULL` не вернёт ни одной строки. Правильно:

```sql
SELECT first_name FROM customers WHERE email IS NULL;
SELECT first_name FROM customers WHERE email IS NOT NULL;
```

## Трёхзначная логика

Любая арифметика и сравнение с `NULL` дают `NULL`: `5 + NULL = NULL`, `NULL > 3 → NULL`. В `WHERE` строка попадает в результат только при результате **TRUE**.

## Замена NULL

- `COALESCE(a, b, c)` — первое не-NULL значение из списка.
- `IFNULL(a, b)` — то же для двух аргументов (SQLite).
- `NULLIF(a, b)` — возвращает `NULL`, если `a = b`.

```sql
SELECT first_name, COALESCE(email, 'нет email') AS contact
FROM customers;
```

> Агрегатные функции (`SUM`, `AVG`, `COUNT(столбец)`) **игнорируют** `NULL`. Это важно учитывать при расчётах.
