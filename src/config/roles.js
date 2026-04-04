/**
 * Role definitions and permission matrix.
 * Single source of truth for all access control decisions.
 */

const ROLES = Object.freeze({
  VIEWER: "viewer",
  ANALYST: "analyst",
  ADMIN: "admin",
});

/**
 * Numeric hierarchy — higher = more privileged.
 * Used by requireMinRole middleware.
 */
const ROLE_HIERARCHY = Object.freeze({
  [ROLES.VIEWER]: 1,
  [ROLES.ANALYST]: 2,
  [ROLES.ADMIN]: 3,
});

/**
 * Explicit permission map per role.
 * Documents intent clearly — easy to extend.
 */
const PERMISSIONS = Object.freeze({
  // Records
  RECORDS_READ: [ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN],
  RECORDS_WRITE: [ROLES.ADMIN],
  RECORDS_DELETE: [ROLES.ADMIN],

  // Dashboard
  DASHBOARD_BASIC: [ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN],
  DASHBOARD_ANALYTICS: [ROLES.ANALYST, ROLES.ADMIN],

  // Users
  USERS_MANAGE: [ROLES.ADMIN],
});

/**
 * Check if a role has a specific permission.
 */
const hasPermission = (role, permission) => {
  return PERMISSIONS[permission]?.includes(role) ?? false;
};

module.exports = { ROLES, ROLE_HIERARCHY, PERMISSIONS, hasPermission };
