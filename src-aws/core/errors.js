/**
 * @fileoverview Custom Error Classes
 */

/**
 * Base error class for application errors
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error for validation failures
 */
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

/**
 * Error for not found resources
 */
class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

/**
 * Error for database operations
 */
class DatabaseError extends AppError {
    constructor(message, originalError) {
        super(message, 500);
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
}

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    DatabaseError
};