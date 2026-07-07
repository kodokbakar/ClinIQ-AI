# ClinIQ-AI - Proposed API Endpoints

This document outlines the proposed RESTful API endpoints for the ClinIQ-AI application. All user-facing API endpoints will be prefixed with `/v1/` for versioning.

**Auth Levels:**
- `Public` — No authentication required
- `User` — Requires `Authorization: Bearer <JWT>`
- `Member` — Requires User auth + membership in the target group
- `Owner` — Requires User auth + ownership of the target group
- `Admin` — Requires User auth + admin role (RBAC)

See [CONFIG.md](CONFIG.md) for JWT configuration, [rules-ai.md](rules-ai.md) for AI generation rules.

---

## 1. Authentication & User Management

### `POST /v1/auth/register`
- **Auth:** Public
- **Description:** Registers a new user.
- **Request Body:**
    ```json
    {
      "username": "string",
      "email": "string (email format)",
      "password": "string (min 8 chars)"
    }
    ```
- **Response (201 Created):**
    ```json
    {
      "token": "jwt_token_string",
      "user": {
        "id": "uuid",
        "username": "string",
        "email": "string"
      }
    }
    ```
- **Errors:**
    - `400 Bad Request` — Validation failed (missing fields, weak password, invalid email)
    - `409 Conflict` — Username or email already exists
- **cURL Example:**
    ```bash
    curl -X POST http://localhost:20128/v1/auth/register \
      -H "Content-Type: application/json" \
      -d '{"username":"dr_ayam","email":"dr@ayam.com","password":"rahasia123"}'
    ```

### `POST /v1/auth/login`
- **Auth:** Public
- **Description:** Authenticates a user and returns a JWT.
- **Request Body:**
    ```json
    {
      "email": "string (email format)",
      "password": "string"
    }
    ```
- **Response (200 OK):**
    ```json
    {
      "token": "jwt_token_string",
      "user": {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "avatar_url": "string | null"
      }
    }
    ```
- **Errors:**
    - `401 Unauthorized` — Invalid email or password
- **cURL Example:**
    ```bash
    curl -X POST http://localhost:20128/v1/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"dr@ayam.com","password":"rahasia123"}'
    ```

### `GET /v1/users/me`
- **Auth:** User
- **Description:** Retrieves the profile of the currently authenticated user.
- **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "avatar_url": "string | null",
      "total_score": 1234,
      "groups": [
        {
          "group_id": "uuid",
          "name": "string",
          "is_owner": true
        }
      ]
    }
    ```
- **Errors:**
    - `401 Unauthorized` — Missing/invalid token

### `PATCH /v1/users/me`
- **Auth:** User
- **Description:** Updates the authenticated user's profile. Only `username` is directly modifiable by the user. `avatar_url` is system-generated using Minidenticons.
- **Request Body (Partial):**
    ```json
    {
      "username": "new_username"
    }
    ```
- **Response (200 OK):** Updated user object.

### `GET /v1/users/:id`
- **Auth:** Public
- **Description:** Retrieves a public user profile (e.g., for displaying group members).
- **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "username": "string",
      "avatar_url": "string | null",
      "total_score": 1234
    }
    ```
- **Errors:**
    - `404 Not Found` — User does not exist

### `POST /v1/users/me/change-password`
- **Auth:** User
- **Description:** Allows the authenticated user to change their password.
- **Request Body:**
    ```json
    {
      "current_password": "string",
      "new_password": "string"
    }
    ```
- **Response (204 No Content):** Password changed successfully.
- **Errors:**
    - `401 Unauthorized` — Incorrect `current_password`

---

## 2. Quiz & Gameplay

### `GET /v1/quiz/daily`
- **Auth:** User
- **Description:** Provides the daily quiz vignette for the authenticated user (determined in UTC). If a quiz for today is already in progress or completed, it returns that one. If not, a new unique vignette is assigned.
- **Response (200 OK):**
    ```json
    {
      "vignette_id": "uuid",
      "disease_name": "string",
      "clues_revealed_count": 0,
      "clues": [
        { "clue_number": 1, "content": "string" }
      ],
      "current_attempt_id": "uuid"
    }
    ```
- **Errors:**
    - `500 Internal Server Error` — No remaining unique vignettes for this user
- **cURL Example:**
    ```bash
    curl -X GET http://localhost:20128/v1/quiz/daily \
      -H "Authorization: Bearer <jwt_token>"
    ```

