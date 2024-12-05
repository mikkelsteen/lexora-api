/**
 * @fileoverview Global error handling middleware
 */

const {
  errorResponse,
  ServiceErrorTypes,
  errorTypeStatusMap,
} = require("../utils/response.handler");

const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res
      .status(400)
      .json(errorResponse(err.message, ServiceErrorTypes.VALIDATION_ERROR));
  }

  if (err.name === "UnauthorizedError") {
    return res
      .status(401)
      .json(errorResponse(err.message, ServiceErrorTypes.AUTH_ERROR));
  }

  // Handle custom AppError instances
  if (err.errorType) {
    const statusCode = errorTypeStatusMap[err.errorType] || 500;
    return res
      .status(statusCode)
      .json(errorResponse(err.message, err.errorType));
  }

  // Handle 404 errors
  if (err.status === 404) {
    return res
      .status(404)
      .json(
        errorResponse(
          err.message || "Resource not found",
          ServiceErrorTypes.NOT_FOUND
        )
      );
  }

  // Default server error
  const errorMsg =
    process.env.NODE_ENV === "development"
      ? err.message
      : "An unexpected error occurred";

  return res
    .status(500)
    .json(errorResponse(errorMsg, ServiceErrorTypes.SERVER_ERROR));
};

module.exports = errorHandler;
