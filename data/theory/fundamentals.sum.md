# SUM

`SUM(выражение)` складывает значения по всем строкам.

```sql
SELECT SUM(quantity) AS items_sold
FROM order_items;
```

## Суммирование выражений

Внутри `SUM` можно вычислять что угодно построчно:

```sql
SELECT SUM(quantity * unit_price) AS revenue
FROM order_items;
```

Сначала для каждой строки считается `quantity * unit_price`, затем результаты складываются.

## SUM и NULL

- NULL-значения **пропускаются**.
- Если все значения NULL (или строк нет), `SUM` вернёт **NULL**, а не 0.
- `TOTAL(x)` в SQLite работает как `SUM`, но возвращает `0.0` вместо NULL.

```sql
SELECT COALESCE(SUM(amount), 0) AS total
FROM transactions
WHERE tx_type = 'fee';
```

## Условная сумма

```sql
SELECT SUM(CASE WHEN tx_type = 'deposit' THEN amount ELSE 0 END) AS deposits,
       SUM(CASE WHEN tx_type = 'withdrawal' THEN amount ELSE 0 END) AS withdrawals
FROM transactions;
```

## Округление

Деньги часто хранятся как `REAL`, поэтому сумма может выглядеть как `1234.5000000001`. Используйте `ROUND(SUM(x), 2)`.