### `POST /v1/quiz/reveal-clue`
- **Auth:** User
- **Description:** Reveals the next clue for a specific quiz attempt.
- **Request Body:**
    ```json
    {
      "attempt_id": "uuid"
    }
    ```
- **Response (200 OK):**
    ```json
    {
      "clue_number": 2,
      "content": "string",
      "all_clues_revealed": false
    }
    ```
- **Errors:**
    - `400 Bad Request` — All clues already revealed or attempt already completed
    - `404 Not Found` — Attempt not found or doesn't belong to user

### `POST /v1/quiz/submit-diagnosis`
- **Auth:** User
- **Description:** Submits a diagnosis for a quiz attempt.
- **Request Body:**
    ```json
    {
      "attempt_id": "uuid",
      "diagnosis_text": "string"
    }
    ```
- **Response (200 OK):**
    ```json
    {
      "is_correct": true,
      "correct_disease_name": "string",
      "score": 100,
      "explanation": {
        "text": "string (AI-generated localized explanation)",
        "model_used": "string"
      }
    }
    ```
    **Note:** `explanation` is included only if `is_correct` is `false` or after all 5 clues were revealed. See [rules-ai.md](rules-ai.md#1-ai-explanation-generation-user-facing) for AI generation logic.
- **Errors:**
    - `400 Bad Request` — Diagnosis already submitted for this attempt
    - `404 Not Found` — Attempt not found

### `GET /v1/quiz/attempts/me`
- **Auth:** User
- **Description:** Retrieves a paginated list of all quiz attempts by the authenticated user.
- **Query Parameters:**
    - `limit` (integer, optional, default: `10`, max: `50`) — Results per page
    - `offset` (integer, optional, default: `0`) — Pagination offset
- **Response (200 OK):**
    ```json
    [
      {
        "attempt_id": "uuid",
        "vignette_id": "uuid",
        "disease_name": "string",
        "is_correct": true,
        "score": 100,
        "clues_revealed": 3,
        "attempt_time": "timestamp"
      }
    ]
    ```

### `GET /v1/quiz/:vignette_id/explanation`
- **Auth:** User
- **Description:** Retrieves the AI explanation for a specific disease, typically after an incorrect guess or revealing all clues. Triggers AI generation if no cached explanation exists for the user's locale context.
- **Response (200 OK):**
    ```json
    {
      "disease_id": "uuid",
      "disease_name": "string",
      "explanation_text": "string (AI-generated localized explanation)",
      "ai_model_used": "string"
    }
    ```
- **Errors:**
    - `404 Not Found` — Vignette not found

---

## 3. Groups

### `POST /v1/groups`
- **Auth:** User
- **Description:** Creates a new group. The authenticated user becomes the owner. Group capacity is strictly limited to 5 members.
- **Request Body:**
    ```json
    {
      "name": "string (unique)",
      "description": "string | null"
    }
    ```
- **Response (201 Created):**
    ```json
    {
      "group_id": "uuid",
      "name": "string",
      "description": "string | null",
      "owner_id": "uuid",
      "member_count": 1
    }
    ```
- **Errors:**
    - `400 Bad Request` — Invalid input
    - `409 Conflict` — Group name already exists

### `GET /v1/groups/me`
- **Auth:** User
- **Description:** Lists all groups the authenticated user is a member of.
- **Response (200 OK):**
    ```json
    [
      {
        "group_id": "uuid",
        "name": "string",
        "description": "string | null",
        "owner": { "id": "uuid", "username": "string" },
        "member_count": 3
      }
    ]
    ```

### `GET /v1/groups/:id`
- **Auth:** Member
- **Description:** Retrieves details for a specific group. Includes members and inline leaderboard.
- **Response (200 OK):**
    ```json
    {
      "group_id": "uuid",
      "name": "string",
      "description": "string | null",
      "owner": { "id": "uuid", "username": "string" },
      "member_count": 3,
      "members": [
        { "id": "uuid", "username": "string", "avatar_url": "string | null" }
      ],
      "leaderboard": [
        { "user_id": "uuid", "username": "string", "group_score": 123 }
      ]
    }
    ```
- **Errors:**
    - `403 Forbidden` — Not a member of the group
    - `404 Not Found` — Group does not exist

### `POST /v1/groups/:id/join`
- **Auth:** User
- **Description:** Allows the authenticated user to join a group. Enforces maximum 5 members.
- **Response (200 OK):**
    ```json
    {
      "group_id": "uuid",
      "name": "string",
      "message": "Successfully joined group."
    }
    ```
- **Errors:**
    - `400 Bad Request` — Group is full (max 5 members)
    - `404 Not Found` — Group does not exist
    - `409 Conflict` — Already a member

### `DELETE /v1/groups/:id/leave`
- **Auth:** Member
- **Description:** Allows the authenticated user to leave a group. If the user is the owner, they must first transfer ownership or disband the group.
- **Response (204 No Content):** Successfully left the group.
- **Errors:**
    - `403 Forbidden` — Owner cannot leave (must transfer or delete); or not a member

### `DELETE /v1/groups/:id`
- **Auth:** Owner
- **Description:** Deletes a group. Only the owner can do this.
- **Response (204 No Content):** Group deleted.
- **Errors:**
    - `403 Forbidden` — Not the owner
    - `404 Not Found` — Group not found

---

## 4. Leaderboards

### `GET /v1/leaderboards/global`
- **Auth:** Public
- **Description:** Retrieves the global leaderboard.
- **Query Parameters:**
    - `limit` (integer, optional, default: `10`, max: `100`)
    - `offset` (integer, optional, default: `0`)
- **Response (200 OK):**
    ```json
    [
      {
        "user_id": "uuid",
        "username": "string",
        "avatar_url": "string | null",
        "total_score": 5000
      }
    ]
    ```
- **cURL Example:**
    ```bash
    curl http://localhost:20128/v1/leaderboards/global?limit=5
    ```

### `GET /v1/leaderboards/groups/:group_id`
- **Auth:** Member
- **Description:** Retrieves the leaderboard for a specific group.
- **Query Parameters:**
    - `limit` (integer, optional, default: `10`, max: `50`)
    - `offset` (integer, optional, default: `0`)
- **Response (200 OK):**
    ```json
    [
      {
        "user_id": "uuid",
        "username": "string",
        "avatar_url": "string | null",
        "group_score": 500
      }
    ]
    ```
- **Errors:**
    - `403 Forbidden` — Not a member of the group
    - `404 Not Found` — Group not found

---

## 5. Disease Search & Admin

### `GET /v1/diseases/search`
- **Auth:** Public
- **Description:** Performs a fast, case-insensitive search for disease names. Uses `pg_trgm` index for prefix matching — designed for autocomplete (no Enter key needed).
- **Query Parameters:**
    - `q` (string, required) — Search term, matched against start of disease names
    - `limit` (integer, optional, default: `10`, max: `25`)
- **Example Request:** `GET /v1/diseases/search?q=Choler&limit=5`
- **Response (200 OK):**
    ```json
    [
      {
        "disease_id": "uuid",
        "name": "Cholera due to Vibrio cholerae 01, biovar cholerae"
      },
      {
        "disease_id": "uuid",
        "name": "Cholera due to Vibrio cholerae 01, biovar eltor"
      }
    ]
    ```
- **cURL Example:**
    ```bash
    curl "http://localhost:20128/v1/diseases/search?q=Demam&limit=3"
    ```

### `POST /v1/admin/diseases/upload-icd`
- **Auth:** Admin (RBAC)
- **Description:** Uploads a new ICD Excel/CSV file to update the `Diseases` table. Triggers chunking and seeding process.
- **Request Body:** `multipart/form-data` with a file (e.g., `icd_data.xlsx`).
- **Response (200 OK):**
    ```json
    {
      "message": "Diseases updated successfully.",
      "count": 123
    }
    ```

### `POST /v1/admin/vignettes/generate`
- **Auth:** Admin (RBAC)
- **Description:** Manually triggers the AI to generate new quiz vignettes for a specified disease. See [rules-ai.md](rules-ai.md#2-quiz-vignette-generation-adminsystem-triggered) for generation rules.
- **Request Body:**
    ```json
    {
      "disease_id": "uuid",
      "count": 5
    }
    ```
- **Response (202 Accepted):** (Async operation)
    ```json
    {
      "message": "Vignette generation initiated for disease_id: uuid. Expected new vignettes: 5."
    }
    ```
- **Errors:**
    - `404 Not Found` — Disease not found
    - `400 Bad Request` — Invalid count value

---

This endpoint structure considers the core functionalities and performance aspects described in the project. Error handling and authentication requirements are noted for each.
