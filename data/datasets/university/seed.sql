INSERT INTO faculties (id, name, building) VALUES
  (1, 'Computer Science', 'Building A'),
  (2, 'Mathematics', 'Building B'),
  (3, 'Physics', 'Building C'),
  (4, 'Economics', 'Building D'),
  (5, 'Philosophy', 'Building E');

INSERT INTO professors (id, full_name, faculty_id, title, hired_year, salary) VALUES
  (1, 'Dr. Alan Grant', 1, 'Professor', 2005, 98000),
  (2, 'Dr. Barbara Liskov', 1, 'Professor', 2008, 105000),
  (3, 'Dr. Claude Shannon', 1, 'Associate Professor', 2014, 82000),
  (4, 'Dr. Emmy Noether', 2, 'Professor', 2003, 101000),
  (5, 'Dr. Kurt Godel', 2, 'Associate Professor', 2012, 79000),
  (6, 'Dr. Lise Meitner', 3, 'Professor', 2006, 97000),
  (7, 'Dr. Richard Feynman', 3, 'Lecturer', 2019, 64000),
  (8, 'Dr. Adam Smith', 4, 'Professor', 2010, 92000),
  (9, 'Dr. Joan Robinson', 4, 'Lecturer', 2020, 61000),
  (10, 'Dr. Hannah Arendt', 5, 'Associate Professor', 2015, 75000);

INSERT INTO courses (id, code, title, faculty_id, professor_id, credits, semester) VALUES
  (1, 'CS101', 'Intro to Programming', 1, 3, 6, 'fall'),
  (2, 'CS201', 'Data Structures', 1, 2, 6, 'spring'),
  (3, 'CS301', 'Databases', 1, 1, 5, 'fall'),
  (4, 'CS302', 'Algorithms', 1, 2, 6, 'fall'),
  (5, 'CS401', 'Distributed Systems', 1, 1, 5, 'spring'),
  (6, 'MA101', 'Calculus I', 2, 4, 6, 'fall'),
  (7, 'MA102', 'Calculus II', 2, 4, 6, 'spring'),
  (8, 'MA201', 'Linear Algebra', 2, 5, 5, 'fall'),
  (9, 'MA301', 'Probability', 2, 5, 5, 'spring'),
  (10, 'PH101', 'Mechanics', 3, 6, 6, 'fall'),
  (11, 'PH201', 'Quantum Physics', 3, 7, 6, 'spring'),
  (12, 'EC101', 'Microeconomics', 4, 8, 5, 'fall'),
  (13, 'EC201', 'Econometrics', 4, 9, 5, 'spring'),
  (14, 'PL101', 'Ethics', 5, 10, 4, 'fall'),
  (15, 'CS450', 'Machine Learning', 1, NULL, 5, 'spring');

INSERT INTO prerequisites (course_id, prerequisite_id) VALUES
  (2, 1), (3, 2), (4, 2), (5, 3), (5, 4),
  (7, 6), (8, 6), (9, 7),
  (11, 10), (11, 7),
  (13, 12), (13, 9),
  (15, 4), (15, 9), (15, 8);

