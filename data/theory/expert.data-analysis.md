# Аналитика данных: распределения, медианы, выбросы

## Распределение по корзинам

```sql
SELECT CAST(price / 100 AS INTEGER) * 100 AS bucket, COUNT(*) AS products
FROM products
GROUP BY bucket
ORDER BY bucket;
```

## Медиана

В SQLite нет функции `MEDIAN`. Её считают через нумерацию строк: медиана — среднее одной или двух центральных строк.

```sql
WITH ordered AS (
  SELECT price,
         ROW_NUMBER() OVER (ORDER BY price) AS rn,
         COUNT(*) OVER () AS n
  FROM products
)
SELECT AVG(price) AS median
FROM ordered
WHERE rn IN ((n + 1) / 2, (n + 2) / 2);
```

При нечётном `n` оба выражения дают одну и ту же строку, при чётном — две соседние.

## Квантили и NTILE

`NTILE(4) OVER (ORDER BY x)` делит строки на 4 почти равные группы (квартили). Граница квартиля — максимум значения в группе.

## Среднее и дисперсия

```sql
SELECT AVG(x) AS mean,
       AVG(x * x) - AVG(x) * AVG(x) AS variance
FROM data;
```

Стандартное отклонение — корень из дисперсии. Чтобы не зависеть от математических функций, сравнивайте квадраты: условие `(x - mean)² > 4 · variance` равносильно «отклонение больше двух сигм».

## Выбросы по межквартильному размаху (IQR)

1. Найдите Q1 и Q3.
2. IQR = Q3 − Q1.
3. Выброс — значение меньше Q1 − 1.5·IQR или больше Q3 + 1.5·IQR.

## Сегментация

```sql
SELECT CASE
         WHEN total >= 2000 THEN 'high'
         WHEN total >= 500  THEN 'medium'
         ELSE 'low'
       END AS segment,
       COUNT(*)
FROM customer_totals
GROUP BY segment;
```

## Корреляция «на глаз»

Сравните средние двух групп: например, средний рейтинг фильмов с бюджетом выше и ниже медианы. Это не замена статистике, но быстрый способ проверить гипотезу.

## Помните о NULL

Агрегаты игнорируют NULL, а `COUNT(*)` — нет. Перед расчётом решите, исключать ли пустые значения или заменять их через `COALESCE`.
