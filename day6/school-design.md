# School Database Design

## Table Explanations
- **`students`**: Stores core student demographic data. It includes a unique identifier (`id`), the student's `name`, and a `email` which is enforced as `UNIQUE` to prevent duplicate accounts.
- **`courses`**: Stores academic course information, including a unique identifier (`id`), the course `title`, and the number of `credits` it carries.
- **`enrolments`**: A junction (or associative) table that records the relationship between students and courses. It holds the `grade` achieved and uses foreign keys to link back to the `students` and `courses` tables.

## Relationships
- **One-to-Many**: 
  - One `student` can have many `enrolments`.
  - One `course` can have many `enrolments`.
- **Many-to-Many**: 
  - A `student` can enrol in multiple `courses`, and a `course` can have multiple `students`. 
  - **Why a join table is needed**: Relational databases cannot natively map many-to-many relationships directly between two tables. The `enrolments` table acts as a necessary intermediary (join table) to resolve this, allowing us to store relationship-specific data (like the `grade`) and enforce constraints (like preventing duplicate enrolments via a `UNIQUE` composite key).

## Indexing Strategy
- **Proposed Index**: `CREATE INDEX idx_enrolments_student_course ON enrolments(student_id, course_id);`
- **Reason**: While the `UNIQUE` constraint implicitly creates an index, explicitly defining a composite index on `(student_id, course_id)` dramatically optimizes query performance. It allows the database engine to instantly locate a student's courses or verify if an enrolment already exists without scanning the entire `enrolments` table.

## SQL vs. NoSQL Selection
For this school management system, **SQL is the definitive choice**. The data is highly structured with rigid, well-defined relationships (students, courses, and grades). Academic records demand strict **ACID compliance** (Atomicity, Consistency, Isolation, Durability) to ensure data integrity. For example, foreign key constraints guarantee that an enrolment record cannot exist for a deleted student or course (preventing orphaned records). A NoSQL document store would introduce unnecessary complexity, potential data duplication, and a lack of native referential integrity for this specific use case.

