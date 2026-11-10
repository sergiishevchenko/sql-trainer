# CASE WHEN

`CASE` — условное выражение: «если… то… иначе…». Его можно использовать везде, где допустимо значение: в `SELECT`, `WHERE`, `ORDER BY`, внутри агрегатов.

```sql
SELECT name, price,
       CASE
         WHEN price >= 1000 THEN 'premium'
         WHEN price >= 100  THEN 'standard'
         ELSE 'budget'
       END AS segment
FROM products;
```

Условия проверяются **сверху вниз**, срабатывает первое истинное. Если ни одно не подошло и нет `ELSE`, результат — NULL.

## Простая форма

Если сравнивается одно выражение с разными значениями:

```sql
SELECT id,
       CASE status
         WHEN 'delivered' THEN 'Доставлен'
         WHEN 'cancelled' THEN 'Отменён'
         ELSE 'В работе'
       END AS status_ru
FROM orders;
```

## CASE внутри агрегатов

Самый полезный приём — условная агрегация («сводная таблица»):

```sql
SELECT customer_type,
       SUM(CASE WHEN discount > 0 THEN 1 ELSE 0 END) AS discounted,
       SUM(CASE WHEN discount = 0 THEN 1 ELSE 0 END) AS full_price
FROM sales
GROUP BY customer_type;
```

## Сортировка по CASE

```sql
SELECT id, status FROM orders
ORDER BY CASE status WHEN 'processing' THEN 1 WHEN 'shipped' THEN 2 ELSE 3 END, id;
```

## IIF

SQLite поддерживает короткую запись `IIF(условие, если_да, если_нет)` — это сокращение для `CASE WHEN … THEN … ELSE … END`.
