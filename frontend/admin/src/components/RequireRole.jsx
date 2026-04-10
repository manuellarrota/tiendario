import { Navigate } from 'react-router-dom';
import AuthService from '../services/auth.service';

/**
 * Route guard that checks authentication and optional role requirements.
 *
 * - If not logged in → redirects to / (landing page where login is embedded)
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

    // Not authenticated at all → go to landing page
    if (!user || !user.token) {
        return <Navigate to="/" replace />;
    }

    // Role check (only if specific roles are required)
    if (roles && roles.length > 0) {
        const userRoles = user.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));
        if (!hasRole) {
            // Redirect based on what they ARE
            if (userRoles.includes('ROLE_CLIENT')) {
                window.location.href = import.meta.env.VITE_MARKET_URL || 'http://localhost:8080';
                return null;
            }
            if (userRoles.includes('ROLE_MANAGER')) {
                return <Navigate to="/dashboard" replace />;
            }
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default RequireRole;
