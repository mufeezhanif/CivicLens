/**
 * Application Constants
 */

const CATEGORIES = {
  WATER: 'Water',
  ELECTRICITY: 'Electricity',
  ROADS: 'Roads',
  SANITATION: 'Sanitation',
  SEWERAGE: 'Sewerage',
  STREET_LIGHTS: 'Street Lights',
  GARBAGE: 'Garbage',
  OTHER: 'Other',
};
const CATEGORY_LIST = Object.values(CATEGORIES);

const STATUS = {
  SUBMITTED: 'submitted',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REJECTED: 'rejected',
};
const STATUS_LIST = Object.values(STATUS);

const VALID_STATUS_TRANSITIONS = {
  [STATUS.SUBMITTED]: [STATUS.ACKNOWLEDGED, STATUS.REJECTED],
  [STATUS.ACKNOWLEDGED]: [STATUS.IN_PROGRESS, STATUS.REJECTED],
  [STATUS.IN_PROGRESS]: [STATUS.RESOLVED, STATUS.REJECTED],
  [STATUS.RESOLVED]: [STATUS.CLOSED],
  [STATUS.CLOSED]: [],
  [STATUS.REJECTED]: [],
};

const SOURCES = { WEB: 'web', MOBILE: 'mobile', WHATSAPP: 'whatsapp' };
const SOURCE_LIST = Object.values(SOURCES);

// Matches hierarchy: citizen → uc_chairman → town_chairman → mayor → website_admin
const ROLES = {
  CITIZEN: 'citizen',
  UC_CHAIRMAN: 'uc_chairman',
  TOWN_CHAIRMAN: 'town_chairman',
  MAYOR: 'mayor',
  WEBSITE_ADMIN: 'website_admin',
};
const ROLE_LIST = Object.values(ROLES);

const SEVERITY = { MIN: 1, MAX: 10, DEFAULT: 5, CRITICAL: 8, HIGH: 6, MEDIUM: 4 };
const PAGINATION = { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 20, MAX_LIMIT: 100 };
const GEO = { DEFAULT_RADIUS: 1000, MAX_RADIUS: 50000, MIN_RADIUS: 100 };
const UPLOAD = { MAX_FILE_SIZE: 5 * 1024 * 1024, MAX_FILES: 5, ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] };

const HTTP_STATUS = {
  OK: 200, CREATED: 201, NO_CONTENT: 204,
  BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403,
  NOT_FOUND: 404, CONFLICT: 409, TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
};

const TIME = {
  MS_PER_DAY: 86400000,
  MS_PER_HOUR: 3600000,
  MS_PER_MINUTE: 60000,
};

const SUCCESS_MESSAGES = {
  COMPLAINT_CREATED: 'Complaint submitted successfully',
  STATUS_UPDATED: 'Complaint status updated successfully',
};

module.exports = {
  CATEGORIES, CATEGORY_LIST,
  STATUS, STATUS_LIST, VALID_STATUS_TRANSITIONS,
  SOURCES, SOURCE_LIST,
  ROLES, ROLE_LIST,
  SEVERITY, PAGINATION, GEO, UPLOAD,
  HTTP_STATUS, TIME, SUCCESS_MESSAGES,
};
