# Unit Test Coverage
## User Authentication Features
### Purpose
This document outlines the unit test coverage for the core user authentication functionalities, located in `authController.test.js`. These tests are crucial for ensuring the reliability, security, and correctness of user registration, login, and password recovery processes.

### Covered Features and Scenarios:

#### 1. User Registration (`POST /api/auth/register`)
-   **Successful Registration**: Verifies that a new user can be registered successfully, receiving a token and user details. Confirms the user is marked as `isVerified: false` by default.
-   **Email Uniqueness**: Ensures that registration fails if the provided email address is already in use by an existing user (returns HTTP 400).
-   **Username Uniqueness (Current Behavior)**: Tests registration with a username that already exists but with a different email. (Currently, this is allowed, and the test verifies this behavior).
-   **Missing Required Fields**: Validates that registration attempts fail appropriately (e.g., returns HTTP 500/400 via Mongoose validation) if essential fields like email or password are not provided.

#### 2. User Login (`POST /api/auth/login`)
-   **Successful Login (Verified User)**: Confirms that a registered and verified user can log in successfully with correct credentials, receiving a token and user details.
-   **Incorrect Password**: Ensures login fails (returns HTTP 401) if the correct email is provided but with an incorrect password.
-   **Non-Existent User**: Verifies that login fails (returns HTTP 401) if the provided email does not correspond to any registered user.
-   **Unverified User Login Attempt**: Confirms that users who have registered but not yet verified their email are prevented from logging in (returns HTTP 403).
-   **Missing Required Fields**: Validates that login attempts fail (returns HTTP 400) if email or password fields are missing from the request.

#### 3. Forgot Password (`POST /api/auth/forgot-password`)
-   **Successful Password Reset Initiation**: Checks that for an existing user, the password reset process is initiated correctly (returns HTTP 200). This includes verifying that a reset token is generated and stored for the user (the test environment may return the token directly in the response for ease of testing).
-   **Non-Existent User Request**: Ensures that if a password reset is requested for an email not in the system, a generic success message is returned (HTTP 200) for security reasons (to prevent email enumeration).
-   **Missing Email Field**: Validates that the forgot password request fails (returns HTTP 400) if the email field is not provided.

### Benefits
-   **Increased Reliability**: Provides greater confidence that the authentication system functions as expected under various conditions.
-   **Regression Prevention**: Helps catch unintended changes or bugs in the authentication logic during future development.
-   **Clear Documentation**: The tests, along with this document, serve as a form of executable and written documentation for the authentication API's behavior.

## Analytics Features

### Purpose
This section outlines the unit test coverage for the analytics functionalities, located in `analyticsController.test.js`. These tests ensure the correct calculation and retrieval of team and user performance statistics, progress tracking, and timeline data.

### Covered Features and Scenarios:

#### 1. Analytics Overview (`GET /api/analytics/overview/:teamId`)
-   **Successful Overview Retrieval**: Verifies that for an existing team, core overview statistics (like total score, group target) are returned.
-   **Team Not Found**: Ensures the endpoint returns HTTP 404 if the specified team ID does not exist.

#### 2. User-Specific Analytics Overview (`GET /api/analytics/user-overview/:teamId/:userId`)
-   **Successful User Overview Retrieval**: Confirms that for an existing team and user, user-specific overview statistics (like total score, individual target) are returned.
-   **Team Not Found**: Ensures the endpoint returns HTTP 404 if the specified team ID does not exist.

#### 3. Member Progress (`GET /api/analytics/member-progress/:teamId`)
-   **Successful Member Progress Retrieval**: Checks that for an existing team, member progress data (including user ID, score, display name) is returned as an array.
-   **Team Not Found**: Ensures the endpoint returns HTTP 404 if the specified team ID does not exist.

#### 4. Team Timeline (`GET /api/analytics/timeline/:teamId`)
-   **Successful Timeline Retrieval (1W Range)**: Validates that for an existing team and the '1W' time range, timeline data (including labels and data points) is returned successfully.
-   **Team Not Found**: Ensures the endpoint returns HTTP 404 if the specified team ID does not exist.

#### 5. User-Specific Timeline (`GET /api/analytics/user-timeline/:teamId/:userId`)
-   **Successful User Timeline Retrieval (1W Range)**: Validates that for an existing team, user, and the '1W' time range, user-specific timeline data is returned successfully.
-   **Team Not Found**: Ensures the endpoint returns HTTP 404 if the specified team ID does not exist.

#### 6. Helper Functions
-   **`recordTeamTargetSnapshot(teamId)`**: Verifies that a new team target snapshot document is successfully created in the database with the correct team ID and calculated group target value based on member targets.
-   **`recordUserTargetSnapshot(userId, teamId, personalTargetValue)`**: Ensures a new user-specific target snapshot document is successfully created with the provided user ID, team ID, and personal target value.

### Benefits
-   **Core Functionality Verification**: Ensures the fundamental aspects of the analytics API are working correctly.
-   **Regression Prevention**: Helps catch bugs in the analytics logic during future development.
-   **API Behavior Documentation**: Serves as a reference for the expected behavior of the analytics endpoints.

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
