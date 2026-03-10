import { Navigate } from 'react-router-dom';
import AuthService from '../services/auth.service';

/**
 * Route guard that checks authentication and optional role requirements.
 *
 * - If not logged in → redirects to / (landing page with login modal)
 * - If logged in but missing required role → redirects to /dashboard
 * - If OK → renders children
 *
 * Usage:
 *   // Only requires authentication (any logged-in user):
 *   <RequireRole><DashboardHome /></RequireRole>
 *
 *   // Requires a specific role:
 *   <RequireRole roles={['ROLE_ADMIN']}><AdminCompaniesPage /></RequireRole>
 */
const RequireRole = ({ roles, children }) => {
    const user = AuthService.getCurrentUser();

    // Not authenticated at all → go to landing/login
    if (!user || !user.token) {
        return <Navigate to="/" replace />;
    }

    // Role check (only if specific roles are required)
    if (roles && roles.length > 0) {
        const userRoles = user.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));
        if (!hasRole) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
};

export default RequireRole;
