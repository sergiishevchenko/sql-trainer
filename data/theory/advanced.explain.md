# EXPLAIN QUERY PLAN

`EXPLAIN QUERY PLAN` показывает, **как** SQLite собирается выполнить запрос, не выполняя его.

```sql
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 5;
```

Результат — строки со столбцами `id`, `parent`, `notused`, `detail`. Главное — текст в `detail`.

## Как читать detail

| Фраза | Что значит |
|-------|------------|
| `SCAN orders` | полный просмотр таблицы — читаются все строки |
| `SEARCH orders USING INDEX idx (customer_id=?)` | поиск по индексу — читаются только подходящие строки |
| `SEARCH … USING INTEGER PRIMARY KEY (rowid=?)` | поиск по первичному ключу |
| `USING COVERING INDEX` | все нужные данные есть в индексе, таблица не читается |
| `USE TEMP B-TREE FOR ORDER BY` | сортировка во временной структуре — индекс для `ORDER BY` не подошёл |
| `USE TEMP B-TREE FOR GROUP BY` | то же для группировки |
| `CORRELATED SCALAR SUBQUERY` | подзапрос выполняется для каждой строки |

## Пример: до и после индекса

```sql
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 5;
-- SCAN orders

CREATE INDEX idx_orders_customer ON orders (customer_id);

EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 5;
-- SEARCH orders USING INDEX idx_orders_customer (customer_id=?)
```

## Соединения

Для `JOIN` план показывает порядок обхода: внешняя таблица просматривается (`SCAN`), а для каждой её строки во внутренней таблице выполняется поиск (`SEARCH`). Если и внутренняя таблица просматривается полностью — это сигнал добавить индекс на столбец соединения.

## Правило

`SCAN` большой таблицы при выборке нескольких строк — повод задуматься об индексе. Для маленьких таблиц полный просмотр нормален и даже быстрее.
