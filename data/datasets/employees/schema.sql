CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  budget REAL NOT NULL
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  department_id INTEGER REFERENCES departments(id),
  manager_id INTEGER REFERENCES employees(id),
  job_title TEXT NOT NULL,
  salary REAL NOT NULL,
  hire_date TEXT NOT NULL,
  birth_date TEXT,
  gender TEXT
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  start_date TEXT NOT NULL,
  end_date TEXT,
  budget REAL NOT NULL
);

CREATE TABLE employee_projects (
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  project_id INTEGER NOT NULL REFERENCES projects(id),
  role TEXT NOT NULL,
  hours INTEGER NOT NULL,
  PRIMARY KEY (employee_id, project_id)
);

CREATE TABLE salary_history (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  salary REAL NOT NULL,
  changed_at TEXT NOT NULL
);
