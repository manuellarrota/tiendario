import React from 'react';
import { Navbar, Container, Button, Nav, Dropdown } from 'react-bootstrap';
import { FaStore, FaUserCircle } from 'react-icons/fa';
import AuthService from '../services/auth.service';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const MarketplaceNavbar = ({ onLoginClick, onRegisterClick }) => {
    const user = AuthService.getCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();
    const isDashboard = location.pathname === '/dashboard';

    // Use email part as fallback for display name
    const displayName = user?.username || user?.email?.split('@')[0] || 'Mi Cuenta';

    const handleLogout = () => {
        AuthService.logout();
        navigate('/');
        window.location.reload();
    };

    return (
        <Navbar expand="lg" className="sticky-top glass-navbar py-3">
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center gap-2 fs-4">
                    <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: 32, height: 32, boxShadow: '0 0 20px rgba(79, 70, 229, 0.4)' }}>
                        <FaStore size={16} />
                    </div>
                    <span className="text-dark fw-800 fs-4" style={{ letterSpacing: '-0.5px' }}>
                        Tiendario <span className="text-secondary">Market</span>
                    </span>
                </Navbar.Brand>

                <Navbar.Toggle className="border-0 shadow-none" />
                <Navbar.Collapse className="justify-content-end">
                    <div className="d-flex align-items-center gap-4 mt-3 mt-lg-0">
                        {user ? (
                            <div className="d-flex align-items-center gap-3">
                                <Button 
                                    as={Link} 
                                    to={isDashboard ? "/" : "/dashboard"} 
                                    variant="white" 
                                    className="glass-panel-sm rounded-pill px-3 py-2 border-0 shadow-sm d-none d-md-flex align-items-center gap-2 fw-bold text-dark"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    {isDashboard ? (
                                        <>🛒 <span className="d-none d-xl-inline">Seguir Comprando</span></>
                                    ) : (
                                        <>📦 <span className="d-none d-xl-inline">Mis Pedidos</span></>
                                    )}
                                </Button>

                                <Dropdown align="end">
                                    <Dropdown.Toggle variant="white" className="glass-panel-sm rounded-pill px-3 py-2 border-0 shadow-sm d-flex align-items-center gap-2">
                                        <FaUserCircle size={20} className="text-primary" />
                                        <div className="text-start d-none d-sm-block">
                                            <div className="fw-bold small lh-1">{displayName}</div>
                                            <small className="text-muted" style={{ fontSize: '0.65rem' }}>Cliente Pro</small>
                                        </div>
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu className="border-0 shadow-lg rounded-4 p-2 mt-2" style={{ minWidth: '220px' }}>
                                        <div className="px-3 py-2 mb-2 bg-light rounded-3 text-center">
                                            <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>Puntos Tiendario</small>
                                            <span className="h5 fw-bold text-primary mb-0">⭐ {user.points || 0} pts</span>
                                        </div>
                                        <Dropdown.Item as={Link} to={isDashboard ? "/" : "/dashboard"} className="rounded-3 py-2 fw-500 d-md-none">
                                            {isDashboard ? "🛒 Seguir Comprando" : "📦 Mis Pedidos"}
                                        </Dropdown.Item>
                                        
                                        {user.roles?.some(r => r === 'ROLE_MANAGER' || r === 'ROLE_ADMIN') ? (
                                            <Dropdown.Item onClick={() => window.open(import.meta.env.VITE_ADMIN_URL || 'http://localhost:8081', '_blank')} className="rounded-3 py-2 fw-500">
                                                🏢 Ir a Panel Administrativo
                                            </Dropdown.Item>
                                        ) : (
                                            <Dropdown.Item onClick={() => window.open(`${import.meta.env.VITE_ADMIN_URL || 'http://localhost:8081'}/register`, '_blank')} className="rounded-3 py-2 fw-500 text-primary fw-bold">
                                                🚀 ¡Quiero mi Tienda!
                                            </Dropdown.Item>
                                        )}

                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={handleLogout} className="text-danger rounded-3 py-2 fw-500">
                                            🚪 Cerrar Sesión
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>
                        ) : (
                            <Nav className="gap-2 align-items-center">
                                <Button variant="link" className="text-decoration-none fw-bold text-dark p-0 px-2" onClick={onLoginClick}>Entrar</Button>
                                <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" style={{ padding: '0.6rem 1.5rem' }} onClick={onRegisterClick}>Registrarme</Button>
                            </Nav>
                        )}
                        <div className="vr d-none d-lg-block mx-1 opacity-25"></div>
                        <Button 
                            variant="light" 
                            size="sm" 
                            className="rounded-pill px-4 py-2 border-0 shadow-sm fw-bold text-primary" 
                            style={{ backgroundColor: 'rgba(79, 70, 229, 0.05)' }}
                            onClick={() => window.open(`${import.meta.env.VITE_ADMIN_URL || 'http://localhost:8081'}/register`, '_blank')}
                        >
                            Soy Vendedor
                        </Button>
                    </div>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};


export default MarketplaceNavbar;
