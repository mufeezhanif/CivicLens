/**
 * ProtectedRoute Component
 * Restricts access to routes based on authentication and role requirements
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLES } from '../contexts';

/**
 * ProtectedRoute - Wraps routes that require authentication
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string} props.requiredRole - Minimum role required (optional)
 * @param {string[]} props.allowedRoles - Specific roles allowed (optional)
 * @param {string} props.redirectTo - Redirect path for unauthorized users
 */
const ProtectedRoute = ({ 
  children, 
  requiredRole = null,
  allowedRoles = null,
  redirectTo = '/login' 
}) => {
  const { user, isAuthenticated, loading, hasRole, isRole } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-foreground/60 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    // Redirect to user's appropriate dashboard if they don't have permission
    return <Navigate to={getDashboardForRole(user?.role)} replace />;
  }

  // Check allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => isRole(role));
    if (!hasAllowedRole) {
      return <Navigate to={getDashboardForRole(user?.role)} replace />;
    }
  }

  return children;
};

/**
 * Get the appropriate dashboard path for a given role
 */
const getDashboardForRole = (role) => {
  const paths = {
    [ROLES.ADMIN]: '/admin/dashboard',
    [ROLES.MAYOR]: '/mayor/dashboard',
    [ROLES.TOWNSHIP_OFFICER]: '/official/dashboard',
    [ROLES.UC_CHAIRMAN]: '/official/dashboard',
  };
  return paths[role] || '/citizen/dashboard';
};

/**
 * PublicOnlyRoute - Redirects authenticated users to their dashboard
 * Use for login/register pages
 */
export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading, getDashboardPath } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath()} replace />;
  }

  return children;
};

/**
 * Role-specific route guards
 */
export const CitizenRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={[ROLES.CITIZEN, ROLES.ADMIN]}>
    {children}
  </ProtectedRoute>
);

export const UCChairmanRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={[ROLES.UC_CHAIRMAN, ROLES.ADMIN]}>
    {children}
  </ProtectedRoute>
);

export const TownshipRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={[ROLES.TOWNSHIP_OFFICER, ROLES.ADMIN]}>
    {children}
  </ProtectedRoute>
);

export const MayorRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={[ROLES.MAYOR, ROLES.ADMIN]}>
    {children}
  </ProtectedRoute>
);

export const AdminRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
    {children}
  </ProtectedRoute>
);

export const OfficialRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={[ROLES.UC_CHAIRMAN, ROLES.TOWNSHIP_OFFICER, ROLES.MAYOR, ROLES.ADMIN]}>
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;
