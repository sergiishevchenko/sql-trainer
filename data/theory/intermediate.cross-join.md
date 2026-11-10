# CROSS JOIN

`CROSS JOIN` соединяет **каждую** строку левой таблицы с **каждой** строкой правой — это декартово произведение. Условия `ON` нет.

```sql
SELECT r.name AS region, p.name AS product
FROM regions AS r
CROSS JOIN products AS p;
```

4 региона × 8 продуктов = 32 строки.

## Зачем это нужно

**Сетка всех комбинаций**, к которой затем присоединяются факты. Так в отчёте появляются нули для комбинаций без данных:

```sql
SELECT r.name, p.name, COALESCE(SUM(s.quantity), 0) AS units
FROM regions r
CROSS JOIN products p
LEFT JOIN sales_reps sr ON sr.region_id = r.id
LEFT JOIN sales s ON s.rep_id = sr.id AND s.product_id = p.id
GROUP BY r.id, p.id;
```

**Генерация вариантов**: все пары команд, все сочетания размеров и цветов.

## Неявный синтаксис

Перечисление таблиц через запятую — тоже `CROSS JOIN`:

```sql
SELECT * FROM regions, products;
```

Если в `WHERE` добавить условие связи, получится обычное внутреннее соединение (старый стиль записи).

## Осторожно

Размер результата — произведение размеров таблиц. 10 000 × 10 000 строк = 100 миллионов. Забытое условие `ON` превращает `JOIN` в `CROSS JOIN` — частая причина «зависших» запросов.
