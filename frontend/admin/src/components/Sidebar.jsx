import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Nav, Badge, Modal, Button, Form, Alert, OverlayTrigger, Tooltip as BsTooltip } from 'react-bootstrap';
import {
    FaBars, FaTimes, FaChevronLeft, FaChevronRight, FaStore, FaChartLine,
    FaMoneyBillWave, FaUsers, FaCog, FaHome, FaBell, FaShoppingBag,
    FaCashRegister, FaBox, FaTags, FaHistory, FaTruck, FaSignOutAlt, FaRocket, FaUserTie, FaKey
} from 'react-icons/fa';
import AuthService from '../services/auth.service';
import NotificationService from '../services/notification.service';
import ShiftService from '../services/shift.service';
import AdminService from '../services/admin.service';

const Sidebar = () => {
    const user = AuthService.getCurrentUser();
    const isSuperAdmin = user?.roles?.includes('ROLE_ADMIN');
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadBreakdown, setUnreadBreakdown] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // Desktop collapse state
    const [collapsed, setCollapsed] = useState(localStorage.getItem('sidebar_collapsed') === 'true');

    useEffect(() => {
        let isMounted = true;
        if (user) {
            if (isSuperAdmin) {
                AdminService.getAdminUnreadCount()
                    .then(res => {
                        if (isMounted) {
                            if (typeof res.data === 'number') {
                                setUnreadCount(res.data);
                            } else if (res.data && res.data.total !== undefined) {
                                setUnreadCount(res.data.total);
                                setUnreadBreakdown(res.data.breakdown || {});
                            }
                        }
                    })
                    .catch(err => console.error("Admin Notification Fetch Error:", err));
            } else {
                NotificationService.getUnreadCount()
                    .then(res => {
                        if (isMounted && typeof res.data === 'number') {
                            setUnreadCount(res.data);
                        }
                    })
                    .catch(err => console.error("Notification Fetch Error:", err));
            }

            return () => {
                isMounted = false;
            };
        }
    }, [user?.id, isSuperAdmin]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const activeLink = document.querySelector('.sidebar-nav-link.active');
            if (activeLink) {
                activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    const handleLogout = async () => {
        if (user?.roles?.includes('ROLE_CASHIER') || user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN')) {
            try {
                const shiftRes = await ShiftService.getCurrentShift();
                if (shiftRes.status === 200 && shiftRes.data && shiftRes.data.status === 'OPEN') {
                    setShowLogoutModal(true);
                    return;
                }
            } catch (e) {
                // Continúa si no hay turno o hay error
            }
        }
        executeLogout();
    };

    const executeLogout = () => {
        AuthService.logout();
        window.location.href = '/';
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("Las contraseñas no coinciden");
            return;
        }
        setPasswordLoading(true);
        setPasswordError('');
        try {
            await AuthService.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
            setPasswordSuccess("Contraseña actualizada correctamente");
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordSuccess('');
                setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            }, 2000);
        } catch (err) {
            setPasswordError(err.response?.data?.message || "Error al cambiar la contraseña");
        } finally {
            setPasswordLoading(false);
        }
    };

    const toggleSidebar = () => setIsOpen(!isOpen);

    const getMarketUrl = () => {
        if (import.meta.env.VITE_MARKET_URL) {
            return import.meta.env.VITE_MARKET_URL;
        }
        const hostname = window.location.hostname;
        const port = window.location.port;
        if (port === '5174') return `http://${hostname}:5173`;
        if (port === '3001') return `http://${hostname}:3000`;
        return `https://${hostname.replace('admin.', '')}`;
    };

    const toggleDesktop = () => {
        const newState = !collapsed;
        setCollapsed(newState);
        localStorage.setItem('sidebar_collapsed', newState);
    };

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
                />
            )}

            <div
                className={`sidebar-container ${collapsed ? 'collapsed-mode' : ''}`}
                style={{ flexShrink: 0, transition: 'all 0.3s ease' }}
            >
                {/* Desktop Toggle Button */}
                <button
                    className="desktop-sidebar-toggle"
                    onClick={toggleDesktop}
                    style={{ display: window.innerWidth > 991 ? 'flex' : 'none' }}
                >
                    {collapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
                </button>

                <div
                    className={`admin-sidebar ${isOpen ? 'mobile-open' : ''}`}
                    style={{ width: '100%', height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}
                >
                    <div className="sidebar-header" style={{ padding: collapsed ? '20px 10px' : '20px' }}>
                        <div className="d-flex align-items-center justify-content-between w-100">
                            <Link to="/dashboard" className={`sidebar-logo ${collapsed ? 'justify-content-center' : ''}`}>
                                <div className="logo-icon">
                                    <FaStore size={22} />
                                </div>
                                {!collapsed && <span>Nugar</span>}
                            </Link>

                            {/* Mobile Close Button */}
                            <button className="d-lg-none btn border-0 p-1 text-muted" onClick={() => setIsOpen(false)}>
                                <FaTimes size={20} />
                            </button>
                        </div>

                        {!collapsed && (
                            <div className="user-profile-summary mt-3">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    {isSuperAdmin ? (
                                        <span className="premium-badge-v1 bg-dark text-white">Super Admin</span>
                                    ) : (
                                        <Badge bg={user?.subscriptionStatus === 'PAID' ? 'success' : 'warning'} className="rounded-pill px-2 py-1" style={{ fontSize: '0.6rem', letterSpacing: '0.5px' }}>
                                            {user?.subscriptionStatus === 'PAID' ? (user?.subscriptionPlan === 'PREMIUM' ? 'PREMIUM' : user?.subscriptionPlan === 'MEDIUM' ? 'MEDIO' : 'BÁSICO') : 'PRUEBA'}
                                        </Badge>
                                    )}
                                    <small className="fw-bold text-dark text-truncate" style={{ maxWidth: '120px' }}>
                                        {user?.username || 'Invitado'}
                                    </small>
                                </div>
                            </div>
                        )}

                        {collapsed && (
                            <div className="mt-3 border-top pt-3 text-center">
                                <small className="fw-bold text-uppercase" style={{ fontSize: '0.6rem' }}>
                                    {isSuperAdmin ? 'SA' : (user?.subscriptionStatus === 'PAID' ? (user?.subscriptionPlan === 'PREMIUM' ? 'PRM' : user?.subscriptionPlan === 'MEDIUM' ? 'MED' : 'BAS') : 'PRB')}
                                </small>
                            </div>
                        )}
                    </div>

                    <div className="flex-grow-1" style={{ overflowY: 'visible', padding: '0 10px' }}>

                        {isSuperAdmin ? (
                            <>
                                <NavItem to="/admin/onboarding" icon={FaRocket} label="Registrar Tienda" description="Wizard paso a paso para registrar un nuevo cliente." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/dashboard" icon={FaChartLine} label="Métricas Globales" description="Visualiza el estado de todo el ecosistema Nugar." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/admin/companies" icon={FaStore} label="Gestión de Empresas" description="Administra los comercios y sus suscripciones." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/admin/notifications" icon={FaBell} label="Notificaciones Globales" badge={unreadCount} breakdown={unreadBreakdown} description="Gestión de pagos y alertas de sistema." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/admin/catalog" icon={FaBox} label="Catálogo Global" description="Gestiona los registros maestros de productos unificados." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/admin/catalog-suggestions" icon={FaBox} label="Sugerencias Catálogo" description="Aprueba o rechaza nuevas imágenes y detalles de productos." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/admin/categories" icon={FaTags} label="Gestión Categorías" description="Panel maestro para crear, editar y moderar categorías." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/admin/payments" icon={FaMoneyBillWave} label="Validación de Pagos" description="Aprueba o rechaza los reportes de pago de los usuarios." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/admin/users" icon={FaUsers} label="Gestión de Usuarios" description="Control total sobre los accesos de usuarios al sistema." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/admin/config" icon={FaCog} label="Configuración SaaS" description="Ajusta precios, planes y mantenimiento del sistema." collapsed={collapsed} setIsOpen={setIsOpen} />
                            </>
                        ) : (
                            <>
                                {/* ── 1. OPERACIÓN DIARIA ───────────── */}
                                <NavGroup label="🟢 Operación Diaria" collapsed={collapsed} />
                                <NavItem to="/dashboard" icon={FaHome} label="Inicio / Dashboard" description="Resumen rápido de tus ventas y actividad reciente." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/pos" icon={FaShoppingBag} label="Punto de Venta" description="Realiza ventas rápidas en mostrador y genera tickets." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/notifications" icon={FaBell} label="Notificaciones" badge={unreadCount} description="Novedades, pedidos nuevos y alertas de sistema." collapsed={collapsed} setIsOpen={setIsOpen} />
                                <NavItem to="/sales/history" icon={FaHistory} label="Historial de Ventas" description="Monitorea el estado de tus ventas y pedidos pendientes." collapsed={collapsed} setIsOpen={setIsOpen} />
                                {(user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN')) && (
                                    <>
                                        <NavItem to="/daily-closing" icon={FaCashRegister} label="Control de Caja" description="Arqueo diario y balance de ingresos en efectivo/digital." collapsed={collapsed} setIsOpen={setIsOpen} />
                                        <NavItem to="/shifts/history" icon={FaHistory} label="Auditoría de Cajas" description="Revisa y verifica los reportes de turno de tus cajeros." collapsed={collapsed} setIsOpen={setIsOpen} />
                                    </>
                                )}

                                {/* ── 2. CATÁLOGO E INVENTARIO ───────────── */}
                                {(user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN')) && (
                                    <>
                                        <NavGroup label="📦 Inventario y Compras" collapsed={collapsed} />
                                        <NavItem to="/inventory" icon={FaBox} label="Inventario" description="Controla stocks, precios, imágenes y exportación." collapsed={collapsed} setIsOpen={setIsOpen} />
                                        <NavItem to="/categories" icon={FaTags} label="Categorías" description="Mira las categorías globales y sugiere nuevas para el catálogo." collapsed={collapsed} setIsOpen={setIsOpen} />
                                        <NavItem to="/purchases/new" icon={FaTruck} label="Comprar Mercancía" description="Registra compras a proveedores y suma al stock." collapsed={collapsed} setIsOpen={setIsOpen} />
                                        <NavItem to="/purchases/history" icon={FaHistory} label="Historial de Compras" description="Revisa cuándo y a cuánto compraste tus productos." collapsed={collapsed} setIsOpen={setIsOpen} />
                                    </>
                                )}

                                {/* ── 3. CONTACTOS ───────────── */}
                                <NavGroup label="👥 Contactos" collapsed={collapsed} />
                                <NavItem to="/customers" icon={FaUsers} label="Clientes" description="Directorio y base de datos de tus clientes." collapsed={collapsed} setIsOpen={setIsOpen} />
                                {(user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN')) && (
                                    <>
                                        <NavItem to="/suppliers" icon={FaUsers} label="Proveedores" description="Guarda los datos de contacto de quienes te surten." collapsed={collapsed} setIsOpen={setIsOpen} />
                                        <NavItem to="/staff" icon={FaUserTie} label="Mis Empleados" description="Administra cajeros y accesos de personal." collapsed={collapsed} setIsOpen={setIsOpen} />
                                    </>
                                )}

                                {/* ── 4. ADMINISTRACIÓN Y ANÁLISIS ───────────── */}
                                <NavGroup label="⚙️ Administración" collapsed={collapsed} />
                                {(user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN')) && (
                                    <>
                                        <NavItem to="/reports" icon={FaChartLine} label="Reportes" description="Analítica avanzada, productos más vendidos y ganancias." collapsed={collapsed} setIsOpen={setIsOpen} />
                                        <NavItem to="/company" icon={FaCog} label="Ajustes de Tienda" description="Configura los detalles de tu negocio." collapsed={collapsed} setIsOpen={setIsOpen} />
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    <div className="sidebar-footer d-flex flex-column gap-2" style={{ padding: collapsed ? '20px 0' : '20px' }}>
                        <OverlayTrigger placement="right" overlay={collapsed ? <BsTooltip>Visitar Marketplace</BsTooltip> : <></>}>
                            <button
                                className={`btn-logout-sidebar ${collapsed ? 'justify-content-center' : ''}`}
                                style={{ background: 'transparent', color: '#6c757d', border: '1px solid #dee2e6' }}
                                onClick={() => window.open(getMarketUrl(), '_blank')}
                            >
                                <FaStore />
                                {!collapsed && <span>Ir al Market</span>}
                            </button>
                        </OverlayTrigger>

                        <OverlayTrigger placement="right" overlay={collapsed ? <BsTooltip>Cambiar Contraseña</BsTooltip> : <></>}>
                            <button
                                className={`btn-logout-sidebar ${collapsed ? 'justify-content-center' : ''}`}
                                style={{ background: 'transparent', color: '#6c757d', border: '1px solid #dee2e6' }}
                                onClick={() => setShowPasswordModal(true)}
                            >
                                <FaKey />
                                {!collapsed && <span>Cambiar Contraseña</span>}
                            </button>
                        </OverlayTrigger>

                        <OverlayTrigger placement="right" overlay={collapsed ? <BsTooltip>Cerrar Sesión</BsTooltip> : <></>}>
                            <button
                                className={`btn-logout-sidebar ${collapsed ? 'justify-content-center' : ''}`}
                                onClick={handleLogout}
                            >
                                <FaSignOutAlt />
                                {!collapsed && <span>Cerrar Sesión</span>}
                            </button>
                        </OverlayTrigger>
                    </div>
                </div>
            </div>

            {/* Logout with Open Shift Modal */}
            <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered>
                <Modal.Body className="text-center p-5">
                    <div className="mb-4">
                        <div className="rounded-circle bg-warning bg-opacity-10 d-inline-flex p-4">
                            <FaCashRegister size={40} className="text-warning" />
                        </div>
                    </div>
                    <h4 className="fw-bold mb-3">⚠️ Turno de Caja Abierto</h4>
                    <p className="text-secondary mb-4">
                        Tienes un turno de caja en curso bajo tu responsabilidad.<br/><br/>
                        Si cierras sesión ahora, tu caja quedará <strong>ABIERTA</strong> de forma segura para cuando regreses (ideal para el almuerzo).<br/><br/>
                        ¿Deseas salir del sistema temporalmente?
                    </p>
                    <div className="d-flex justify-content-center gap-3">
                        <Button variant="outline-secondary" className="px-4 rounded-pill fw-bold" onClick={() => setShowLogoutModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="warning" className="px-4 rounded-pill fw-bold text-dark" onClick={executeLogout}>
                            Sí, Salir Temporalmente
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Change Password Modal */}
            <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold"><FaKey className="me-2 text-primary" /> Cambiar Contraseña</Modal.Title>
                </Modal.Header>
                <Modal.Body className="px-4 pb-4">
                    {passwordError && <Alert variant="danger" className="py-2">{passwordError}</Alert>}
                    {passwordSuccess && <Alert variant="success" className="py-2">{passwordSuccess}</Alert>}
                    <Form onSubmit={handlePasswordChange}>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Contraseña Actual</Form.Label>
                            <Form.Control
                                type="password"
                                required
                                value={passwordForm.oldPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Nueva Contraseña</Form.Label>
                            <Form.Control
                                type="password"
                                required
                                minLength={6}
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold">Confirmar Nueva Contraseña</Form.Label>
                            <Form.Control
                                type="password"
                                required
                                minLength={6}
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit" className="w-100 rounded-pill fw-bold" disabled={passwordLoading}>
                            {passwordLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

// ─── NavGroup: section label ──────────────────────────────────────────────────
const NavGroup = ({ label, collapsed }) => {
    if (collapsed) {
        return <div style={{ margin: '10px 0', borderTop: '1px solid #e2e8f0' }} />;
    }
    return (
        <div style={{
            padding: '14px 16px 4px',
            fontSize: '0.65rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#94a3b8',
        }}>
            {label}
        </div>
    );
};

// ─── NavItem: link with portal tooltip ───────────────────────────────────────
const NavItem = ({ to, icon: Icon, label, badge, breakdown, description, collapsed, setIsOpen }) => {
    const [tooltipStyle, setTooltipStyle] = useState(null);
    const ref = useRef(null);
    const hoverTimeout = useRef(null);

    const showTooltip = () => {
        hoverTimeout.current = setTimeout(() => {
            if (ref.current) {
                const rect = ref.current.getBoundingClientRect();
                setTooltipStyle({
                    top: rect.top + rect.height / 2,
                    left: rect.right + 10,
                });
            }
        }, 400);
    };

    const hideTooltip = () => {
        clearTimeout(hoverTimeout.current);
        setTooltipStyle(null);
    };

    return (
        <>
            <NavLink
                ref={ref}
                to={to}
                className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-content-center px-0' : ''}`
                }
                title={!collapsed ? description : undefined}
                onClick={() => { setIsOpen(false); hideTooltip(); }}
                onMouseEnter={collapsed ? showTooltip : null}
                onMouseLeave={collapsed ? hideTooltip : null}
            >
                <Icon
                    className="nav-icon"
                    style={{ marginRight: collapsed ? 0 : '12px', fontSize: collapsed ? '1.2rem' : 'inherit' }}
                />
                {!collapsed && <span className="flex-grow-1">{label}</span>}
                {!collapsed && badge > 0 && !breakdown && <span className="notification-count">{badge}</span>}
                {!collapsed && breakdown && Object.keys(breakdown).length > 0 && (
                    <OverlayTrigger
                        placement="right"
                        overlay={
                            <BsTooltip>
                                <div className="text-start">
                                    <div><span className="text-success">●</span> Pagos/Membresías</div>
                                    <div><span className="text-warning">●</span> Novedades</div>
                                    <div><span className="text-danger">●</span> Alertas Críticas</div>
                                </div>
                            </BsTooltip>
                        }
                    >
                        <div className="d-flex gap-1 align-items-center">
                            {(breakdown['PAYMENT'] > 0 || breakdown['SUBSCRIPTION_PAYMENT'] > 0) ? (
                                <Badge bg="success" pill style={{ fontSize: '0.65rem' }}>{(breakdown['PAYMENT'] || 0) + (breakdown['SUBSCRIPTION_PAYMENT'] || 0)}</Badge>
                            ) : null}
                            {breakdown['NEWS'] > 0 && (
                                <Badge bg="warning" text="dark" pill style={{ fontSize: '0.65rem' }}>{breakdown['NEWS']}</Badge>
                            )}
                            {breakdown['SYSTEM_ALERT'] > 0 && (
                                <Badge bg="danger" pill style={{ fontSize: '0.65rem' }}>{breakdown['SYSTEM_ALERT']}</Badge>
                            )}
                        </div>
                    </OverlayTrigger>
                )}
                {collapsed && badge > 0 && (
                    <span
                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                        style={{ transform: 'translate(-10px, 10px)' }}
                    >•</span>
                )}
            </NavLink>

            {collapsed && tooltipStyle && ReactDOM.createPortal(
                <div style={{
                    position: 'fixed',
                    top: tooltipStyle.top,
                    left: tooltipStyle.left,
                    transform: 'translateY(-50%)',
                    zIndex: 99999,
                    background: '#1e293b',
                    color: '#fff',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                    maxWidth: '240px',
                    fontSize: '0.83rem',
                    lineHeight: 1.4,
                }}>
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>{label}</div>
                    <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>{description}</div>
                    {breakdown && Object.keys(breakdown).length > 0 && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>
                            <div className="d-flex align-items-center mb-1"><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#198754', display: 'inline-block', marginRight: '6px' }}></span> Pagos</div>
                            <div className="d-flex align-items-center mb-1"><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffc107', display: 'inline-block', marginRight: '6px' }}></span> Novedades</div>
                            <div className="d-flex align-items-center"><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc3545', display: 'inline-block', marginRight: '6px' }}></span> Alertas Críticas</div>
                        </div>
                    )}
                    <div style={{
                        position: 'absolute',
                        left: '-6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 0,
                        height: 0,
                        borderTop: '6px solid transparent',
                        borderBottom: '6px solid transparent',
                        borderRight: '6px solid #1e293b',
                    }} />
                </div>,
                document.body
            )}
        </>
    );
};

export default Sidebar;
