/**
 * Authentication & Authorization Middleware
 */

const authService = require('../services/authService');
const User = require('../models/User');
const { AppError, asyncHandler } = require('./errorHandler');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Protect routes - Requires authentication
 * Verifies JWT token and attaches user to request
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check for token in cookies (for web clients)
  if (!token && req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  
  if (!token) {
    throw new AppError(
      'You are not logged in. Please login to access this resource.',
      HTTP_STATUS.UNAUTHORIZED
    );
  }
  
  try {
    // Verify token
    const decoded = authService.verifyAccessToken(token);
    
    // Get user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new AppError(
        'The user belonging to this token no longer exists.',
        HTTP_STATUS.UNAUTHORIZED
      );
    }
    
    // Check if user is active
    if (!user.isActive) {
      throw new AppError(
        'Your account has been deactivated. Please contact support.',
        HTTP_STATUS.UNAUTHORIZED
      );
    }
    
    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      throw new AppError(
        'Your password was recently changed. Please login again.',
        HTTP_STATUS.UNAUTHORIZED
      );
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.message === 'Access token expired') {
      throw new AppError(
        'Your session has expired. Please login again.',
        HTTP_STATUS.UNAUTHORIZED
      );
    }
    throw new AppError(
      error.message || 'Invalid token. Please login again.',
      HTTP_STATUS.UNAUTHORIZED
    );
  }
});

/**
 * Optional authentication - Attaches user if token present, but doesn't require it
 * Useful for routes that show different content to logged-in users
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return next();
  }
  
  try {
    const decoded = authService.verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive && !user.changedPasswordAfter(decoded.iat)) {
      req.user = user;
      req.token = token;
    }
  } catch (error) {
    // Token invalid - continue without user
  }
  
  next();
});

/**
 * Role-based authorization
 * Restricts access to specified roles
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          'You are not logged in. Please login to access this resource.',
          HTTP_STATUS.UNAUTHORIZED
        )
      );
    }
    
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action.',
          HTTP_STATUS.FORBIDDEN
        )
      );
    }
    
    next();
  };
};

/**
 * Require email verification
 * Blocks access for unverified users
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError(
        'You are not logged in. Please login to access this resource.',
        HTTP_STATUS.UNAUTHORIZED
      )
    );
  }
  
  if (!req.user.isVerified) {
    return next(
      new AppError(
        'Please verify your email address to access this resource.',
        HTTP_STATUS.FORBIDDEN
      )
    );
  }
  
  next();
};

/**
 * Rate limiting for authentication endpoints
 * Prevents brute force attacks
 */
