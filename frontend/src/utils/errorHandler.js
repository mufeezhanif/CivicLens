/**
 * Centralized Error Handler Utility
 * Provides user-friendly error messages and optional toast display
 */

// Error message mappings for common HTTP status codes
const HTTP_ERROR_MESSAGES = {
  400: 'The request was invalid. Please check your input and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You don\'t have permission to perform this action.',
  404: 'The requested resource was not found.',
  408: 'The request timed out. Please try again.',
  409: 'A conflict occurred. The resource may have been modified.',
  422: 'The submitted data is invalid. Please review and correct it.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'An internal server error occurred. Please try again later.',
  502: 'The server is temporarily unavailable. Please try again.',
  503: 'The service is currently unavailable. Please try again later.',
  504: 'The server took too long to respond. Please try again.',
};

// Network-related error messages
const NETWORK_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  TIMEOUT: 'The request timed out. Please check your connection and try again.',
  OFFLINE: 'You appear to be offline. Please check your internet connection.',
  FETCH_FAILED: 'Failed to fetch data. Please try again.',
};

// Common error patterns and their friendly messages
const ERROR_PATTERNS = [
  { pattern: /network/i, message: NETWORK_ERROR_MESSAGES.NETWORK_ERROR },
  { pattern: /timeout/i, message: NETWORK_ERROR_MESSAGES.TIMEOUT },
  { pattern: /fetch/i, message: NETWORK_ERROR_MESSAGES.FETCH_FAILED },
  { pattern: /jwt|token.*expired|unauthorized/i, message: HTTP_ERROR_MESSAGES[401] },
  { pattern: /forbidden|permission/i, message: HTTP_ERROR_MESSAGES[403] },
  { pattern: /not found/i, message: HTTP_ERROR_MESSAGES[404] },
  { pattern: /validation|invalid/i, message: HTTP_ERROR_MESSAGES[422] },
  { pattern: /rate limit|too many/i, message: HTTP_ERROR_MESSAGES[429] },
];

/**
 * Extract error message from various error formats
 * @param {Error|Object|string} error - The error to extract message from
 * @returns {string} - Extracted error message
 */
export function extractErrorMessage(error) {
  // Handle null/undefined
  if (!error) return 'An unknown error occurred';

  // Handle string errors
  if (typeof error === 'string') return error;

  // Handle Axios/Fetch response errors
  if (error.response) {
    const { data, status } = error.response;
    
    // Try to get message from response data
    if (data) {
      if (typeof data === 'string') return data;
      if (data.message) return data.message;
      if (data.error) return typeof data.error === 'string' ? data.error : data.error.message;
      if (data.errors && Array.isArray(data.errors)) {
        return data.errors.map(e => e.message || e.msg || e).join(', ');
      }
    }
    
    // Fall back to status-based message
    if (status && HTTP_ERROR_MESSAGES[status]) {
      return HTTP_ERROR_MESSAGES[status];
    }
  }

  // Handle standard Error objects
  if (error.message) return error.message;
  if (error.error) return typeof error.error === 'string' ? error.error : error.error.message;

  // Handle validation errors array
  if (error.errors && Array.isArray(error.errors)) {
    return error.errors.map(e => e.message || e.msg || e).join(', ');
  }

  // Final fallback
  return 'An unexpected error occurred';
}

/**
 * Get user-friendly error message
 * @param {Error|Object|string} error - The error object
 * @returns {string} - User-friendly error message
 */
export function getFriendlyErrorMessage(error) {
  const rawMessage = extractErrorMessage(error);
  
  // Check if offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return NETWORK_ERROR_MESSAGES.OFFLINE;
  }

  // Check for HTTP status code
  const statusCode = error?.response?.status || error?.status || error?.statusCode;
  if (statusCode && HTTP_ERROR_MESSAGES[statusCode]) {
    return HTTP_ERROR_MESSAGES[statusCode];
  }

  // Check against known error patterns
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(rawMessage)) {
      return message;
    }
  }

  // Return the raw message if it's user-friendly enough (not a stack trace)
  if (rawMessage && !rawMessage.includes('at ') && rawMessage.length < 200) {
    return rawMessage;
  }

  return 'Something went wrong. Please try again.';
}

/**
 * Determine error severity level
 * @param {Error|Object} error - The error object
 * @returns {'info'|'warning'|'error'} - Error severity
 */
