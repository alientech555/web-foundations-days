# Library API Design

This document outlines the RESTful API endpoints for managing a library's book collection.

## Endpoints

### 1. List all books
- **Method:** `GET`
- **Path:** `/books`
- **Description:** Retrieves a paginated list of all books in the library.
- **Success Status Code:** `200 OK`

### 2. Get a single book
- **Method:** `GET`
- **Path:** `/books/{id}`
- **Description:** Retrieves the detailed information of a specific book by its unique ID.
- **Success Status Code:** `200 OK`

### 3. Create a new book
- **Method:** `POST`
- **Path:** `/books`
- **Description:** Adds a new book to the library collection.
- **Example Request Body:**
  ```json
  {
    "title": "The Pragmatic Programmer",
    "author": "Andrew Hunt",
    "isbn": "978-0135957059",
    "publishedYear": 2019
  }
- **Success Status Code:** `201 Created`

### 4. Update an existing book
- **Method:** `PUT`
- **Path:** `/books/{id}`
- **Description:** Replaces the entire resource of an existing book with the provided data.
- **Example Request Body:**
  ```json
  {
    "title": "The Pragmatic Programmer (20th Anniversary Edition)",
    "author": "Andrew Hunt",
    "isbn": "978-0135957059",
    "publishedYear": 2019
  }
- **Success Status Code:** `200 OK`

### 5. Delete a book
- **Method:** `DELETE`
- **Path:** `/books/{id}`
- **Description:** Removes a specific book from the library collection by its ID.
- **Success Status Code:** `204 No Content`

### 6. List books by author
- **Method:** `GET`
- **Path:** `/books?author={name}`
- **Description:** Retrieves a list of books filtered by a specific author's name using a query parameter.
- **Success Status Code:** `200 OK`

# Error Codes

### 400 Bad Request
- **Example:** The client sends a `POST /books` request with a missing required field (e.g., omitting the `"title"` or `"author"` in the request body), or provides an invalid data type.

### 404 Not Found
- **Example:** The client requests `GET /books/999` or `DELETE /books/999`, but no book with the ID `999` exists in the database.