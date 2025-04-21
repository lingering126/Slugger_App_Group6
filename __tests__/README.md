# Authentication Unit Tests

This directory contains unit tests for the authentication functionality in the Slugger app.

## Test Files

1. **passwordValidation.test.js** - Tests for password validation rules (6+ characters, must include letters)
2. **simpleValidation.test.js** - Tests for form validation logic (email format, password matching)
3. **emailVerificationLogic.test.js** - Tests for email verification workflow
4. **authFunctions.test.js** - Comprehensive auth functions test suite
5. **welcomeFlow.test.js** - Tests for welcome page navigation after signup

## Running Tests

To run all tests:
```bash
npm test
```

To run specific test files:
```bash
npm test -- __tests__/passwordValidation.test.js
npm test -- __tests__/emailVerificationLogic.test.js
npm test -- __tests__/authFunctions.test.js
npm test -- __tests__/welcomeFlow.test.js
```

## Test Approach

These tests focus on the business logic of the authentication system rather than UI interactions. This approach has several advantages:

1. **Reliability**: Tests are less prone to breaking due to UI changes
2. **Speed**: Tests run much faster without rendering full components
3. **Isolation**: Business logic is tested independently of UI implementation

## What's Covered

### Password Validation
- Minimum length (6 characters)
- Must contain at least one letter
- Must contain at least one number
- Complex password validation

### Email Validation
- Format validation
- Custom validation rules

### Form Validation
- Field validation
- Cross-field validation (password matching)
- Complete form submission validation

### Login Functionality
- Successful login
- Failed login (wrong credentials)
- Email verification requirements

### Signup Functionality
- Successful registration
- Validation of all input fields
- Handling duplicate email addresses

### Email Verification Flow
- Login attempts with unverified accounts
- Email verification process
- Resending verification emails
- Complete verification workflow

### Welcome Page Flow
- First-time user welcome experience
- Sliding through welcome content
- Skipping welcome flow ("Not for now" option)
- Navigation to home page after completion
- Persistence of welcome completion status

## Adding New Tests

To add new tests, follow the pattern in the existing test files:

1. Create a new test file in the `__tests__` directory with a `.test.js` extension
2. Import any necessary modules
3. Write your tests using Jest's describe/test syntax
4. Run your tests with `npm test -- __tests__/your-test-file.js`

## Tips for Writing Good Tests

1. Focus on testing business logic, not UI components
2. Keep tests isolated from each other
3. Use descriptive test names
4. Test both success and failure cases
5. Mock external dependencies 