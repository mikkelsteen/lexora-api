/**
 * @fileoverview Response handler utility for standardizing API responses
 */

const ServiceResponseStatus = {
  SUCCESS: "success",
  ERROR: "error",
};

const ServiceErrorTypes = {
  NETWORK_ERROR: "network_error",
  AUTH_ERROR: "auth_error",
  VALIDATION_ERROR: "validation_error",
  NOT_FOUND: "not_found",
  SERVER_ERROR: "server_error",
};

class AppError extends Error {
  constructor(
    message,
    errorType = ServiceErrorTypes.SERVER_ERROR,
    statusCode = 500
  ) {
    super(message);
    this.errorType = errorType;
    this.statusCode = statusCode;
  }
}

/**
 * Creates a success response object
 * @param {any} data - The data to be sent in the response
 * @param {string} message - Optional success message
 * @returns {Object} Standardized success response object
 */
const successResponse = (data, message = "") => ({
  status: ServiceResponseStatus.SUCCESS,
  data,
  message,
});

/**
 * Creates an error response object
 * @param {string} message - Error message
 * @param {string} errorType - Type of error from ServiceErrorTypes
 * @returns {Object} Standardized error response object
 */
const errorResponse = (
  message,
  errorType = ServiceErrorTypes.SERVER_ERROR
) => ({
  status: ServiceResponseStatus.ERROR,
  error: {
    type: errorType,
    message,
  },
});

// HTTP status code mapping to error types
const errorTypeStatusMap = {
  [ServiceErrorTypes.NETWORK_ERROR]: 503,
  [ServiceErrorTypes.AUTH_ERROR]: 401,
  [ServiceErrorTypes.VALIDATION_ERROR]: 400,
  [ServiceErrorTypes.NOT_FOUND]: 404,
  [ServiceErrorTypes.SERVER_ERROR]: 500,
};

module.exports = {
  ServiceResponseStatus,
  ServiceErrorTypes,
  AppError,
  successResponse,
  errorResponse,
  errorTypeStatusMap,
};
