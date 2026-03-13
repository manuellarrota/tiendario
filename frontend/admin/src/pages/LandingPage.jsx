import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Badge, Form, Button, Alert, Card, Modal, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheck, FaRocket, FaStore, FaChartLine, FaLock, FaUser, FaEnvelope, FaBolt, FaChartBar, FaMapMarkerAlt, FaGlobe } from 'react-icons/fa';

import AuthService from '../services/auth.service';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet default icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
};

const LandingPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    // Login Modal State
    const [showLoginModal, setShowLoginModal] = useState(false);


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
    const [regPosition, setRegPosition] = useState(null);
    const [regAddress, setRegAddress] = useState("");
    const mapRef = useRef();

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
    const [verificationSuccess, setVerificationSuccess] = useState(false);

    const [searchParams] = useSearchParams();
    const API_URL = import.meta.env.VITE_API_URL;

    // Check URL for verification or reset token on mount
    useEffect(() => {
        const user = AuthService.getCurrentUser();
        if (user) {
            navigate("/dashboard");
            return;
        }

        const tokenToken = searchParams.get('token');

        if (tokenToken && !searchParams.get('verified')) {
            setResetToken(tokenToken);
            setShowResetModal(true);
        }

        const verified = searchParams.get('verified');
        if (verified === 'true') {
            const token = searchParams.get('token');
            const username = searchParams.get('username');
            const rolesStr = searchParams.get('roles');
            const id = searchParams.get('id');
            const companyId = searchParams.get('companyId');

            if (token && username) {
                // Perform auto-login
                const userData = {
                    token: token,
                    username: username,
                    roles: rolesStr ? rolesStr.split(',') : [],
                    id: id,
                    companyId: companyId,
                    subscriptionStatus: 'TRIAL' // Default for new managers
                };
                localStorage.setItem("user", JSON.stringify(userData));
                setVerificationSuccess(true);
                setMessage("✅ ¡Cuenta verificada con éxito! Iniciando sesión...");
                setTimeout(() => {
                    navigate("/dashboard");
                    window.location.reload();
                }, 1500);
            } else {
                setVerificationSuccess(true);
                setMessage("✅ ¡Cuenta verificada con éxito! Ya puedes iniciar sesión.");
            }
            // Clean URL
            window.history.replaceState({}, '', '/');
        } else if (verified === 'error') {
            const errorMsg = searchParams.get('message') || "Código de verificación inválido o expirado.";
            setVerificationSuccess(false);
            setMessage(`❌ ${errorMsg}`);
            window.history.replaceState({}, '', '/');
        }
    }, [searchParams, navigate]);


    // Relocate map effect when position changes
    useEffect(() => {
        if (regPosition && mapRef.current) {
            mapRef.current.setView([regPosition.lat, regPosition.lng], 16);
        }
    }, [regPosition]);

    const handleLogin = (e) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        AuthService.login(username, password, true).then(
            () => {
                setShowLoginModal(false);
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

        const lat = regPosition ? regPosition.lat : 0;
        const lng = regPosition ? regPosition.lng : 0;

        AuthService.register(regUsername, regEmail, regPassword, "manager", regCompanyName, regPhone, lat, lng, regAddress).then(
            (response) => {
                setRegMessage("✅ ¡Registro exitoso! Por favor, revisa tu correo electrónico para activar tu cuenta antes de iniciar sesión.");
                setRegSuccessful(true);
            },
            (error) => {
                const resMessage = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
                let userFriendlyMessage = resMessage;

                if (resMessage.includes("Error: Company Name is required")) {
                    userFriendlyMessage = "El nombre de la empresa es obligatorio.";
                } else if (resMessage.includes("is already in use") || resMessage.includes("exists")) {
                    userFriendlyMessage = "El usuario o correo ya está registrado.";
                }

                setRegMessage(userFriendlyMessage);
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
                <div className="d-flex align-items-center gap-3">
                    <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '40px', height: '40px', boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' }}>
                        <FaStore size={20} />
                    </div>
                    <h4 className="m-0 fw-bold text-dark" style={{ letterSpacing: '-0.5px' }}>Tiendario</h4>
                    <Badge pill bg="primary" className="ms-2 px-3 py-2 d-none d-md-block" style={{ backgroundColor: '#007bff !important', fontWeight: '600' }}>
                        Sistema POS + Marketplace Local
                    </Badge>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <Button variant="link" onClick={() => setShowLoginModal(true)} className="text-primary text-decoration-none fw-bold d-none d-sm-block">Entrar</Button>
                    <Button onClick={() => openRegister('free')} className="btn btn-primary rounded-pill px-4 shadow">Crear Tienda</Button>
                </div>
            </nav>

            {/* Hero Section */}
            <Container className="mt-5 pt-2 mb-5">
                <Row className="align-items-center">
                    <Col lg={7} className="text-start pe-lg-5">
                        <h1 className="display-3 mb-4 fw-bolder" style={{ lineHeight: '1.1', background: 'none', WebkitTextFillColor: 'initial', color: '#1e293b' }}>
                            Administra tu tienda.<br />
                            <span className="text-gradient">Vende más. Pierde menos.</span>
                        </h1>
                        <p className="lead text-secondary mb-5 fs-4" style={{ maxWidth: '550px' }}>
                            Controla inventario, ventas y participa en el marketplace local automáticamente.
                        </p>
                        <div className="d-flex gap-3">
                            <Button onClick={() => openRegister('free')} className="btn btn-primary btn-lg px-4 py-3 shadow-lg">
                                Crear mi Tienda Gratis
                            </Button>
                            <Button variant="outline-primary" className="btn-lg px-4 py-3">
                                Ver Demo
                            </Button>
                        </div>
                    </Col>

                    <Col lg={5} className="mt-5 mt-lg-0">
                        <div className="glass-panel p-5 border-0 shadow-xl text-center bg-white" style={{ borderRadius: '32px' }}>
                            <div className="mx-auto bg-primary rounded-circle d-flex align-items-center justify-content-center text-white mb-4" style={{ width: '70px', height: '70px', boxShadow: '0 10px 20px rgba(0, 123, 255, 0.2)' }}>
                                <FaStore size={35} />
                            </div>
                            <h3 className="mb-2 fw-bold" style={{ background: 'none', WebkitTextFillColor: 'initial', color: '#1e293b' }}>Administrar mi Tienda</h3>
                            <p className="text-secondary mb-4">Acceso para Comerciantes.</p>
                            <Button onClick={() => setShowLoginModal(true)} className="btn btn-primary btn-lg w-100 rounded-4 py-3 fw-bold mb-3 shadow-lg" style={{ fontSize: '1.2rem' }}>
                                Entrar al Panel
                            </Button>
                            <div className="small text-muted">¿Ya tienes una tienda? <a href="#" className="text-primary fw-bold text-decoration-none" onClick={(e) => { e.preventDefault(); setShowLoginModal(true); }}>Inicia sesión aquí</a></div>
                        </div>
                    </Col>
                </Row>
            </Container>

            {/* Features Section */}
            <Container className="py-5 mb-5">
                <Row className="g-4">
                    <Col md={4}>
                        <div className="d-flex align-items-center gap-3">
                            <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center text-primary" style={{ width: '56px', height: '56px', minWidth: '56px', fontSize: '24px' }}>
                                <FaBolt />
                            </div>
                            <div>
                                <h6 className="fw-bold mb-1">Configura tu tienda en minutos</h6>
                                <p className="text-secondary small mb-0">Sin instalaciones ni técnicos.</p>
                            </div>
                        </div>
                    </Col>
                    <Col md={4}>
                        <div className="d-flex align-items-center gap-3">
                            <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center text-primary" style={{ width: '56px', height: '56px', minWidth: '56px', fontSize: '24px' }}>
                                <FaChartBar />
                            </div>
                            <div>
                                <h6 className="fw-bold mb-1">Controla inventario y ventas</h6>
                                <p className="text-secondary small mb-0">Todo desde un solo panel.</p>
                            </div>
                        </div>
                    </Col>
                    <Col md={4}>
                        <div className="d-flex align-items-center gap-3">
                            <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center text-primary" style={{ width: '56px', height: '56px', minWidth: '56px', fontSize: '24px' }}>
                                <FaMapMarkerAlt />
                            </div>
                            <div>
                                <h6 className="fw-bold mb-1">Aparece en el marketplace local</h6>
                                <p className="text-secondary small mb-0">Más clientes descubren tu tienda.</p>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>

            {/* Mockup Section */}
            <Container className="text-center mb-5 pb-5">
                <div className="mx-auto shadow-2xl rounded-4 overflow-hidden border border-light" style={{ maxWidth: '1000px', transform: 'perspective(1000px) rotateX(2deg)', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.2)' }}>
                    <img 
                        src="/tiendario_dashboard_mockup_1773425385989.png" 
                        alt="Tiendario Dashboard" 
                        className="img-fluid"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2426&q=80";
                        }}
                    />
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
                                        placeholder="Nombre de usuario"
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

                                <Form.Group className="mb-3">
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

                                <Form.Group className="mb-3">
                                    <Form.Label>Contraseña</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Mínimo 6 caracteres"
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        required
                                        className="rounded-3"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label>Dirección Física de la Tienda</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ej: Calle 5 con Av. Principal, Local 2"
                                        value={regAddress}
                                        onChange={(e) => setRegAddress(e.target.value)}
                                        required
                                        className="rounded-3"
                                    />
                                    <small className="text-secondary mt-1 d-block">
                                        Escribe la dirección exacta de tu local.
                                    </small>
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label>Punto en el Mapa (Ubicación GPS)</Form.Label>
                                    <div style={{ height: '250px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
                                        <MapContainer
                                            center={[10.4806, -66.9036]}
                                            zoom={11}
                                            style={{ height: '100%', width: '100%' }}
                                            ref={mapRef}
                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                            />
                                            <LocationMarker position={regPosition} setPosition={setRegPosition} />
                                        </MapContainer>
                                    </div>
                                    <small className="text-secondary mt-1 d-block">
                                        Haz clic en el mapa para marcar tu ubicación exacta. {regPosition && <span className="text-success fw-bold">(Ubicación marcada)</span>}
                                    </small>
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
                                {forgotLoading ? <Spinner size="sm" animation="border" /> : "Recuperar Contraseña"}
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

            {/* Login Modal */}
            <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered className="modal-premium">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">Acceso Vendedores</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
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
                                    autoComplete="username"
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
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                        </Form.Group>

                        {message && <Alert variant={verificationSuccess ? "success" : "danger"} className="py-2 small">{message}</Alert>}

                        <Button variant="primary" type="submit" className="w-100 py-3 rounded-4 fw-bold shadow" disabled={loading}>
                            {loading ? <Spinner size="sm" animation="border" className="me-2" /> : "Entrar al Panel"}
                        </Button>
                    </Form>
                    <div className="text-center mt-3">
                        <small className="text-secondary">¿Olvidaste tu contraseña? <a href="#" onClick={(e) => { e.preventDefault(); setShowLoginModal(false); setShowForgotModal(true); setForgotMessage(''); setForgotEmail(''); setForgotSuccess(false); }}>Recuperar</a></small>
                    </div>
                </Modal.Body>
            </Modal>

        </div >
    );
};

export default LandingPage;
