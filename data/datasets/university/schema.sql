CREATE TABLE faculties (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  building TEXT NOT NULL
);

CREATE TABLE professors (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  faculty_id INTEGER NOT NULL REFERENCES faculties(id),
  title TEXT NOT NULL,
  hired_year INTEGER NOT NULL,
  salary REAL NOT NULL
);

CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  faculty_id INTEGER NOT NULL REFERENCES faculties(id),
  professor_id INTEGER REFERENCES professors(id),
  credits INTEGER NOT NULL,
  semester TEXT NOT NULL
);

CREATE TABLE prerequisites (
  course_id INTEGER NOT NULL REFERENCES courses(id),
  prerequisite_id INTEGER NOT NULL REFERENCES courses(id),
  PRIMARY KEY (course_id, prerequisite_id)
);

CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  faculty_id INTEGER REFERENCES faculties(id),
  enrollment_year INTEGER NOT NULL,
  birth_date TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE enrollments (
  student_id INTEGER NOT NULL REFERENCES students(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  year INTEGER NOT NULL,
  grade INTEGER,
  PRIMARY KEY (student_id, course_id, year)
);
