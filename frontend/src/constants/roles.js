/**
 * User Roles Constants
 * Matches backend roles hierarchy
 */

export const ROLES = {
  CITIZEN: 'citizen',
  UC_CHAIRMAN: 'uc_chairman',
  TOWN_CHAIRMAN: 'town_chairman',
  MAYOR: 'mayor',
  WEBSITE_ADMIN: 'website_admin',
  // Aliases for convenience
  ADMIN: 'website_admin',
  TOWNSHIP_OFFICER: 'town_chairman',
};

// Role hierarchy for permission checks
export const ROLE_HIERARCHY = {
  [ROLES.CITIZEN]: 1,
  [ROLES.UC_CHAIRMAN]: 2,
  [ROLES.TOWN_CHAIRMAN]: 3,
  [ROLES.MAYOR]: 4,
  [ROLES.WEBSITE_ADMIN]: 5,
};

export default ROLES;
