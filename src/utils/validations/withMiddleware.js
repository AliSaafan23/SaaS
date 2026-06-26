import { validationResult } from "express-validator";

/**
 * Middleware to handle express-validator validations
 * @param {Array} validations - Array of validation rules
 * @returns {Function} - Express middleware function
 */
export const withMiddleware = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // If there are validation errors, return the first one
      const firstError = errors.array()[0];

      // Check if the error message is an object (from errorRes)
      if (typeof firstError.msg === "object" && firstError.msg !== null) {
        // If it's an errorRes object, extract the message
        return res.status(400).json({
          success: false,
          message: firstError.msg.message || "Validation error",
          field: firstError.param,
        });
      } else {
        // Regular string error message
        return res.status(400).json({
          success: false,
          message: firstError.msg,
          field: firstError.param,
        });
      }
    }

    // No validation errors, continue to the next middleware
    next();
  };
};
