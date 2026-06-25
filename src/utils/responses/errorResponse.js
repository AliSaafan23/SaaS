/**
 * Error Response Utility
 * Provides standardized error response format
 */

export const errorRes = {
  /**
   * Creates a standardized error response object
   * @param {string} status - Error status (fail, error)
   * @param {string} message - Error message
   * @param {number} code - HTTP status code (default: 400)
   * @param {Object} data - Additional error data (optional)
   * @returns {Object} Error response object
   */
  responseError(status = 'fail', message = 'Bad Request', code = 400, data = null) {
    return {
      status,
      message,
      code,
      data
    };
  }
};
