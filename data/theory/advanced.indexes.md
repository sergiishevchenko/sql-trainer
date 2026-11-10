# Индексы

Индекс — отдельная упорядоченная структура (B-дерево), которая позволяет находить строки без полного просмотра таблицы. Аналогия — алфавитный указатель в конце книги.

```sql
CREATE INDEX idx_orders_customer ON orders (customer_id);
```

## Когда индекс помогает

- Фильтрация: `WHERE customer_id = 5`.
- Соединения: `JOIN orders o ON o.customer_id = c.id`.
- Сортировка: `ORDER BY order_date` (если индекс по `order_date`).
- `MIN`/`MAX` по индексированному столбцу.

## Составные индексы

```sql
CREATE INDEX idx_orders_status_date ON orders (status, order_date);
```

Работает **слева направо**: индекс поможет для `WHERE status = ?` и для `WHERE status = ? AND order_date > ?`, но **не** для условия только по `order_date`.

## Покрывающий индекс

Если индекс содержит все столбцы, нужные запросу, СУБД вообще не читает таблицу:

```sql
CREATE INDEX idx_items_order ON order_items (order_id, quantity, unit_price);
SELECT order_id, SUM(quantity * unit_price) FROM order_items GROUP BY order_id;
```

## Уникальный индекс

```sql
CREATE UNIQUE INDEX idx_customers_email ON customers (email);
```

Запрещает дубликаты (NULL при этом допускается многократно).

## Цена индексов

- Занимают место на диске.
- Замедляют `INSERT`, `UPDATE`, `DELETE` — индекс тоже нужно обновлять.
- Бесполезны для столбцов с малым числом различных значений и для маленьких таблиц.

## Список индексов

```sql
SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'index';
```

> В тренажёре можно создавать индексы, а удалять объекты (`DROP`) запрещено. Если что-то пошло не так, сбросьте базу задания.
