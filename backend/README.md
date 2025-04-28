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

For more details, see `/backend/User Authentication/README.md`.

## Development Guidelines

When adding new features related to teams:

1. Always use the unified team implementation in `backend/routes/team.js`
2. Use the `teamService.js` in the frontend to interact with the API
3. Maintain consistent "team" terminology in the UI
4. If you need to access team data directly in a component, use `teamService` methods rather than direct API calls

This unified approach ensures consistency in the application and makes the code easier to maintain. 