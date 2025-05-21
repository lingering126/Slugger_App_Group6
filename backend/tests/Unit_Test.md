# Unit Test Coverage
## User Authentication Features
### Purpose
This document outlines the unit test coverage for the core user authentication functionalities, located in `authController.test.js`. These tests are crucial for ensuring the reliability, security, and correctness of user registration, login, and password recovery processes.

### Covered Features and Scenarios:

#### 1. User Registration (`POST /api/auth/signup`)
-   **Successful Registration**: Verifies that a new user can be registered successfully, receiving a success message and user details (name, email, ID). Confirms the user is marked as `isVerified: false` by default and a verification email process is initiated.
-   **Email Uniqueness**: Ensures that registration fails if the provided email address is already in use. If the existing user is unverified, it returns HTTP 409 and indicates a new verification email has been sent. If the existing user is verified, it returns HTTP 409 with a message that the email is already registered and verified.
-   **Name Uniqueness (Current Behavior)**: Tests registration with a `name` that may already exist for another user but with a different email. This is allowed as email is the primary unique identifier for new user creation.
-   **Missing Required Fields**: Validates that registration attempts fail appropriately (e.g., returns HTTP 500 via Mongoose validation) if essential fields like `name`, email, or password are not provided.

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

## Home Page Features

### Purpose
This document outlines the unit test coverage for the Home Page functionalities, primarily located in `postController.test.js` and `statsController.test.js`. These tests ensure the reliability of post and comment management, as well as user statistics and target tracking.

### Covered Features and Scenarios:

#### 1. Post Management (from `postController.test.js`)
-   **Retrieve All Posts (`GET /api/posts`)**
    -   Verifies that all posts can be retrieved successfully (returns HTTP 200 and an array of posts).
-   **Create New Post (`POST /api/posts`)**
    -   Verifies that a new post can be created successfully (returns HTTP 201 and the created post details).
-   **Add Comment to Post (`POST /api/posts/:postId/comments`)**
    -   Verifies that a comment can be added to an existing post successfully (returns HTTP 201 and the created comment details).

#### 2. User Statistics and Targets (from `statsController.test.js`)
-   **Retrieve User Statistics (`GET /api/stats/user`)**
    -   Verifies that user-specific statistics (total points, activities completed) can be retrieved successfully (returns HTTP 200).
-   **Update User Target (`PUT /api/stats/user/target`)**
    -   Verifies that a user's target points can be updated and progress is calculated (returns HTTP 200 with updated target and progress).

### Benefits
-   **Ensures Core Home Page Functionality**: Provides confidence that essential features like viewing posts, creating content, and tracking personal stats are working correctly.
-   **Supports Feature Integrity**: Helps maintain the stability of home page features during ongoing development and refactoring.
-   **Documents API Behavior**: The tests and this documentation clarify the expected behavior of home page related API endpoints.

## Profile Management Features

### Purpose
This section outlines the unit test coverage for the profile management functionalities, located in `profileController.test.js`. These tests ensure the correct handling of user profiles, including profile creation, retrieval, updates, and activity settings management, which are central to the Slugger app's personalization capabilities.

### Covered Features and Scenarios:

#### 1. Retrieve User Profile (`GET /api/profiles/me`)
-   **Automatic Profile Creation**: Verifies that when a user who doesn't have a profile yet requests their profile, a new one is automatically created and returned (returns HTTP 200).
-   **Existing Profile Retrieval**: Confirms that a user can retrieve their existing profile successfully, with all associated data fields (name, bio, longTermGoal, activitySettings).
-   **Authentication Required**: Ensures the endpoint returns HTTP 401 if a request is made without proper authentication.

#### 2. Retrieve Specific User Profile (`GET /api/profiles/:userId`)
-   **Successful Profile Retrieval**: Validates that a specific user's profile can be retrieved by their user ID (returns HTTP 200).
-   **Non-Existent Profile**: Ensures the endpoint returns HTTP 404 if the specified user ID doesn't have an associated profile.
-   **Invalid ID Format**: Verifies appropriate error handling (returns HTTP 400) when an invalid ObjectId format is provided.

#### 3. Update User Profile (`PUT /api/profiles`)
-   **Complete Profile Update**: Tests updating a user's profile with all fields (name, bio, longTermGoal, status) and verifies the changes are applied correctly.
-   **Partial Profile Update**: Confirms that updating only specific fields preserves the values of unspecified fields.
-   **Empty Field Handling**: Verifies that empty strings for bio and longTermGoal are handled correctly and stored as intended.

#### 4. Update Activity Settings (`PUT /api/profiles/activities`)
-   **Activity Settings Update**: Tests updating a user's activity preferences (physicalActivities, mentalActivities, bonusActivities) and verifies the changes are reflected in the database.
-   **New Profile Creation with Activities**: Confirms that if a profile doesn't exist when updating activity settings, a new profile is created with those settings.
-   **Authentication Required**: Ensures the endpoint returns HTTP 401 if a request is made without proper authentication.

#### 5. Edge Cases
-   **Empty Fields**: Validates proper handling of empty strings in text fields like bio and longTermGoal.
-   **Field Preservation**: Confirms that when updating only certain profile fields, other fields maintain their previous values.
-   **Large Data Sets**: Tests profile updates with extensive activity lists to ensure the system can handle larger data volumes.

### Benefits
-   **Feature Reliability**: Ensures the profile management system works correctly across various scenarios.
-   **Data Integrity**: Validates that user profile data is stored and retrieved accurately.
-   **UX Consistency**: Helps maintain a consistent user experience by verifying expected API behaviors.
-   **Regression Prevention**: Protects against unintended changes to profile functionality during ongoing development.
  
## Team Management Features

### Purpose
This section outlines the unit test coverage for the team management functionalities, located in `teamController.test.js`. These tests ensure the correct handling of team creation, management, and member operations.

### Covered Features and Scenarios:

#### 1. Team Creation (`POST /api/teams`)
- **Successful Team Creation**: Verifies that a new team can be created with required fields and optional fields.
- **Member Assignment**: Confirms that the team creator is automatically added as a member.

#### 2. Team Retrieval
- **Get User's Teams (`GET /api/teams`)**: Verifies that all teams a user is a member of can be retrieved successfully.
- **Get All Teams (`GET /api/teams/all`)**: Confirms that all teams in the system can be retrieved.
- **Get Specific Team (`GET /api/teams/:teamId`)**: Validates that a specific team's details can be retrieved by ID.

#### 3. Team Management
- **Update Team Information (`PUT /api/teams/:teamId`)**: Tests updating team details like name and description.
- **Join/Leave Team**: Verifies that users can join and leave teams successfully.
- **Delete Team (`DELETE /api/teams/:teamId`)**: Ensures that teams can be deleted by authorized members.

### Benefits
- **Feature Reliability**: Ensures the team management system works correctly across various scenarios.
- **Data Integrity**: Confirms that team data is stored and retrieved accurately.
- **API Consistency**: Helps maintain consistent API behavior for team-related operations.

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
