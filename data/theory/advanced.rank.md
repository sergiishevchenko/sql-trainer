# RANK

`RANK()` присваивает место в рейтинге. Строки с одинаковым значением сортировки получают **одинаковое** место, а следующее место **пропускается**.

```sql
SELECT title, rating,
       RANK() OVER (ORDER BY rating DESC) AS place
FROM movies;
```

| rating | ROW_NUMBER | RANK |
|--------|------------|------|
| 9.0 | 1 | 1 |
| 8.8 | 2 | 2 |
| 8.8 | 3 | 2 |
| 8.6 | 4 | **4** |

Место 3 пропущено, потому что два фильма делят второе место — как в спорте.

## Когда использовать RANK

- Нужно честно учитывать равенство: «все фильмы на первом месте».
- «Топ-3 с учётом равных» — `WHERE place <= 3` может вернуть больше 3 строк.

## Внутри групп

```sql
SELECT genre_id, title, rating,
       RANK() OVER (PARTITION BY genre_id ORDER BY rating DESC) AS place_in_genre
FROM movies;
```

## Лучшие в группе с учётом равенства

```sql
WITH ranked AS (
  SELECT department_id, first_name, salary,
         RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS r
  FROM employees
)
SELECT * FROM ranked WHERE r = 1;
```

Если два сотрудника отдела получают одинаковую максимальную зарплату, будут выведены оба. `ROW_NUMBER` выбрал бы одного произвольно.

## PERCENT_RANK

`PERCENT_RANK()` = `(RANK - 1) / (строк в окне - 1)` — относительное положение от 0 до 1.
