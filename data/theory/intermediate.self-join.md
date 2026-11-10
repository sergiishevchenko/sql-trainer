# Self JOIN

Self join — соединение таблицы **с самой собой**. Это обычный `JOIN`, но одна таблица участвует дважды под разными алиасами.

## Иерархии

В `employees` у каждого сотрудника есть `manager_id` — ссылка на другого сотрудника:

```sql
SELECT e.first_name AS employee,
       m.first_name AS manager
FROM employees AS e
LEFT JOIN employees AS m ON m.id = e.manager_id;
```

- `e` — сотрудник, `m` — его руководитель.
- `LEFT JOIN` сохраняет сотрудника без руководителя (CEO).

## Сравнение строк одной таблицы

Сотрудники, получающие больше своего руководителя:

```sql
SELECT e.first_name, e.salary, m.first_name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;
```

## Пары без повторов

Все пары товаров одной категории. Условие `a.id < b.id` исключает пары «товар сам с собой» и зеркальные дубликаты (A, B) / (B, A):

```sql
SELECT a.name, b.name
FROM products a
JOIN products b ON b.category_id = a.category_id AND a.id < b.id;
```

## Алиасы обязательны

Без разных алиасов СУБД не сможет понять, к какой «копии» таблицы относится столбец.
