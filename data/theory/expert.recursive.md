# Рекурсивные запросы: графы и деревья

`WITH RECURSIVE` состоит из **якоря** (стартовые строки) и **рекурсивной части**, которая на каждом шаге присоединяет следующий уровень. Рекурсия останавливается, когда рекурсивная часть не возвращает новых строк.

## Дерево сверху вниз

Все подчинённые руководителя на любой глубине с уровнем и путём:

```sql
WITH RECURSIVE tree(id, name, depth, path) AS (
  SELECT id, first_name, 0, first_name
  FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.first_name, t.depth + 1, t.path || ' > ' || e.first_name
  FROM employees e
  JOIN tree t ON e.manager_id = t.id
)
SELECT * FROM tree ORDER BY path;
```

## Дерево снизу вверх

Цепочка руководителей сотрудника — то же самое, но соединение идёт в обратную сторону: `JOIN chain c ON e.id = c.manager_id`.

## Графы зависимостей

Пререквизиты курса — граф: у курса может быть несколько предшественников.

```sql
WITH RECURSIVE req(course_id) AS (
  SELECT prerequisite_id FROM prerequisites WHERE course_id = 15
  UNION
  SELECT p.prerequisite_id FROM prerequisites p JOIN req r ON p.course_id = r.course_id
)
SELECT * FROM req;
```

`UNION` (без `ALL`) отбрасывает уже найденные вершины — это защищает от повторов и от бесконечных циклов в графе.

## Защита от циклов и ограничение глубины

- Храните путь и проверяйте, что вершины в нём ещё нет: `WHERE t.path NOT LIKE '%/' || e.id || '/%'`.
- Ограничивайте глубину: `WHERE t.depth < 10`.

## Генерация рядов

Рекурсия умеет создавать данные «из воздуха» — например, календарь без пропусков:

```sql
WITH RECURSIVE months(m) AS (
  SELECT '2024-01-01'
  UNION ALL
  SELECT date(m, '+1 month') FROM months WHERE m < '2024-06-01'
)
SELECT strftime('%Y-%m', m) FROM months;
```

Затем к календарю присоединяют факты через `LEFT JOIN`, чтобы месяцы без продаж тоже попали в отчёт с нулём.

## Агрегаты по поддереву

Чтобы посчитать, например, фонд оплаты всей команды руководителя, сначала соберите поддерево рекурсией, затем примените `SUM` к результату.
