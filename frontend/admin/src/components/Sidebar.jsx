import React, { useState, useEffect } from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import AuthService from '../services/auth.service';
import {
    FaHome, FaBox, FaShoppingBag, FaChartLine, FaSignOutAlt,
    FaTruck, FaHistory, FaTags, FaUsers, FaCog, FaBell, FaStore, FaBars, FaTimes, FaMoneyBillWave,
    FaChevronLeft, FaChevronRight, FaCashRegister // Added icons
} from 'react-icons/fa';
import NotificationService from '../services/notification.service';
import './Sidebar.css';

const Sidebar = () => {
    const user = AuthService.getCurrentUser();
    const isPremium = user?.subscriptionStatus === 'PAID';
    const isSuperAdmin = user?.roles?.includes('ROLE_ADMIN');
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    // Desktop collapse state
    const [collapsed, setCollapsed] = useState(localStorage.getItem('sidebar_collapsed') === 'true');

    useEffect(() => {
        let isMounted = true;
        if (user) {
            NotificationService.getUnreadCount()
                .then(res => {
                    if (isMounted && typeof res.data === 'number') {
                        setUnreadCount(res.data);
                    }
                })
                .catch(err => console.error("Notification Fetch Error:", err));

            const interval = setInterval(() => {
                NotificationService.getUnreadCount()
                    .then(res => {
                        if (isMounted && typeof res.data === 'number') {
                            setUnreadCount(res.data);
                        }
                    })
                    .catch(() => { });
            }, 30000);
            return () => {
                isMounted = false;
                clearInterval(interval);
            };
        }
    }, [user]);

    const handleLogout = () => {
        AuthService.logout();
        navigate('/login');
        window.location.reload();
    };

    const toggleSidebar = () => setIsOpen(!isOpen);

    const toggleDesktop = () => {
        const newState = !collapsed;
        setCollapsed(newState);
        localStorage.setItem('sidebar_collapsed', newState);
    };

    const NavItem = ({ to, icon: Icon, label, badge }) => (
        <NavLink
            to={to}
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-content-center px-0' : ''}`}
            onClick={(e) => {
                setIsOpen(false);
            }}
            title={collapsed ? label : ''} // Tooltip when collapsed
        >
            <Icon className="nav-icon" style={{ marginRight: collapsed ? 0 : '12px', fontSize: collapsed ? '1.2rem' : 'inherit' }} />
            {!collapsed && <span className="flex-grow-1">{label}</span>}
            {!collapsed && badge > 0 && <span className="notification-count">{badge}</span>}
            {collapsed && badge > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ transform: 'translate(-10px, 10px)' }}>•</span>}
        </NavLink>
    );

    const sidebarWidth = collapsed ? '80px' : '280px';

    return (
        <>
            {/* Mobile Toggle Button */}
            <button className="mobile-sidebar-toggle" onClick={toggleSidebar}>
                {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>

            {/* Sidebar Overlay for Mobile */}
            {isOpen && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
                    style={{ zIndex: 1999 }}
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Sidebar Container Wrapper to handle positioning context without clipping */}
            <div className={`sidebar-container ${collapsed ? 'collapsed-mode' : ''}`}
                style={{ width: sidebarWidth, minWidth: sidebarWidth, flexShrink: 0, position: 'relative', transition: 'all 0.3s ease', zIndex: 1000 }}>

                {/* Desktop Toggle Button - Now outside the scrollable sidebar */}
                <button
                    className="desktop-sidebar-toggle"
                    onClick={toggleDesktop}
                    style={{ display: window.innerWidth > 991 ? 'flex' : 'none' }}
                >
                    {collapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
                </button>

                <div className={`admin-sidebar ${isOpen ? 'mobile-open' : ''}`}
                    style={{ width: '100%', height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>

                    <div className="sidebar-header" style={{ padding: collapsed ? '20px 10px' : '30px' }}>
                        <Link to="/dashboard" className={`sidebar-logo ${collapsed ? 'justify-content-center' : ''}`}>
                            <div className="logo-icon">
                                <FaStore size={22} />
                            </div>
                            {!collapsed && <span>Tiendario</span>}
                        </Link>

                        <div className={`user-profile-summary text-center ${collapsed ? 'mt-2' : ''}`}>
                            {!collapsed && (
                                <div className="mb-2">
                                    <span className={isSuperAdmin ? 'premium-badge-v1 bg-dark text-white' : (isPremium ? 'premium-badge-v1' : 'free-badge-v1')}>
                                        {isSuperAdmin ? 'Super Admin' : (isPremium ? 'Plan Premium' : 'Versión Gratis')}
                                    </span>
                                </div>
                            )}
                            {!collapsed ? (
                                <small className="d-block text-dark opacity-75 fw-bold text-truncate px-2">
                                    {user?.username || 'Invitado'}
                                </small>
                            ) : (
                                <div className="mt-3 border-top pt-3">
                                    <small className="fw-bold text-uppercase" style={{ fontSize: '0.6rem' }}>
                                        {isSuperAdmin ? 'SA' : (isPremium ? 'PRO' : 'FREE')}
                                    </small>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-grow-1" style={{ overflowY: 'visible', padding: '0 10px' }}>

                        {isSuperAdmin ? (
                            <>
                                {!collapsed && <div className="nav-group-label">administración saas</div>}
                                <NavItem to="/dashboard" icon={FaChartLine} label="Métricas Globales" />
                                <NavItem to="/admin/companies" icon={FaStore} label="Gestión de Empresas" />
                                <NavItem to="/admin/payments" icon={FaMoneyBillWave} label="Validación de Pagos" />
                                <NavItem to="/admin/users" icon={FaUsers} label="Gestión de Usuarios" />
                                <NavItem to="/admin/config" icon={FaCog} label="Configuración SaaS" />
                            </>
                        ) : (
                            <>
                                {!collapsed && <div className="nav-group-label">Panel Principal</div>}
                                <NavItem to="/dashboard" icon={FaHome} label="Vistazo General" />
                                <NavItem to="/notifications" icon={FaBell} label="Notificaciones" badge={unreadCount} />

                                {!collapsed && <div className="nav-group-label">Operación Diaria</div>}
                                <NavItem to="/pos" icon={FaShoppingBag} label="Registro de Ventas" />
                                <NavItem to="/daily-closing" icon={FaCashRegister} label="Cierre de Caja / Turno" />
                                <NavItem to="/inventory" icon={FaBox} label="Stock e Inventario" />
                                <NavItem to="/categories" icon={FaTags} label="Categorías" />

                                {!collapsed && <div className="nav-group-label">Logística y CRM</div>}
                                <NavItem to="/purchases/new" icon={FaHistory} label="Registro de Compras" />
                                <NavItem to="/purchases/history" icon={FaHistory} label="Historial de Compras" />
                                <NavItem to="/suppliers" icon={FaTruck} label="Proveedores" />


                                {!collapsed && <div className="nav-group-label">Configuración y Auditoría</div>}
                                <NavItem to="/sales/history" icon={FaHistory} label="Gestión de Ventas" />
                                <NavItem to="/reports" icon={FaChartLine} label="Reportes" />
                                <NavItem to="/company" icon={FaCog} label="Ajustes de Tienda" />
                            </>
                        )}
                    </div>

                    <div className="sidebar-footer" style={{ padding: collapsed ? '20px 0' : '20px' }}>
                        <button className={`btn-logout-sidebar ${collapsed ? 'justify-content-center' : ''}`} onClick={handleLogout} title={collapsed ? "Cerrar Sesión" : ""}>
                            <FaSignOutAlt />
                            {!collapsed && <span>Cerrar Sesión</span>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
