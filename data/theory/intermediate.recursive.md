# WITH RECURSIVE

Рекурсивная CTE ссылается **сама на себя**. Она состоит из двух частей, объединённых `UNION ALL`:

1. **Якорь** — начальные строки.
2. **Рекурсивная часть** — строит новые строки из строк предыдущего шага.

Выполнение повторяется, пока рекурсивная часть возвращает строки.

## Последовательность чисел

```sql
WITH RECURSIVE n(x) AS (
  SELECT 1
  UNION ALL
  SELECT x + 1 FROM n WHERE x < 10
)
SELECT x FROM n;
```

Условие `WHERE x < 10` останавливает рекурсию. Без него запрос стал бы бесконечным (тренажёр прервёт его по таймауту).

## Календарь дат

```sql
WITH RECURSIVE days(d) AS (
  SELECT '2024-01-01'
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2024-01-31'
)
SELECT d FROM days;
```

К такому календарю удобно присоединять факты через `LEFT JOIN`, чтобы дни без данных тоже попали в отчёт.

## Обход иерархии

Все подчинённые руководителя с `id = 1` с уровнем вложенности:

```sql
WITH RECURSIVE subordinates(id, first_name, depth) AS (
  SELECT id, first_name, 0 FROM employees WHERE id = 1
  UNION ALL
  SELECT e.id, e.first_name, s.depth + 1
  FROM employees e
  JOIN subordinates s ON e.manager_id = s.id
)
SELECT * FROM subordinates;
```

## Путь в дереве

Накапливайте путь строкой: `s.path || ' > ' || e.first_name`. Это помогает и визуализировать дерево, и защититься от циклов (`WHERE s.path NOT LIKE '%/' || e.id || '/%'`).
