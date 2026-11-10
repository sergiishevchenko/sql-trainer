# COUNT

`COUNT` — агрегатная функция: она сворачивает много строк в **одно** число.

```sql
SELECT COUNT(*) FROM orders;
```

## Три формы COUNT

| Запись | Что считает |
|--------|-------------|
| `COUNT(*)` | все строки, включая строки с NULL |
| `COUNT(столбец)` | строки, где значение столбца **не NULL** |
| `COUNT(DISTINCT столбец)` | количество **разных** непустых значений |

```sql
SELECT COUNT(*)              AS customers,
       COUNT(email)          AS with_email,
       COUNT(DISTINCT country) AS countries
FROM customers;
```

## COUNT и WHERE

`WHERE` фильтрует строки **до** подсчёта:

```sql
SELECT COUNT(*) AS delivered
FROM orders
WHERE status = 'delivered';
```

## Подсчёт по условию

Чтобы посчитать строки, удовлетворяющие условию, без `WHERE`, используйте `SUM` с логическим выражением или `COUNT` с `CASE`:

```sql
SELECT COUNT(*)                                   AS total,
       SUM(status = 'cancelled')                  AS cancelled,
       COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped
FROM orders;
```

> В SQLite сравнение возвращает `1` или `0`, поэтому `SUM(условие)` считает строки, где условие истинно.

## Частые ошибки

- `COUNT(столбец)` не учитывает NULL — результат может отличаться от `COUNT(*)`.
- Агрегат без `GROUP BY` всегда возвращает **ровно одну строку**, даже если таблица пуста (тогда `COUNT(*)` = 0).
