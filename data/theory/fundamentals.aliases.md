# Алиасы (псевдонимы)

Алиас — временное имя для столбца или таблицы на время запроса.

## Алиасы столбцов

```sql
SELECT first_name || ' ' || last_name AS full_name,
       salary * 12 AS annual_salary
FROM employees;
```

- Ключевое слово `AS` можно опустить, но с ним запрос читается лучше.
- Если в имени есть пробел или оно совпадает с ключевым словом, заключите его в двойные кавычки: `AS "Annual Salary"`.

## Где можно использовать алиас столбца

Из-за порядка выполнения запроса (`FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY`):

| Часть | Алиас доступен? |
|-------|-----------------|
| `ORDER BY` | да |
| `GROUP BY`, `HAVING` | в SQLite — да (расширение) |
| `WHERE` | **нет** по стандарту |

```sql
SELECT name, price * stock AS stock_value
FROM products
ORDER BY stock_value DESC;
```

## Алиасы таблиц

Короткие имена таблиц сокращают запросы и обязательны, когда одна таблица используется дважды:

```sql
SELECT p.name, p.price
FROM products AS p
WHERE p.stock > 0;
```

После объявления алиаса обращайтесь к столбцам через него: `p.name`.

## Хорошие имена

- `snake_case`, без пробелов: `total_revenue`, а не `"Total Revenue"`.
- Имя отражает смысл: `avg_check`, а не `x1`.
