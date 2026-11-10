# Практические задачи Data Engineer

Инженер данных отвечает за то, чтобы данные были **полными, корректными и согласованными**. Большая часть проверок пишется на SQL.

## Проверки качества данных

```sql
SELECT 'null_email'   AS check_name, COUNT(*) AS failures FROM customers WHERE email IS NULL
UNION ALL
SELECT 'orphan_items', COUNT(*) FROM order_items oi
  WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = oi.order_id)
UNION ALL
SELECT 'negative_qty', COUNT(*) FROM order_items WHERE quantity <= 0;
```

Каждая строка — одна проверка. Ноль ошибок — проверка пройдена.

## Поиск и удаление дубликатов

```sql
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
  FROM customers WHERE email IS NOT NULL
)
DELETE FROM customers WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

Оставляем первую запись в каждой группе, остальные удаляем.

## Историзация (SCD Type 2)

Таблица истории хранит интервалы действия значения: `valid_from` и `valid_to`. Интервалы строятся из дат изменений с помощью `LEAD`:

```sql
SELECT employee_id, salary,
       changed_at AS valid_from,
       LEAD(changed_at) OVER (PARTITION BY employee_id ORDER BY changed_at) AS valid_to
FROM salary_history;
```

`valid_to IS NULL` — текущая версия.

## Сверка (reconciliation)

Сравнение двух источников, которые должны совпадать: например, баланса счёта и суммы операций.

```sql
SELECT a.id, a.balance, COALESCE(SUM(t.amount), 0) AS tx_sum
FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
GROUP BY a.id, a.balance
HAVING a.balance <> COALESCE(SUM(t.amount), 0);
```

## Идемпотентная загрузка (upsert)

```sql
INSERT INTO regions (id, name) VALUES (5, 'Asia')
ON CONFLICT(id) DO UPDATE SET name = excluded.name;
```

Повторный запуск не создаёт дубликатов. `excluded` — строка, которую пытались вставить.

## Инкрементальная загрузка

Загружайте только новые записи: `INSERT INTO target SELECT … FROM source WHERE NOT EXISTS (…)` или по максимальной дате/идентификатору, уже присутствующим в целевой таблице.

## Правила

- Любое изменение данных — в транзакции.
- Проверки качества запускаются после каждой загрузки.
- Скрипты должны быть идемпотентными: повторный запуск не ломает данные.
