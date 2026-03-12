import React from 'react';
import { Navbar, Container, Button, Nav, Dropdown } from 'react-bootstrap';
import { FaStore, FaUserCircle } from 'react-icons/fa';
import AuthService from '../services/auth.service';
import { useNavigate, Link } from 'react-router-dom';

const MarketplaceNavbar = ({ onLoginClick, onRegisterClick }) => {
    const user = AuthService.getCurrentUser();
    const navigate = useNavigate();

    // Use email part as fallback for display name
    const displayName = user?.username || user?.email?.split('@')[0] || 'Mi Cuenta';

    const handleLogout = () => {
        AuthService.logout();
        navigate('/');
        window.location.reload();
    };

    return (
        <Navbar bg="white" expand="lg" className="sticky-top shadow-sm py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center gap-2 fs-4">
                    <img src="/logo_placeholder.svg" className="d-none" alt="logo" /> {/* In case there's an actual logo */}
                    <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: 32, height: 32 }}>
                        <FaStore size={16} />
                    </div>
                    <span className="text-dark fw-800 fs-4" style={{ letterSpacing: '-0.5px' }}>
                        Tiendario <span className="text-primary">Market</span>
                    </span>
                </Navbar.Brand>

                <Navbar.Toggle />
                <Navbar.Collapse className="justify-content-end">
                    <div className="d-flex align-items-center gap-3">
                        {user ? (
                            <div className="d-flex align-items-center gap-2">
                                <Dropdown align="end">
                                    <Dropdown.Toggle variant="light" className="rounded-pill px-3 py-2 border shadow-sm d-flex align-items-center gap-2">
                                        <FaUserCircle size={20} className="text-primary" />
                                        <div className="text-start d-none d-sm-block">
                                            <div className="fw-bold small lh-1">{displayName}</div>
                                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>Panel de Cliente</small>
                                        </div>
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu className="border-0 shadow-lg rounded-4 p-2 mt-2" style={{ minWidth: '220px' }}>
                                        <div className="px-3 py-2 mb-2 bg-light rounded-3 text-center">
                                            <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>Puntos Acumulados</small>
                                            <span className="h5 fw-bold text-primary mb-0">⭐ {user.points || 0} pts</span>
                                        </div>
                                        <Dropdown.Item as={Link} to="/dashboard" className="rounded-3 py-2">
                                            🛒 Mis Pedidos (7 días)
                                        </Dropdown.Item>
                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={handleLogout} className="text-danger rounded-3 py-2">
                                            🚪 Cerrar Sesión
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>
                        ) : (
                            <>
                                <Button variant="link" className="text-decoration-none fw-bold text-dark" onClick={onLoginClick}>Iniciar Sesión</Button>
                                <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" onClick={onRegisterClick}>Registrarse</Button>
                            </>
                        )}
                        <div className="vr d-none d-lg-block mx-2"></div>
                        <Button variant="outline-dark" size="sm" className="rounded-pill px-3" onClick={() => window.open(import.meta.env.VITE_ADMIN_URL || 'http://localhost:8081', '_blank')}>
                            Soy Vendedor
                        </Button>
                    </div>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};


export default MarketplaceNavbar;
