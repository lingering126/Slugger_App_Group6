# User Authentication Tests

This directory contains unit tests for the user authentication functionality of the Slugger App.

## Test Structure

The authentication tests have been simplified and reorganized to avoid issues with MongoDB Memory Server on Windows systems.

### Active Test Files:

- `tests/auth/authTests.test.js`: A comprehensive mock-based test file that covers all authentication functionality.

## Test Coverage by Function

The `authTests.test.js` file contains test cases organized by authentication function:

| Function | Test File Section | Test Cases |
|----------|------------------|------------|
| **User Registration** | `describe('User Registration')` | - Successful registration<br>- Duplicate email rejection<br>- Email format validation<br>- Password strength validation<br>- Required field validation |
| **User Login** | `describe('User Login')` | - Login with valid credentials<br>- Rejection for unverified users<br>- Incorrect password handling<br>- Non-existent user handling<br>- Missing credential validation |
| **Email Verification** | `describe('Email Verification')` | - Verification with valid token<br>- Invalid token handling<br>- Expired token handling<br>- Already verified user handling |
| **Password Reset** | `describe('Password Reset')` | - Password reset request<br>- Non-existent email handling<br>- Password reset with valid token<br>- Expired token handling<br>- Weak password validation |

## Running the Tests

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

## Implementation Details

### Mocking Strategy

The tests employ several mocking strategies to isolate authentication logic from external dependencies:

1. **User Model Mocking**:
   ```javascript
   // Mock the User module and its methods
   jest.mock('../../src/models/user', () => { ... });
   const User = require('../../src/models/user');
   User.findOne = mockFindOne;
   ```

2. **Email Service Mocking**:
   ```javascript
   // Mock nodemailer for email verification testing
   jest.mock('nodemailer', () => ({ ... }));
   ```

3. **JWT Token Mocking**:
   ```javascript
   // Mock JWT for consistent token generation/verification
   const mockJwtSign = jest.fn().mockReturnValue('test-token');
   const mockJwtVerify = jest.fn().mockImplementation((token, secret) => { ... });
   ```

4. **Express App Isolation**:
   ```javascript
   // Create isolated Express app instances for testing
   const app = express();
   app.use(express.json());
   ```

## Test Coverage Summary

| Authentication Aspect | Coverage | Notes |
|----------------------|----------|-------|
| Input Validation | ✅ Complete | Email format, password strength, required fields |
| Error Handling | ✅ Complete | All error paths tested (400, 403, 404, 500) |
| Security Checks | ✅ Complete | Token validation, email verification requirement |
| Success Paths | ✅ Complete | All authentication functions tested for success |

## Notes for Developers

- When adding new authentication features, add corresponding test cases to the relevant section in `authTests.test.js`
- Use the existing mocking patterns to maintain test isolation and speed
- All tests should be independent and not require a real database or external services
- If you need to test a new endpoint, add it to the appropriate section in the test file

## Troubleshooting Tests

- If tests are failing with timeout errors, check if you're using `async/await` correctly
- For JWT-related failures, check the JWT mocking implementation
- If password comparison fails, ensure bcrypt mocking is working correctly 