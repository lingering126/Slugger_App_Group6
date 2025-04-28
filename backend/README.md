# Slugger App Backend

## Code Organization

### Routes and Models

The application uses the following main routes:

- `/api/auth` - Authentication routes (login, register, etc.)
- `/api/teams` - Team management routes
- `/api/groups` - Redirects to team routes for backward compatibility
- `/api/posts` - Social posts
- `/api/activities` - Activity tracking
- `/api/stats` - Statistics and reporting

### File Structure Notes

- **Team vs Group**: The codebase originally had duplicate files for "teams" and "groups", but they have been consolidated to use only "team" terminology. The `/api/groups` endpoint still works for backward compatibility but redirects to team routes.

- **Auth Middleware**: There are multiple auth.js files in the codebase. The main one is in `backend/middleware/auth.js`. The ones in `backend/src/middleware/auth.js` and `backend/homepage/middleware/auth.js` serve specific needs in those areas of the application.

## API Documentation

### Authentication API

User authentication in Slugger provides secure account management with:

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Authenticate and get JWT token
- `GET /api/auth/verify-email` - Verify user email address
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/forgot-password` - Request password reset email (not fully implemented)
- `POST /api/auth/reset-password` - Set new password with reset token (not fully implemented)

### Teams API

Teams are used to group users together for collaborative goal tracking.

- `POST /api/teams` - Create a new team
- `GET /api/teams` - Get all teams the user is a member of
- `GET /api/teams/all` - Get all teams
- `POST /api/teams/join` - Join a team by ID
- `POST /api/teams/join-by-id` - Join a team by 6-digit ID
- `POST /api/teams/leave` - Leave a team
- `PUT /api/teams/:teamId` - Update team information
- `PUT /api/teams/:teamId/targets` - Update team targets

For backward compatibility, the API also accepts "groupId" parameters when "teamId" is expected.

## Testing

### Authentication Tests

The authentication system uses a mock-based testing approach for reliability across all platforms:

```bash
# Run authentication tests
npm test -- tests/auth/authTests.test.js
```

Key authentication tests include:
- User registration validation
- Login and JWT token handling
- Email verification process 
- Security and error handling

The tests are designed to run without MongoDB Memory Server, making them faster and more reliable especially on Windows systems.

### Authentication Test Structure and Coverage

#### Test Coverage by Function

The `authTests.test.js` file contains test cases organized by authentication function:

| Function | Test File Section | Test Cases |
|----------|------------------|------------|
| **User Registration** | `describe('User Registration')` | - Successful registration<br>- Duplicate email rejection<br>- Email format validation<br>- Password strength validation<br>- Required field validation |
| **User Login** | `describe('User Login')` | - Login with valid credentials<br>- Rejection for unverified users<br>- Incorrect password handling<br>- Non-existent user handling<br>- Missing credential validation |
| **Email Verification** | `describe('Email Verification')` | - Verification with valid token<br>- Invalid token handling<br>- Expired token handling<br>- Already verified user handling |
| **Remember Password** | `describe('Remember Password')` | - Saving credentials when checked<br>- Removing credentials when unchecked<br>- Preserving credentials during logout<br>- Auto-filling after logout |

#### Running Specific Tests

To run all authentication tests:

```bash
cd backend
npm test -- tests/auth/authTests.test.js
```

To run a specific test section (e.g., only login tests):

```bash
cd backend
npm test -- -t "User Login" tests/auth/authTests.test.js
```

#### Mocking Strategy

The tests employ several mocking strategies to isolate authentication logic from external dependencies:

1. **User Model Mocking**: Mocking the User module and its methods
2. **Email Service Mocking**: Mocking nodemailer for email verification testing
3. **JWT Token Mocking**: Mocking JWT for consistent token generation/verification
4. **Express App Isolation**: Creating isolated Express app instances for testing

## Development Guidelines

When adding new features related to teams:

1. Always use the unified team implementation in `backend/routes/team.js`
2. Use the `teamService.js` in the frontend to interact with the API
3. Maintain consistent "team" terminology in the UI
4. If you need to access team data directly in a component, use `teamService` methods rather than direct API calls

This unified approach ensures consistency in the application and makes the code easier to maintain. 