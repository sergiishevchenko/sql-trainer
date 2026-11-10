# RIGHT JOIN

`RIGHT JOIN` — зеркальное отражение `LEFT JOIN`: сохраняются **все** строки правой таблицы, а недостающие значения левой заполняются NULL.

```sql
SELECT p.name AS product, c.name AS category
FROM products AS p
RIGHT JOIN categories AS c ON c.id = p.category_id;
```

Здесь выводятся все категории, в том числе те, где нет ни одного товара.

## RIGHT = LEFT с переставленными таблицами

Запрос выше эквивалентен:

```sql
SELECT p.name AS product, c.name AS category
FROM categories AS c
LEFT JOIN products AS p ON p.category_id = c.id;
```

На практике чаще пишут `LEFT JOIN`, ставя «главную» таблицу первой — так запрос читается слева направо. `RIGHT JOIN` полезен, когда к длинной цепочке соединений нужно добавить таблицу, все строки которой важно сохранить.

## Поддержка в SQLite

`RIGHT JOIN` и `FULL OUTER JOIN` появились в SQLite 3.39 (2022). В более старых версиях их приходится заменять на `LEFT JOIN`.

## Поиск строк без пары

```sql
SELECT c.name
FROM products p
RIGHT JOIN categories c ON c.id = p.category_id
WHERE p.id IS NULL;
```

Категории, в которых нет товаров.
