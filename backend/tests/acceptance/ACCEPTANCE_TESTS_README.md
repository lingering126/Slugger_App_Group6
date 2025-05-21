# API-Driven Acceptance Tests

This document outlines the API-driven acceptance tests implemented for the Slugger backend. These tests verify end-to-end user scenarios by making sequential calls to the backend API, simulating how a client application would interact with the server.

## Purpose
API-driven acceptance tests help ensure that key user flows and feature integrations work correctly from an external perspective. They complement unit tests by testing the interaction between different components and services through their public API contracts.

## Test Environment
-   **Framework:** Jest
-   **HTTP Client:** Supertest
-   **Database:** MongoDB (via `mongodb-memory-server` for isolated test runs)
-   **Setup:** Each test suite sets up a dedicated Express app instance that mirrors the routing and middleware configuration of the main application (`backend/app.js`). This includes using the actual authentication middleware for protected routes.

## Test Scenarios Implemented

### 1. User Onboarding Flow
-   **File:** `onboarding.acceptance.test.js`
-   **Description:** This test simulates the complete onboarding process for a new user.
-   **Steps:**
    1.  **Register New User:** A POST request is made to `/api/auth/register` with unique user credentials.
        -   *Verification:* Checks for a 201 status and valid user data in the response.
    2.  **Simulate Email Verification:**
        -   The user's `verificationToken` is retrieved directly from the database (as email sending is not part of this automated test).
        -   A GET request is made to `/api/auth/verify-email` with the token.
        -   *Verification:* Checks for a 200 status and confirms the user's `isVerified` status is updated to `true` in the database.
    3.  **Login User:** A POST request is made to `/api/auth/login` with the verified user's credentials.
        -   *Verification:* Checks for a 200 status and that an authentication token is returned.
    4.  **Access Protected Route:** A GET request is made to a protected endpoint (e.g., `/api/homepage/stats/user`) using the obtained authentication token.
        -   *Verification:* Checks for a 200 status and valid data in the response, confirming successful authentication and authorization.

### 2. Activity Management Flow
-   **File:** `activityManagement.acceptance.test.js`
-   **Description:** This test verifies that a logged-in user can successfully create a new activity and then retrieve it.
-   **Steps:**
    1.  **Setup (Register & Login User):** A helper function is used to register a new user, manually mark them as verified in the database (for test simplicity), and log them in to obtain an authentication token.
    2.  **(Optional) Get Activity Types:** A GET request to `/api/homepage/activities/types` is made to ensure the endpoint is functional.
    3.  **Create New Activity:** A POST request is made to `/api/homepage/activities` with details for a new activity (name, type, duration, description), including the user's auth token.
        -   *Verification:* Checks for a 201 status and that the response contains the created activity's data.
    4.  **Retrieve User's Activities:** A GET request is made to `/api/homepage/activities` using the user's auth token.
        -   *Verification:* Checks for a 200 status and that the response contains a list of activities.
    5.  **Verify Created Activity:** The list of retrieved activities is checked to ensure the newly created activity is present and its details match the input.

### 3. Post Management Flow
-   **File:** `postManagement.acceptance.test.js`
-   **Description:** This test verifies that a logged-in user can create a post and then see it when fetching a list of posts.
-   **Steps:**
    1.  **Setup (Register & Login User):** A helper function registers a new user, marks them as verified, and logs them in to obtain an authentication token and user details.
    2.  **Create New Post:** A POST request is made to `/api/posts` with content for the new post and the user's auth token.
        -   *Verification:* Checks for a 201 status and that the response contains the created post's content and correct author information.
    3.  **Retrieve Posts:** A GET request is made to `/api/posts` (using the auth token to correctly determine like status, etc.).
        -   *Verification:* Checks for a 200 status and that the response is an array.
    4.  **Verify Created Post:** The list of retrieved posts is checked to ensure the newly created post is present, with matching content and author.

