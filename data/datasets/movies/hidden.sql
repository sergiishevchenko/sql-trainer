INSERT INTO directors (id, name, country, birth_year) VALUES
  (11, 'Wes Anderson', 'USA', 1969);

INSERT INTO movies (id, title, release_year, genre_id, director_id, duration_min, budget_musd, box_office_musd, rating, age_rating) VALUES
  (31, 'Dune: Part Two', 2024, 2, 3, 166, 190, 714.4, 8.6, 'PG-13');

INSERT INTO actors (id, name, birth_year, country) VALUES
  (24, 'Tilda Swinton', 1960, 'UK');

INSERT INTO movie_cast (movie_id, actor_id, character_name, billing_order) VALUES
  (31, 10, 'Paul Atreides', 1), (31, 11, 'Chani', 2), (31, 22, 'Princess Irulan', 4);

INSERT INTO reviews (id, movie_id, reviewer, score, review_date) VALUES
  (27, 31, 'spice_lover', 10, '2024-03-05'),
  (28, 17, 'anime_fan', 3, '2024-03-06');

UPDATE movies SET box_office_musd = 2.6 WHERE id = 15;
