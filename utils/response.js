/**
 * Helper function to create standardized API responses
 */
const createResponse = (success, data = null, message = null, error = null) => {
  return {
    success,
    data,
    message,
    error
  };
};

const successResponse = (data, message = null) => {
  return createResponse(true, data, message, null);
};

const errorResponse = (error, message = null) => {
  return createResponse(false, null, message, error);
};

module.exports = {
  createResponse,
  successResponse,
  errorResponse
};

