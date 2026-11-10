INSERT INTO employees (id, first_name, last_name, email, department_id, manager_id, job_title, salary, hire_date, birth_date, gender) VALUES
  (27, 'Adam', 'Novak', 'adam.novak@corp.com', 3, 13, 'Account Executive', 74000, '2024-01-15', '1993-03-13', 'M'),
  (28, 'Bella', 'Stone', NULL, 6, 21, 'Data Engineer', 105000, '2023-10-02', '1990-12-12', 'F');

INSERT INTO projects (id, name, department_id, start_date, end_date, budget) VALUES
  (9, 'Compliance Audit', 8, '2024-02-15', NULL, 40000);

INSERT INTO employee_projects (employee_id, project_id, role, hours) VALUES
  (28, 7, 'Engineer', 210),
  (27, 4, 'Analyst', 120);

INSERT INTO salary_history (id, employee_id, salary, changed_at) VALUES
  (18, 28, 98000, '2023-10-02'),
  (19, 28, 105000, '2024-04-01');

UPDATE employees SET salary = salary + 1500 WHERE id IN (9, 17);
