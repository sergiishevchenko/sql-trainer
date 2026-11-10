INSERT INTO students (id, full_name, email, faculty_id, enrollment_year, birth_date, city) VALUES
  (21, 'Kai Lindqvist', 'kai.l@uni.edu', 1, 2023, '2005-01-01', 'Helsinki');

INSERT INTO courses (id, code, title, faculty_id, professor_id, credits, semester) VALUES
  (16, 'MA401', 'Numerical Methods', 2, 5, 5, 'fall');

INSERT INTO prerequisites (course_id, prerequisite_id) VALUES (16, 8);

INSERT INTO enrollments (student_id, course_id, year, grade) VALUES
  (21, 1, 2023, 74), (21, 2, 2024, NULL), (21, 6, 2023, 95), (18, 12, 2024, NULL);

UPDATE enrollments SET grade = grade - 4 WHERE student_id = 4 AND course_id = 9;
