/**
 * Custom application error class that includes status code information
 * Used for handling operational errors like authentication failures
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Provides different error responses based on environment and error type
 * Authentication errors typically have 401/403 status codes and are marked as operational
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    // Development mode: include full error details
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production mode: hide implementation details
    if (err.isOperational) {
      // Expected errors (like auth failures): show message
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Unexpected errors: hide details
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
      });
    }
  }
};

module.exports = {
  AppError,
  errorHandler
}; 