# LIKE

`LIKE` сравнивает строку с **шаблоном**:

| Символ | Значение |
|--------|----------|
| `%` | любая последовательность символов (в том числе пустая) |
| `_` | ровно один любой символ |

```sql
SELECT name FROM products WHERE name LIKE 'Air%';     -- начинается с Air
SELECT email FROM customers WHERE email LIKE '%@gmail.com'; -- оканчивается на @gmail.com
SELECT name FROM products WHERE name LIKE '%Pro%';    -- содержит Pro
SELECT name FROM products WHERE name LIKE '_____';    -- ровно 5 символов
```

## Регистр

В SQLite `LIKE` **не чувствителен к регистру** для латинских букв: `'apple' LIKE 'APP%'` — истина. Для регистрозависимого поиска используйте `GLOB` (с шаблонами `*` и `?`):

```sql
SELECT name FROM products WHERE name GLOB 'Air*';
```

## NOT LIKE

```sql
SELECT email FROM customers WHERE email NOT LIKE '%gmail%';
```

> Шаблон, начинающийся с `%`, не может использовать обычный индекс — на больших таблицах такой поиск медленный.
