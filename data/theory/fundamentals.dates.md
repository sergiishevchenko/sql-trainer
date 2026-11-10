# Работа с датами в SQLite

В SQLite нет отдельного типа «дата». Даты хранятся как **текст** в формате ISO-8601: `'2024-03-15'` или `'2024-03-15 14:30'`. Такие строки корректно сравниваются и сортируются.

## Основные функции

| Функция | Пример | Результат |
|---------|--------|-----------|
| `date(x, модификаторы…)` | `date('2024-01-31', '+1 month')` | `'2024-03-02'` |
| `strftime(формат, x)` | `strftime('%Y', '2024-03-15')` | `'2024'` |
| `julianday(x)` | `julianday('2024-03-15') - julianday('2024-03-01')` | `14.0` |
| `date('now')` | — | текущая дата |

## Части даты

```sql
SELECT order_date,
       strftime('%Y', order_date)  AS year,
       strftime('%m', order_date)  AS month,
       strftime('%Y-%m', order_date) AS year_month,
       strftime('%w', order_date)  AS weekday
FROM orders;
```

`strftime` возвращает **текст**. Для сравнения с числом приведите тип: `CAST(strftime('%Y', d) AS INTEGER)`.

Альтернатива для дат в ISO-формате — `substr(order_date, 1, 7)` (год и месяц).

## Арифметика дат

```sql
SELECT date('2024-03-15', '+7 days');
SELECT date('2024-03-15', '-1 month');
SELECT date('2024-03-15', 'start of month');
```

## Разница между датами

```sql
SELECT id,
       CAST(julianday('2024-12-31') - julianday(order_date) AS INTEGER) AS days_ago
FROM orders;
```

## Возраст

```sql
SELECT full_name,
       CAST((julianday('2024-01-01') - julianday(birth_date)) / 365.25 AS INTEGER) AS age
FROM students;
```

> В заданиях используется фиксированная дата вместо `date('now')`, чтобы результат не зависел от дня решения.
