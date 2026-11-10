# Изменение данных и транзакции

## INSERT

```sql
INSERT INTO customers (first_name, last_name, email, city, country, birth_date, registered_at, is_vip)
VALUES ('Ivan', 'Petrov', 'ivan@example.com', 'Kazan', 'Russia', '1990-01-01', '2024-04-01', 0);
```

Вставка результата запроса:

```sql
INSERT INTO archive_orders (id, order_date)
SELECT id, order_date FROM orders WHERE order_date < '2023-06-01';
```

## UPDATE

```sql
UPDATE products SET price = price * 1.1 WHERE brand = 'Apple';
```

**Всегда** проверяйте `WHERE`: без него обновятся все строки. Хорошая привычка — сначала выполнить `SELECT` с тем же условием.

## DELETE

```sql
DELETE FROM reviews WHERE rating < 2;
```

## Транзакции

Транзакция объединяет несколько изменений в **атомарную** единицу: либо выполняются все, либо ни одно.

```sql
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;
```

`ROLLBACK` отменяет все изменения с начала транзакции.

## ACID

| Свойство | Смысл |
|----------|-------|
| Atomicity | всё или ничего |
| Consistency | ограничения базы соблюдаются |
| Isolation | параллельные транзакции не видят промежуточных состояний друг друга |
| Durability | после `COMMIT` данные не потеряются |

## Ограничения целостности

Внешние ключи не дадут удалить клиента, у которого есть заказы, — `DELETE` завершится ошибкой `FOREIGN KEY constraint failed`. Сначала удаляют зависимые строки или используют `ON DELETE CASCADE` в схеме.

> В заданиях этого модуля ваши изменения применяются к **изолированной копии** базы, а результат проверяется контрольным запросом.