const authRateLimiter = (() => {
  const attempts = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 5;
  
  // Clean up old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of attempts.entries()) {
      if (now - data.firstAttempt > WINDOW_MS) {
        attempts.delete(key);
      }
    }
  }, 60 * 1000); // Clean every minute
  
  return (req, res, next) => {
    const key = req.ip + ':' + (req.body.email || 'unknown');
    const now = Date.now();
    
    let data = attempts.get(key);
    
    if (!data) {
      data = { count: 0, firstAttempt: now };
      attempts.set(key, data);
    }
    
    // Reset if window has passed
    if (now - data.firstAttempt > WINDOW_MS) {
      data = { count: 0, firstAttempt: now };
      attempts.set(key, data);
    }
    
    data.count++;
    
    if (data.count > MAX_ATTEMPTS) {
      const retryAfter = Math.ceil((WINDOW_MS - (now - data.firstAttempt)) / 1000);
      res.set('Retry-After', retryAfter);
      
      return next(
        new AppError(
          `Too many login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
          HTTP_STATUS.TOO_MANY_REQUESTS || 429
        )
      );
    }
    
    // Reset on successful auth (called manually)
    req.resetRateLimit = () => {
      attempts.delete(key);
    };
    
    next();
  };
})();

/**
 * Check resource ownership
 * Allows access if user owns the resource or is admin
 * @param {string} resourceField - Field name containing owner ID
 */
const checkOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (req.user.role === 'website_admin') {
      return next();
    }
    
    const resourceOwnerId = req.resource?.[resourceField] || req.params[resourceField];
    
    if (!resourceOwnerId) {
      return next();
    }
    
    if (resourceOwnerId.toString() !== req.user._id.toString()) {
      return next(
        new AppError(
          'You do not have permission to access this resource.',
          HTTP_STATUS.FORBIDDEN
        )
      );
    }
    
    next();
  };
};

/**
 * Hierarchy-based access control (UC → Town → City)
 * Sets req.hierarchyFilter based on user role
 */
const hierarchyAccess = (req, res, next) => {
  // If no user (public/optionalAuth route), allow access to all public data
  if (!req.user) {
    req.hierarchyFilter = {};
    return next();
  }

  // Website admins can access everything
  if (req.user.role === 'website_admin') {
    req.hierarchyFilter = {};
    return next();
  }

  // Mayors see their city (or all if not assigned yet)
  if (req.user.role === 'mayor') {
    if (req.user.cityId) {
      req.hierarchyFilter = { cityId: req.user.cityId };
    } else {
      // No city assigned yet - allow access to all complaints
      req.hierarchyFilter = {};
    }
    return next();
  }

  // Town chairmen see their town (or all if not assigned yet)
  if (req.user.role === 'town_chairman') {
    if (req.user.townId) {
      req.hierarchyFilter = { townId: req.user.townId };
    } else {
      // No town assigned yet - allow access to all complaints
      req.hierarchyFilter = {};
    }
    return next();
  }

  // UC chairmen see their UC (or all if not assigned yet)
  if (req.user.role === 'uc_chairman') {
    if (req.user.ucId) {
      req.hierarchyFilter = { ucId: req.user.ucId };
    } else {
      // No UC assigned yet - allow access to all complaints
      req.hierarchyFilter = {};
    }
    return next();
  }

  // Citizens can view all public complaints
  if (req.user.role === 'citizen') {
    req.hierarchyFilter = {};
    return next();
  }

  // Unknown role - deny access
  return next(
    new AppError(
      'Invalid role. Access denied.',
      HTTP_STATUS.FORBIDDEN
    )
  );
};

/**
 * Check if user can access a specific UC
 */
const canAccessUC = (ucId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          'You are not logged in.',
          HTTP_STATUS.UNAUTHORIZED
        )
      );
    }

    // Website admins can access everything
    if (req.user.role === 'website_admin') {
      return next();
    }

    const UC = require('../models/UC');
    const uc = await UC.findById(ucId);

    if (!uc) {
      return next(new AppError('UC not found', 404));
    }

    // Mayor can access UCs in their city
    if (req.user.role === 'mayor' && uc.city.toString() === req.user.city?.toString()) {
      return next();
    }

    // Town chairman can access UCs in their town
    if (req.user.role === 'town_chairman' && uc.town.toString() === req.user.town?.toString()) {
      return next();
    }

    // UC chairman can access their own UC
    if (req.user.role === 'uc_chairman' && uc._id.toString() === req.user.uc?.toString()) {
      return next();
    }

    return next(
      new AppError(
        'You do not have permission to access this UC.',
        HTTP_STATUS.FORBIDDEN
      )
    );
  };
};

/**
 * Log authentication events
 */
const auditAuth = (action) => {
  return (req, res, next) => {
    const originalEnd = res.end;
    
    res.end = function(...args) {
      // Log auth event
      console.log(`[AUTH] ${action}`, {
        userId: req.user?._id,
        email: req.body?.email || req.user?.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
      });
      
      return originalEnd.apply(this, args);
    };
    
    next();
  };
};

const ROLE_HIERARCHY = {
  citizen: 0,
  uc_chairman: 1,
  town_chairman: 2,
  mayor: 3,
  website_admin: 4,
};

/**
 * Check if user has minimum role level
 * @param {string} minRole - Minimum required role
 */
const minRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          'You are not logged in. Please login to access this resource.',
          HTTP_STATUS.UNAUTHORIZED
        )
      );
    }
    
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    
    if (userLevel < requiredLevel) {
      return next(
        new AppError(
          'You do not have permission to perform this action.',
          HTTP_STATUS.FORBIDDEN
        )
      );
    }
    
    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  requireVerified,
  authRateLimiter,
  checkOwnership,
  hierarchyAccess,
  canAccessUC,
  auditAuth,
  minRole,
  ROLE_HIERARCHY,
};
