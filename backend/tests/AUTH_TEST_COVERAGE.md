# Unit Test Coverage for User Authentication Features

## Purpose
This document outlines the unit test coverage for the core user authentication functionalities, located in `authController.test.js`. These tests are crucial for ensuring the reliability, security, and correctness of user registration, login, and password recovery processes.

## Covered Features and Scenarios:

### 1. User Registration (`POST /api/auth/register`)
-   **Successful Registration**: Verifies that a new user can be registered successfully, receiving a token and user details. Confirms the user is marked as `isVerified: false` by default.
-   **Email Uniqueness**: Ensures that registration fails if the provided email address is already in use by an existing user (returns HTTP 400).
-   **Username Uniqueness (Current Behavior)**: Tests registration with a username that already exists but with a different email. (Currently, this is allowed, and the test verifies this behavior).
-   **Missing Required Fields**: Validates that registration attempts fail appropriately (e.g., returns HTTP 500/400 via Mongoose validation) if essential fields like email or password are not provided.

### 2. User Login (`POST /api/auth/login`)
-   **Successful Login (Verified User)**: Confirms that a registered and verified user can log in successfully with correct credentials, receiving a token and user details.
-   **Incorrect Password**: Ensures login fails (returns HTTP 401) if the correct email is provided but with an incorrect password.
-   **Non-Existent User**: Verifies that login fails (returns HTTP 401) if the provided email does not correspond to any registered user.
-   **Unverified User Login Attempt**: Confirms that users who have registered but not yet verified their email are prevented from logging in (returns HTTP 403).
-   **Missing Required Fields**: Validates that login attempts fail (returns HTTP 400) if email or password fields are missing from the request.

### 3. Forgot Password (`POST /api/auth/forgot-password`)
-   **Successful Password Reset Initiation**: Checks that for an existing user, the password reset process is initiated correctly (returns HTTP 200). This includes verifying that a reset token is generated and stored for the user (the test environment may return the token directly in the response for ease of testing).
-   **Non-Existent User Request**: Ensures that if a password reset is requested for an email not in the system, a generic success message is returned (HTTP 200) for security reasons (to prevent email enumeration).
-   **Missing Email Field**: Validates that the forgot password request fails (returns HTTP 400) if the email field is not provided.

## Benefits
-   **Increased Reliability**: Provides greater confidence that the authentication system functions as expected under various conditions.
-   **Regression Prevention**: Helps catch unintended changes or bugs in the authentication logic during future development.
-   **Clear Documentation**: The tests, along with this document, serve as a form of executable and written documentation for the authentication API's behavior.

## Running the Tests

To execute these unit tests:

1.  Navigate to the backend directory of the project in your terminal:
    ```bash
    cd backend
    ```

2.  Run the test suite using the following command:
    ```bash
    npm test
    ```
    This command will typically execute all test files within the `backend/tests` directory, including `authController.test.js`.

3.  To run only the authentication tests specifically (if your test runner supports it, e.g., Jest):
    ```bash
    npm test authController.test.js
    ```
    Alternatively, using Jest directly (if installed globally or via npx):
    ```bash
    jest authController.test.js
    ```