INSERT INTO students (id, full_name, email, faculty_id, enrollment_year, birth_date, city) VALUES
  (1, 'Liam Novak', 'liam.n@uni.edu', 1, 2021, '2002-03-14', 'Prague'),
  (2, 'Mia Horvat', 'mia.h@uni.edu', 1, 2021, '2003-07-01', 'Zagreb'),
  (3, 'Noah Becker', 'noah.b@uni.edu', 1, 2022, '2004-01-20', 'Vienna'),
  (4, 'Ava Rossi', 'ava.r@uni.edu', 2, 2021, '2002-11-09', 'Milan'),
  (5, 'Ethan Kowalski', NULL, 2, 2022, '2003-05-05', 'Warsaw'),
  (6, 'Sophia Muller', 'sophia.m@uni.edu', 3, 2021, '2002-09-17', 'Berlin'),
  (7, 'Lucas Silva', 'lucas.s@uni.edu', 4, 2023, '2005-02-28', 'Lisbon'),
  (8, 'Isabella Costa', 'isabella.c@uni.edu', 4, 2022, '2004-06-12', 'Porto'),
  (9, 'Mason Dvorak', 'mason.d@uni.edu', 1, 2023, '2005-08-30', 'Brno'),
  (10, 'Amelia Nowak', 'amelia.n@uni.edu', 2, 2023, '2005-04-15', 'Krakow'),
  (11, 'Oliver Fischer', 'oliver.f@uni.edu', 3, 2022, '2003-12-03', 'Munich'),
  (12, 'Emily Varga', NULL, 1, 2022, '2004-10-22', 'Budapest'),
  (13, 'Daniel Popescu', 'daniel.p@uni.edu', 4, 2021, '2002-01-08', 'Bucharest'),
  (14, 'Chloe Martin', 'chloe.m@uni.edu', 2, 2022, '2003-03-19', 'Lyon'),
  (15, 'Leo Jensen', 'leo.j@uni.edu', 1, 2024, '2006-05-27', 'Copenhagen'),
  (16, 'Zoe Andersen', 'zoe.a@uni.edu', 3, 2024, '2006-09-09', 'Oslo'),
  (17, 'Adam Kral', 'adam.k@uni.edu', 1, 2021, '2002-07-07', 'Prague'),
  (18, 'Ella Berg', 'ella.b@uni.edu', 4, 2024, '2006-02-14', 'Stockholm'),
  (19, 'Jonas Weber', 'jonas.w@uni.edu', NULL, 2023, '2004-11-30', 'Zurich'),
  (20, 'Nina Petrova', 'nina.p@uni.edu', 2, 2021, '2002-08-25', 'Sofia');

INSERT INTO enrollments (student_id, course_id, year, grade) VALUES
  (1, 1, 2021, 88), (1, 2, 2022, 91), (1, 3, 2023, 85), (1, 4, 2023, 79), (1, 6, 2021, 72), (1, 5, 2024, NULL),
  (2, 1, 2021, 95), (2, 2, 2022, 97), (2, 3, 2023, 93), (2, 4, 2023, 90), (2, 15, 2024, NULL), (2, 8, 2022, 89),
  (3, 1, 2022, 67), (3, 2, 2023, 58), (3, 6, 2022, 61), (3, 3, 2024, NULL),
  (4, 6, 2021, 93), (4, 7, 2022, 90), (4, 8, 2022, 96), (4, 9, 2023, 88), (4, 12, 2023, 74),
  (5, 6, 2022, 55), (5, 7, 2023, 48), (5, 8, 2023, 63),
  (6, 10, 2021, 82), (6, 6, 2021, 77), (6, 7, 2022, 70), (6, 11, 2023, 85),
  (7, 12, 2023, 81), (7, 6, 2023, 66), (7, 13, 2024, NULL),
  (8, 12, 2022, 74), (8, 13, 2023, 69), (8, 9, 2023, 58),
  (9, 1, 2023, 99), (9, 6, 2023, 84), (9, 2, 2024, NULL),
  (10, 6, 2023, 91), (10, 8, 2024, NULL),
  (11, 10, 2022, 45), (11, 6, 2022, 52), (11, 10, 2023, 71),
  (12, 1, 2022, 76), (12, 2, 2023, 81), (12, 4, 2024, NULL),
  (13, 12, 2021, 88), (13, 13, 2022, 92), (13, 9, 2022, 79), (13, 3, 2023, 73),
  (14, 6, 2022, 85), (14, 7, 2023, 87), (14, 8, 2023, 80),
  (15, 1, 2024, NULL),
  (16, 10, 2024, NULL),
  (17, 1, 2021, 59), (17, 2, 2022, 64), (17, 3, 2023, 70), (17, 4, 2023, 55),
  (19, 12, 2023, 90), (19, 1, 2023, 83),
  (20, 6, 2021, 78), (20, 7, 2022, 82), (20, 9, 2023, 91), (20, 8, 2022, 77);
