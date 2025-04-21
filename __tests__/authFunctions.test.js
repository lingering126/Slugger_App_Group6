// Tests for authentication functionality without UI dependencies

describe('Authentication Functions', () => {
  // Mock email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Mock password validation function
  const validatePassword = (password) => {
    const hasMinLength = password.length >= 6;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    const isValid = hasMinLength && hasLetter && hasNumber;
    
    // Return validation result with error messages
    return {
      isValid,
      errors: [
        !hasMinLength ? 'Password must be at least 6 characters long' : null,
        !hasLetter ? 'Password must contain at least one letter' : null,
        !hasNumber ? 'Password must contain at least one number' : null
      ].filter(Boolean)
    };
  };
  
  // Mock a user "database"
  const mockUsers = [
    { email: 'test@example.com', password: 'Password123', verified: true },
    { email: 'unverified@example.com', password: 'Password123', verified: false }
  ];
  
  // Mock login function
  const login = (email, password) => {
    // Validate email format
    if (!validateEmail(email)) {
      return { success: false, message: 'Invalid email format' };
    }
    
    // Find user
    const user = mockUsers.find(u => u.email === email);
    
    // User not found
    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    // Password doesn't match
    if (user.password !== password) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    // Email not verified
    if (!user.verified) {
      return { 
        success: false, 
        message: 'Email verification required',
        requiresVerification: true,
        email: user.email
      };
    }
    
    // Success
    return { 
      success: true, 
      message: 'Login successful',
      user: { email: user.email }
    };
  };
  
  // Mock signup function
  const signup = (email, password, confirmPassword) => {
    // Validate email format
    if (!validateEmail(email)) {
      return { success: false, message: 'Invalid email format' };
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return { 
        success: false, 
        message: passwordValidation.errors[0],
        errors: passwordValidation.errors
      };
    }
    
    // Validate password matching
    if (password !== confirmPassword) {
      return { success: false, message: 'Passwords do not match' };
    }
    
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      return { success: false, message: 'Email already in use' };
    }
    
    // Success - in a real system, we would save the user to a database
    return { 
      success: true, 
      message: 'Signup successful. Please verify your email.',
      requiresVerification: true,
      email
    };
  };
  
  // Tests for email validation
  describe('Email Validation', () => {
    test('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('name+tag@example.org')).toBe(true);
    });
    
    test('should reject incorrect email formats', () => {
      expect(validateEmail('plainaddress')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test@domain')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user name@example.com')).toBe(false);
    });
  });
  
  // Tests for password validation
  describe('Password Validation', () => {
    test('should validate strong passwords', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    test('should reject short passwords', () => {
      const result = validatePassword('Pw1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 6 characters long');
    });
    
    test('should reject passwords without letters', () => {
      const result = validatePassword('123456');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one letter');
    });
    
    test('should reject passwords without numbers', () => {
      const result = validatePassword('Password');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });
  });
  
  // Tests for login function
  describe('Login Function', () => {
    test('should successfully log in with valid credentials', () => {
      const result = login('test@example.com', 'Password123');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.user.email).toBe('test@example.com');
    });
    
    test('should reject login with invalid email format', () => {
      const result = login('invalid-email', 'Password123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email format');
    });
    
    test('should reject login with wrong password', () => {
      const result = login('test@example.com', 'WrongPassword123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email or password');
    });
    
    test('should reject login for non-existent user', () => {
      const result = login('nonexistent@example.com', 'Password123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email or password');
    });
    
    test('should reject login for unverified email', () => {
      const result = login('unverified@example.com', 'Password123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Email verification required');
      expect(result.requiresVerification).toBe(true);
      expect(result.email).toBe('unverified@example.com');
    });
  });
  
  // Tests for signup function
  describe('Signup Function', () => {
    test('should successfully register with valid information', () => {
      const result = signup('new@example.com', 'Password123', 'Password123');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Signup successful. Please verify your email.');
      expect(result.requiresVerification).toBe(true);
      expect(result.email).toBe('new@example.com');
    });
    
    test('should reject signup with invalid email format', () => {
      const result = signup('invalid-email', 'Password123', 'Password123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email format');
    });
    
    test('should reject signup with too short password', () => {
      const result = signup('new@example.com', 'Pw1', 'Pw1');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Password must be at least 6 characters long');
    });
    
    test('should reject signup with password lacking letters', () => {
      const result = signup('new@example.com', '123456', '123456');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Password must contain at least one letter');
    });
    
    test('should reject signup with password lacking numbers', () => {
      const result = signup('new@example.com', 'Password', 'Password');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Password must contain at least one number');
    });
    
    test('should reject signup with mismatched passwords', () => {
      const result = signup('new@example.com', 'Password123', 'DifferentPassword123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Passwords do not match');
    });
    
    test('should reject signup with already existing email', () => {
      const result = signup('test@example.com', 'Password123', 'Password123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Email already in use');
    });
  });
}); 