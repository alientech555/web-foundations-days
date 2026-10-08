-- Drop tables in reverse order of dependency to ensure clean re-runs in playgrounds
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- ==========================================
-- 1. CREATE TABLE STATEMENTS
-- ==========================================

CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    credits INTEGER NOT NULL
);

CREATE TABLE enrolments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    UNIQUE(student_id, course_id) -- Rule preventing the same student enrolling on the same course twice
);

-- ==========================================
-- 2. INSERT STATEMENTS
-- ==========================================
-- Note: Student 3 (Charlie Brown) is intentionally left without enrolments 
-- to successfully demonstrate Query 4.

INSERT INTO students (name, email) VALUES 
    ('Alice Smith', 'alice@example.com'),
    ('Bob Jones', 'bob@example.com'),
    ('Charlie Brown', 'charlie@example.com');

INSERT INTO courses (title, credits) VALUES 
    ('Mathematics', 3),
    ('Computer Science', 4),
    ('History', 3);

INSERT INTO enrolments (student_id, course_id, grade) VALUES 
    (1, 1, 'A'),    -- Alice, Mathematics
    (1, 2, 'B'),    -- Alice, Computer Science
    (2, 1, 'C'),    -- Bob, Mathematics
    (2, 3, 'A'),    -- Bob, History
    (1, 3, 'A');    -- Alice, History

-- ==========================================
-- 3. QUERIES
-- ==========================================

-- Query 1: All courses for one student (by name)
SELECT c.title 
FROM courses c
JOIN enrolments e ON c.id = e.course_id
JOIN students s ON s.id = e.student_id
WHERE s.name = 'Alice Smith';

-- Query 2: All students on one course
SELECT s.name 
FROM students s
JOIN enrolments e ON s.id = e.student_id
JOIN courses c ON c.id = e.course_id
WHERE c.title = 'Mathematics';

-- Query 3: The number of students per course
SELECT c.title, COUNT(e.student_id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON c.id = e.course_id
GROUP BY c.id;

-- Query 4: Students who have no enrolments
SELECT s.name 
FROM students s
LEFT JOIN enrolments e ON s.id = e.student_id
WHERE e.student_id IS NULL;

-- Query 5: Update one enrolment's grade (e.g., upgrading Bob's Mathematics grade)
UPDATE enrolments 
SET grade = 'A+' 
WHERE student_id = 2 AND course_id = 1;