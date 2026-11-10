# Строковые функции

## Конкатенация

В SQLite строки склеиваются оператором `||`:

```sql
SELECT first_name || ' ' || last_name AS full_name FROM customers;
```

Если один из операндов NULL, весь результат будет NULL. Защита: `COALESCE(email, '')`.

## Основные функции

| Функция | Пример | Результат |
|---------|--------|-----------|
| `UPPER(s)`, `LOWER(s)` | `UPPER('sql')` | `'SQL'` |
| `LENGTH(s)` | `LENGTH('Paris')` | `5` |
| `SUBSTR(s, start, len)` | `SUBSTR('2024-03-15', 1, 4)` | `'2024'` |
| `REPLACE(s, a, b)` | `REPLACE('a-b-c', '-', '/')` | `'a/b/c'` |
| `TRIM(s)` | `TRIM('  hi ')` | `'hi'` |
| `INSTR(s, sub)` | `INSTR('anna@mail.com', '@')` | `5` |

Нумерация символов в `SUBSTR` и `INSTR` начинается с **1**. `INSTR` возвращает 0, если подстрока не найдена.

## Разбор строк

Домен из email:

```sql
SELECT email,
       SUBSTR(email, INSTR(email, '@') + 1) AS domain
FROM customers
WHERE email IS NOT NULL;
```

Если третий аргумент `SUBSTR` не указан, берётся всё до конца строки.

## Регистр и сравнение

`=` чувствителен к регистру, `LIKE` (для латиницы) — нет. Для сравнения без учёта регистра приведите обе стороны: `LOWER(city) = 'london'`.

## Форматирование чисел

```sql
SELECT name, printf('%.2f', price) AS price_text FROM products;
```
