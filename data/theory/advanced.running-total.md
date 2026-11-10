# Нарастающие итоги и рамки окна

Если в `OVER` указан `ORDER BY`, агрегат считается не по всему окну, а **от начала до текущей строки** — получается нарастающий итог.

```sql
SELECT tx_date, amount,
       SUM(amount) OVER (ORDER BY tx_date, id) AS running_balance
FROM transactions
WHERE account_id = 1;
```

## Рамка окна (frame)

Рамка задаёт, какие строки относительно текущей входят в расчёт:

```sql
ROWS BETWEEN <начало> AND <конец>
```

| Граница | Значение |
|---------|----------|
| `UNBOUNDED PRECEDING` | первая строка партиции |
| `N PRECEDING` | N строк назад |
| `CURRENT ROW` | текущая строка |
| `N FOLLOWING` | N строк вперёд |
| `UNBOUNDED FOLLOWING` | последняя строка партиции |

## Скользящее среднее

Среднее за текущий и два предыдущих месяца:

```sql
SELECT month, units,
       AVG(units) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS ma3
FROM monthly_units;
```

## ROWS против RANGE

По умолчанию при наличии `ORDER BY` используется `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. `RANGE` включает **все строки с тем же значением сортировки** — у строк с одинаковой датой будет один и тот же итог. `ROWS` считает строго по физическим строкам.

Чтобы избежать сюрпризов, сортируйте по уникальному набору столбцов (`ORDER BY tx_date, id`) или явно пишите `ROWS`.

## Итог по группе

```sql
SUM(amount) OVER (PARTITION BY account_id ORDER BY tx_date, id)
```

Нарастающий итог начинается заново для каждого счёта.
