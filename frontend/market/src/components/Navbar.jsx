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
        <Navbar bg="white" expand="lg" className="sticky-top shadow-sm py-3" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,0.9)' }}>
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center gap-2 fs-4">
                    <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white p-2" style={{ width: 35, height: 35, background: 'var(--primary-gradient)' }}>
                        <FaStore size={18} />
                    </div>
                    <span className="text-dark">Tiendario <span className="text-primary" style={{ fontWeight: 800 }}>Market</span></span>
                </Navbar.Brand>

                <Navbar.Toggle />
                <Navbar.Collapse className="justify-content-end">
                    <div className="d-flex align-items-center gap-3">
                        {user ? (
                            <Dropdown align="end">
                                <Dropdown.Toggle variant="light" id="dropdown-basic" className="d-flex align-items-center gap-2 border-0 bg-transparent">
                                    <FaUserCircle size={24} className="text-primary" />
                                    <span className="d-none d-md-block fw-bold">{displayName}</span>
                                </Dropdown.Toggle>

                                <Dropdown.Menu>
                                    <Dropdown.Item as={Link} to="/dashboard">Mi Panel (Dashboard)</Dropdown.Item>
                                    <Dropdown.Item onClick={handleLogout} className="text-danger">Cerrar Sesión</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        ) : (
                            <>
                                <Button variant="link" className="text-decoration-none fw-bold text-dark" onClick={onLoginClick}>Iniciar Sesión</Button>
                                <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" onClick={onRegisterClick}>Registrarse</Button>
                            </>
                        )}
                        <div className="vr d-none d-lg-block mx-2"></div>
                        <Button variant="outline-dark" size="sm" className="rounded-pill px-3" onClick={() => window.location.href = 'http://localhost:8081/register'}>
                            Soy Vendedor
                        </Button>
                    </div>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};


export default MarketplaceNavbar;
