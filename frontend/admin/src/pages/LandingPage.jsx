import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Badge, Form, Button, Alert, Card, Modal, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheck, FaRocket, FaStore, FaChartLine, FaLock, FaUser, FaEnvelope } from 'react-icons/fa';
import AuthService from '../services/auth.service';
import axios from 'axios';

const LandingPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    // Register Modal State
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [regCompanyName, setRegCompanyName] = useState("");
    const [regUsername, setRegUsername] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regMessage, setRegMessage] = useState("");
    const [regSuccessful, setRegSuccessful] = useState(false);
    const [regPhone, setRegPhone] = useState("");
    const [regPlan, setRegPlan] = useState("free");

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotMessage, setForgotMessage] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);

    // Reset Password State
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetMessage, setResetMessage] = useState("");
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const [searchParams] = useSearchParams();
    const API_URL = import.meta.env.VITE_API_URL;

    // Check URL for reset token on mount
    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            setResetToken(token);
            setShowResetModal(true);
        }
    }, [searchParams]);

    const handleLogin = (e) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        AuthService.login(username, password, true).then(
            () => {
                navigate("/dashboard");
                window.location.reload();
            },
            (error) => {
                const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
                let userFriendlyMessage = message;

                if (error.response && error.response.status === 401) {
                    if (message && message.includes("Error:")) {
                        userFriendlyMessage = message;
                    } else {
                        userFriendlyMessage = "Usuario o contraseña incorrectos.";
                    }
                } else if (message.includes("401")) {
                    userFriendlyMessage = "Usuario o contraseña incorrectos.";
                } else if (message.includes("Network Error")) {
                    userFriendlyMessage = "Error de conexión. Verifique que el servidor esté activo.";
                }

                setLoading(false);
                setMessage(userFriendlyMessage);
            }
        );
    };

    const handleRegister = (e) => {
        e.preventDefault();
        setRegMessage("");
        setRegSuccessful(false);

        AuthService.register(regUsername, regEmail, regPassword, "manager", regCompanyName, regPhone).then(
            (response) => {
                setRegMessage(response.data.message);
                setRegSuccessful(true);
                // Optionally auto-login or just close modal after delay
                // alert("Registro exitoso. Ahora puedes iniciar sesión."); // Removed alert
                // setShowRegisterModal(false);
                // navigate("/login"); we are already here
            },
            (error) => {
                const resMessage = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
                setRegMessage(resMessage);
                setRegSuccessful(false);
            }
        );
    };

    const openRegister = (planType = "free") => {
        setRegPlan(planType);
        setShowRegisterModal(true);
    };

    const handleForgotPassword = (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotMessage("");

        axios.post(API_URL + '/auth/forgot-password', { email: forgotEmail })
            .then((res) => {
                setForgotMessage(res.data.message);
                setForgotSuccess(true);
                setForgotLoading(false);
            })
            .catch((err) => {
                setForgotMessage(err.response?.data?.message || "Error al procesar la solicitud.");
                setForgotSuccess(false);
                setForgotLoading(false);
            });
    };

    const handleResetPassword = (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setResetMessage("Las contraseñas no coinciden.");
            return;
        }
        if (newPassword.length < 6) {
            setResetMessage("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setResetLoading(true);
        setResetMessage("");

        axios.post(API_URL + '/auth/reset-password', { token: resetToken, newPassword })
            .then((res) => {
                setResetMessage(res.data.message);
                setResetSuccess(true);
                setResetLoading(false);
            })
            .catch((err) => {
                setResetMessage(err.response?.data?.message || "Error al restablecer la contraseña.");
                setResetSuccess(false);
                setResetLoading(false);
            });
    };

    return (
        <div className="landing-page position-relative">
            {/* Background Mesh */}
            <div className="bg-mesh"></div>

            {/* Navbar */}
            <nav className="d-flex justify-content-between align-items-center p-4 container" style={{ maxWidth: '1200px' }}>
                <div className="d-flex align-items-center gap-2">
                    <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '40px', height: '40px' }}>
                        <FaStore size={20} />
                    </div>
                    <h4 className="m-0 fw-bold text-dark" style={{ background: 'none', WebkitTextFillColor: 'initial' }}>Tiendario</h4>
                </div>
                <div>
                    <Button onClick={() => openRegister('free')} className="btn btn-primary rounded-pill px-4">Crear Tienda</Button>
                </div>
            </nav>

            {/* Hero Section */}
            <Container className="mt-5 pt-4 mb-5 position-relative">
                <Row className="align-items-center">
                    <Col lg={7} className="text-start pe-lg-5">
                        <Badge bg="primary" className="mb-3 px-3 py-2 rounded-pill">SaaS para Comercios Locales</Badge>
                        <h1 className="display-3 mb-4 fw-bolder" style={{ lineHeight: '1.1' }}>
                            Tu Tienda,<br />
                            <span className="text-gradient">En Control Total.</span>
                        </h1>
                        <p className="lead text-secondary mb-5 fs-4" style={{ maxWidth: '600px' }}>
                            Gestiona inventario, ventas y proveedores con elegancia. Sincronía perfecta entre tu local y el Marketplace.
                        </p>
                        <div className="d-flex gap-3">
                            <Button onClick={() => openRegister('free')} className="btn btn-primary btn-lg px-4 py-3 shadow-glow">
                                Registrar mi Negocio
                            </Button>
                            <button className="btn btn-outline-primary btn-lg px-4 py-3">
                                Ver Demo
                            </button>
                        </div>
                    </Col>

                    <Col lg={5} className="mt-5 mt-lg-0">
                        <Card className="glass-panel p-4 border-0 shadow-lg animate-fade-in">
                            <h3 className="mb-4 text-center">Acceso Vendedores</h3>
                            <p className="text-center text-secondary small mb-4">Ingresa para gestionar tu inventario y ventas.</p>
                            <Form onSubmit={handleLogin}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Usuario</Form.Label>
                                    <div className="position-relative">
                                        <FaUser className="position-absolute text-muted" style={{ top: '12px', left: '15px' }} />
                                        <Form.Control
                                            type="text"
                                            className="ps-5 py-2 rounded-3"
                                            placeholder="Nombre de usuario"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                    </div>
                                </Form.Group>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold">Contraseña</Form.Label>
                                    <div className="position-relative">
                                        <FaLock className="position-absolute text-muted" style={{ top: '12px', left: '15px' }} />
                                        <Form.Control
                                            type="password"
                                            className="ps-5 py-2 rounded-3"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </Form.Group>

                                {message && <Alert variant="danger" className="py-2 small">{message}</Alert>}

                                <Button variant="primary" type="submit" className="w-100 py-2 fs-5 shadow-sm" disabled={loading}>
                                    {loading ? "Iniciando..." : "Entrar al Panel"}
                                </Button>
                            </Form>
                            <div className="text-center mt-3">
                                <small className="text-secondary">¿Olvidaste tu contraseña? <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); setForgotMessage(''); setForgotEmail(''); setForgotSuccess(false); }}>Recuperar</a></small>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* Mockup / Visual Element */}
            <Container className="text-center mb-5 mt-5">
                <div className="mx-auto glass-panel p-2 d-inline-block shadow-lg" style={{ maxWidth: '90%' }}>
                    <div className="bg-white rounded-4 overflow-hidden position-relative" style={{ height: '300px', width: '800px', background: 'linear-gradient(to bottom, #f8fafc, #e2e8f0)' }}>
                        <div className="border-bottom p-3 d-flex gap-2 align-items-center bg-white">
                            <div className="rounded-circle bg-danger" style={{ width: 10, height: 10 }}></div>
                            <div className="rounded-circle bg-warning" style={{ width: 10, height: 10 }}></div>
                            <div className="rounded-circle bg-success" style={{ width: 10, height: 10 }}></div>
                        </div>
                        <div className="p-5 text-center text-secondary">
                            <FaChartLine size={60} className="mb-3 opacity-25" />
                            <h5>Panel de Control Inteligente</h5>
                        </div>
                    </div>
                </div>
            </Container>

            {/* Pricing Section */}
            <Container className="py-5 mt-5" >
                <div className="text-center mb-5">
                    <h2 className="mb-3">Planes Transparentes</h2>
                    <p className="text-secondary fs-5">Escala a medida que creces. Sin sorpresas.</p>
                </div>

                <Row className="justify-content-center g-4">
                    {/* Free Plan */}
                    <Col md={5} lg={4}>
                        <div className="glass-panel p-5 h-100 d-flex flex-column card-hover bg-white">
                            <div className="mb-4">
                                <span className="badge bg-light text-secondary rounded-pill px-3 py-2">Inicial</span>
                            </div>
                            <h3 className="mb-2 text-dark" style={{ background: 'none', WebkitTextFillColor: 'initial' }}>Gratis</h3>
                            <div className="d-flex align-items-baseline mb-4">
                                <span className="display-4 fw-bold text-dark">$0</span>
                                <span className="text-secondary ms-2">/mes</span>
                            </div>
                            <ul className="list-unstyled flex-grow-1 text-secondary">
                                <li className="mb-3 d-flex align-items-center"><FaCheck className="text-primary me-2" /> 1 Empresa & Inventario</li>
                                <li className="mb-3 d-flex align-items-center"><FaCheck className="text-primary me-2" /> Presencia en Marketplace</li>
                                <li className="mb-3 d-flex align-items-center opacity-50"><FaCheck className="me-2" /> Control de Ventas & Inventario</li>
                                <li className="mb-3 d-flex align-items-center opacity-50"><FaCheck className="me-2" /> Métricas Financieras</li>
                            </ul>
                            <Button onClick={() => openRegister('free')} className="btn btn-outline-primary w-100 mt-3 rounded-pill">
                                Comenzar Gratis
                            </Button>
                        </div>
                    </Col>

                    {/* Premium Plan */}
                    <Col md={5} lg={4}>
                        <div className="glass-panel p-5 h-100 d-flex flex-column card-hover position-relative overflow-hidden border border-primary border-opacity-25 bg-white">
                            <div className="position-absolute top-0 end-0 bg-primary text-white px-3 py-1 rounded-bottom-start fw-bold small">
                                POPULAR
                            </div>
                            <div className="mb-4">
                                <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-2">Profesional</span>
                            </div>
                            <h3 className="mb-2 text-dark" style={{ background: 'none', WebkitTextFillColor: 'initial' }}>Premium</h3>
                            <div className="d-flex align-items-baseline mb-4">
                                <span className="display-4 fw-bold text-dark">$10</span>
                                <span className="text-secondary ms-2">/mes</span>
                            </div>
                            <ul className="list-unstyled flex-grow-1 text-secondary">
                                <li className="mb-3 d-flex align-items-center"><FaCheck className="text-primary me-2" /> <strong>Todo lo del plan Gratis</strong></li>
                                <li className="mb-3 d-flex align-items-center"><FaCheck className="text-primary me-2" /> Control de Ventas e Inventario</li>
                                <li className="mb-3 d-flex align-items-center"><FaCheck className="text-primary me-2" /> Métricas de Rendimiento SaaS</li>
                                <li className="mb-3 d-flex align-items-center"><FaCheck className="text-primary me-2" /> Presencia Destacada en Market</li>
                            </ul>
                            <Button onClick={() => openRegister('premium')} className="btn btn-primary w-100 mt-3 rounded-pill shadow-lg">
                                Obtener Premium
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Container >

            <div className="py-5 text-center text-secondary small">
                &copy; 2026 Tiendario Inc. Hecho con ❤️ para emprendedores.
            </div>

            {/* Registration Modal Embedded */}
            <div className={`modal fade ${showRegisterModal ? 'show' : ''}`} style={{ display: showRegisterModal ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content rounded-4 border-0 shadow-lg">
                        <div className="modal-header border-0 pb-0">
                            <h5 className="modal-title fw-bold">Crear Tienda - Plan {regPlan.toUpperCase()}</h5>
                            <button type="button" className="btn-close" onClick={() => setShowRegisterModal(false)}></button>
                        </div>
                        <div className="modal-body p-4">
                            <Form onSubmit={handleRegister}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nombre de tu Empresa</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ej. Tienda de Pedro"
                                        value={regCompanyName}
                                        onChange={(e) => setRegCompanyName(e.target.value)}
                                        required
                                        className="rounded-3"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Usuario (Admin)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Username"
                                        value={regUsername}
                                        onChange={(e) => setRegUsername(e.target.value)}
                                        required
                                        className="rounded-3"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="tu@email.com"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        required
                                        className="rounded-3"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label>Contraseña</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Min 6 caracteres"
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        required
                                        className="rounded-3"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label>Teléfono</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        placeholder="+58 412 1234567"
                                        value={regPhone}
                                        onChange={(e) => setRegPhone(e.target.value)}
                                        required
                                        className="rounded-3"
                                    />
                                </Form.Group>

                                {regMessage && (
                                    <Alert variant={regSuccessful ? "success" : "danger"}>
                                        {regMessage}
                                    </Alert>
                                )}

                                {!regSuccessful ? (
                                    <Button variant="primary" type="submit" className="w-100 rounded-pill fw-bold">
                                        Registrar y Comenzar
                                    </Button>
                                ) : (
                                    <Button variant="secondary" className="w-100 rounded-pill fw-bold" onClick={() => setShowRegisterModal(false)}>
                                        Cerrar
                                    </Button>
                                )}
                            </Form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            <Modal show={showForgotModal} onHide={() => setShowForgotModal(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold"><FaEnvelope className="me-2 text-primary" />Recuperar Contraseña</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="text-muted small mb-3">
                        Ingresa tu email o nombre de usuario y te enviaremos instrucciones para restablecer tu contraseña.
                    </p>
                    <Form onSubmit={handleForgotPassword}>
                        <Form.Group className="mb-3">
                            <Form.Control
                                type="text"
                                placeholder="Email o nombre de usuario"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                required
                                className="rounded-3 py-2"
                            />
                        </Form.Group>
                        {forgotMessage && (
                            <Alert variant={forgotSuccess ? "success" : "danger"} className="small py-2">
                                {forgotMessage}
                            </Alert>
                        )}
                        {!forgotSuccess ? (
                            <Button variant="primary" type="submit" className="w-100 rounded-pill fw-bold" disabled={forgotLoading}>
                                {forgotLoading ? <Spinner size="sm" animation="border" /> : "Enviar Instrucciones"}
                            </Button>
                        ) : (
                            <Button variant="secondary" className="w-100 rounded-pill" onClick={() => setShowForgotModal(false)}>
                                Cerrar
                            </Button>
                        )}
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Reset Password Modal */}
            <Modal show={showResetModal} onHide={() => setShowResetModal(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold"><FaLock className="me-2 text-primary" />Nueva Contraseña</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form onSubmit={handleResetPassword}>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Nueva Contraseña</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="rounded-3 py-2"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Confirmar Contraseña</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Repetir contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="rounded-3 py-2"
                            />
                        </Form.Group>
                        {resetMessage && (
                            <Alert variant={resetSuccess ? "success" : "danger"} className="small py-2">
                                {resetMessage}
                            </Alert>
                        )}
                        {!resetSuccess ? (
                            <Button variant="primary" type="submit" className="w-100 rounded-pill fw-bold" disabled={resetLoading}>
                                {resetLoading ? <Spinner size="sm" animation="border" /> : "Restablecer Contraseña"}
                            </Button>
                        ) : (
                            <Button variant="success" className="w-100 rounded-pill fw-bold" onClick={() => { setShowResetModal(false); window.history.replaceState({}, '', '/'); }}>
                                Ir a Iniciar Sesión
                            </Button>
                        )}
                    </Form>
                </Modal.Body>
            </Modal>
        </div >
    );
};

export default LandingPage;
