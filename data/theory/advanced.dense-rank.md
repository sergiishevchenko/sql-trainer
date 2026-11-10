# DENSE_RANK и NTILE

## DENSE_RANK

`DENSE_RANK()` работает как `RANK()`, но **не пропускает** места после равенства:

| rating | RANK | DENSE_RANK |
|--------|------|------------|
| 9.0 | 1 | 1 |
| 8.8 | 2 | 2 |
| 8.8 | 2 | 2 |
| 8.6 | 4 | **3** |

```sql
SELECT first_name, salary,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS salary_level
FROM employees;
```

## N-е по величине значение

Классическая задача «вторая по величине зарплата» решается через `DENSE_RANK`:

```sql
WITH r AS (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS dr
  FROM employees
)
SELECT DISTINCT salary FROM r WHERE dr = 2;
```

`ROW_NUMBER` здесь ошибётся, если максимальная зарплата встречается дважды.

## Сравнение трёх функций

| Функция | Равные значения | Пропуски |
|---------|-----------------|----------|
| `ROW_NUMBER` | разные номера | нет |
| `RANK` | одинаковое место | есть |
| `DENSE_RANK` | одинаковое место | нет |

## NTILE

`NTILE(n)` делит упорядоченные строки на `n` примерно равных групп и возвращает номер группы:

```sql
SELECT name, price,
       NTILE(4) OVER (ORDER BY price) AS quartile
FROM products;
```

Если строки не делятся ровно, первые группы получают на одну строку больше. `NTILE` удобен для сегментации: квартили, децили, ABC-группы.