### 4. Password Reset Flow
-   **File:** `passwordReset.acceptance.test.js`
-   **Description:** This test simulates the full password reset process for a user.
-   **Steps:**
    1.  **Register User:** A helper function registers a new user. The user is manually marked as verified for this test to simplify login checks later.
    2.  **Initiate Forgot Password:** A POST request is made to `/api/auth/forgot-password` with the user's email.
        -   *Verification:* Checks for a 200 status. The `resetToken` is extracted from the response (as the test environment doesn't send emails, the token is returned directly).
    3.  **Reset Password:** A POST request is made to `/api/auth/reset-password` with the `resetToken` and a new password.
        -   *Verification:* Checks for a 200 status and a success message.
    4.  **Login with New Password:** An attempt is made to log in using the user's email and the new password.
        -   *Verification:* Checks for a 200 status and that an authentication token is returned.
    5.  **Attempt Login with Old Password:** An attempt is made to log in using the user's email and the original (old) password.
        -   *Verification:* Checks for a 401 status (unauthorized), confirming the old password is no longer valid.

### 5. Team Management Flow
-   **File:** `teamManagement.acceptance.test.js`
-   **Description:** This test covers creating a team, having another user join it, and viewing team details.
-   **Steps:**
    1.  **User A Registers & Logs In.**
    2.  **User A Creates Team:** A POST request to `/api/teams` with team details (name, description, targetName, etc.).
        -   *Verification:* 201 status, response contains team data, User A is a member, and a 6-digit `teamId` is present.
    3.  **User A Fetches Their Teams:** A GET request to `/api/teams`.
        -   *Verification:* The newly created team is listed.
    4.  **User B Registers & Logs In.**
    5.  **User B Joins Team:** A POST request to `/api/teams/join-by-id` using the 6-digit `teamId`.
        -   *Verification:* 200 status, User B is now listed as a member in the response.
    6.  **View Team Details:** One of the users fetches team details via GET `/api/teams/:teamMongoId`.
        -   *Verification:* Team details are correct, and both User A and User B are listed as members.

### 6. Profile Management Flow
-   **File:** `profileManagement.acceptance.test.js`
-   **Description:** This test verifies fetching, updating, and re-verifying a user's profile information, including synchronization with the User model.
-   **Steps:**
    1.  **User Registers & Logs In.**
    2.  **Fetch Initial Profile:** A GET request to `/api/profiles/me`.
        -   *Verification:* 200 status. The profile (possibly auto-created) should reflect initial data from the User record (e.g., name matches username).
    3.  **Update Profile:** A PUT request to `/api/profiles` with new data (e.g., updated name, bio, longTermGoal).
        -   *Verification:* 200 status, response contains the updated profile information. The populated `user.username` in the response should also reflect the new name if it was changed (due to sync logic).
    4.  **Fetch Profile Again:** A GET request to `/api/profiles/me`.
        -   *Verification:* The fetched profile shows the persisted updates.
    5.  **Verify User Model Sync:** The `User` document is fetched directly from the database.
        -   *Verification:* The `user.name` and `user.username` fields in the User model match the updated name from the profile, confirming synchronization.

## Running the Acceptance Tests

These acceptance tests are part of the main test suite.

1.  Navigate to the backend directory of the project in your terminal:
    ```bash
    cd backend
    ```

2.  Run the entire test suite (including unit and acceptance tests):
    ```bash
    npm test
    ```

3.  To run only the acceptance tests (if your test runner and project structure support it, e.g., Jest):
    ```bash
    npm test acceptance
    ```
    (This command assumes your Jest configuration will pick up tests in the `tests/acceptance` directory. Alternatively, you might run specific files.)

    Or, using Jest directly:
    ```bash
    # Run all tests in the acceptance directory
    jest tests/acceptance 

    # Run a specific acceptance test file
    jest tests/acceptance/onboarding.acceptance.test.js
    ```

## Notes
-   These tests use helper functions from `tests/testSetup.js` for database setup and teardown.
-   Console logs (errors/warnings) that are expected as part of certain error-handling flows within the application are programmatically suppressed within the tests to keep the test output clean.
