CREATE TABLE genres (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE directors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  birth_year INTEGER NOT NULL
);

CREATE TABLE movies (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  release_year INTEGER NOT NULL,
  genre_id INTEGER REFERENCES genres(id),
  director_id INTEGER REFERENCES directors(id),
  duration_min INTEGER NOT NULL,
  budget_musd REAL NOT NULL,
  box_office_musd REAL,
  rating REAL NOT NULL,
  age_rating TEXT NOT NULL
);

CREATE TABLE actors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  birth_year INTEGER NOT NULL,
  country TEXT NOT NULL
);

CREATE TABLE movie_cast (
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  actor_id INTEGER NOT NULL REFERENCES actors(id),
  character_name TEXT NOT NULL,
  billing_order INTEGER NOT NULL,
  PRIMARY KEY (movie_id, actor_id)
);

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  reviewer TEXT NOT NULL,
  score INTEGER NOT NULL,
  review_date TEXT NOT NULL
);