export function getErrorSeverity(error) {
  const statusCode = error?.response?.status || error?.status || error?.statusCode;
  
  // Info level (user can fix)
  if ([400, 401, 403, 404, 422].includes(statusCode)) {
    return 'warning';
  }
  
  // Critical errors (server issues)
  if ([500, 502, 503, 504].includes(statusCode)) {
    return 'error';
  }
  
  // Rate limiting
  if (statusCode === 429) {
    return 'info';
  }
  
  return 'error';
}

/**
 * Check if error requires re-authentication
 * @param {Error|Object} error - The error object
 * @returns {boolean}
 */
export function isAuthError(error) {
  const statusCode = error?.response?.status || error?.status || error?.statusCode;
  return statusCode === 401;
}

/**
 * Check if error is a network/connectivity issue
 * @param {Error|Object} error - The error object
 * @returns {boolean}
 */
export function isNetworkError(error) {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    !navigator.onLine ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ENOTFOUND' ||
    error?.code === 'ERR_NETWORK'
  );
}

/**
 * Check if error should be retried
 * @param {Error|Object} error - The error object
 * @returns {boolean}
 */
export function shouldRetry(error) {
  const statusCode = error?.response?.status || error?.status || error?.statusCode;
  
  // Network errors can be retried
  if (isNetworkError(error)) return true;
  
  // Server errors (except 401/403/404) can be retried
  if (statusCode >= 500 || statusCode === 429 || statusCode === 408) {
    return true;
  }
  
  return false;
}

/**
 * Create a standardized error response object
 * @param {Error|Object|string} error - The error
 * @returns {Object} Standardized error object
 */
export function createErrorResponse(error) {
  return {
    message: getFriendlyErrorMessage(error),
    rawMessage: extractErrorMessage(error),
    severity: getErrorSeverity(error),
    statusCode: error?.response?.status || error?.status || error?.statusCode,
    isAuthError: isAuthError(error),
    isNetworkError: isNetworkError(error),
    shouldRetry: shouldRetry(error),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Default toast handler (to be overridden by app)
 */
let toastHandler = null;

/**
 * Set the toast handler function
 * @param {Function} handler - Toast function (message, type) => void
 */
export function setToastHandler(handler) {
  toastHandler = handler;
}

/**
 * Show error as toast notification
 * @param {Error|Object|string} error - The error
 * @param {Object} options - Toast options
 * @param {boolean} options.showRawMessage - Show raw message instead of friendly
 * @param {number} options.duration - Toast duration in ms
 */
export function showErrorToast(error, options = {}) {
  const { showRawMessage = false, duration } = options;
  
  if (!toastHandler) {
    console.error('[ErrorHandler] Toast handler not configured:', error);
    return;
  }

  const message = showRawMessage 
    ? extractErrorMessage(error) 
    : getFriendlyErrorMessage(error);
  
  const severity = getErrorSeverity(error);
  
  toastHandler(message, severity, duration);
}

/**
 * Handle API error with optional toast display
 * @param {Error|Object} error - The error
 * @param {Object} options - Handler options
 * @param {boolean} options.showToast - Show toast notification
 * @param {Function} options.onAuthError - Callback for auth errors
 * @param {Function} options.onNetworkError - Callback for network errors
 * @returns {Object} Standardized error response
 */
export function handleApiError(error, options = {}) {
  const { 
    showToast = true, 
    onAuthError,
    onNetworkError,
  } = options;

  const errorResponse = createErrorResponse(error);

  // Log for debugging
  if (import.meta.env?.DEV) {
    console.error('[API Error]', errorResponse);
  }

  // Handle specific error types
  if (errorResponse.isAuthError && onAuthError) {
    onAuthError(errorResponse);
  }
  
  if (errorResponse.isNetworkError && onNetworkError) {
    onNetworkError(errorResponse);
  }

  // Show toast if enabled
  if (showToast) {
    showErrorToast(error);
  }

  return errorResponse;
}

/**
 * Async error handler wrapper for try-catch
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Error handling options
 * @returns {Promise<[data, error]>} Tuple of [data, error]
 */
export async function tryCatch(asyncFn, options = {}) {
  try {
    const data = await asyncFn();
    return [data, null];
  } catch (error) {
    const errorResponse = handleApiError(error, options);
    return [null, errorResponse];
  }
}

export default {
  extractErrorMessage,
  getFriendlyErrorMessage,
  getErrorSeverity,
  isAuthError,
  isNetworkError,
  shouldRetry,
  createErrorResponse,
  setToastHandler,
  showErrorToast,
  handleApiError,
  tryCatch,
};
