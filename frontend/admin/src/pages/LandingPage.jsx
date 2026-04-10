import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Badge, Form, Button, Alert, Modal, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheck, FaTimes, FaRocket, FaStore, FaLock, FaUser, FaEnvelope, FaBolt, FaChartBar, FaMapMarkerAlt } from 'react-icons/fa';

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

    // Billing toggle
    const [billingAnnual, setBillingAnnual] = useState(false);

    const [searchParams] = useSearchParams();
    const API_URL = import.meta.env.VITE_API_URL;

    // Check URL for verification or reset token on mount
    useEffect(() => {
        const user = AuthService.getCurrentUser();
        if (user && (user.roles?.includes('ROLE_MANAGER') || user.roles?.includes('ROLE_ADMIN'))) {
            navigate("/dashboard");
            return;
        }

        const token = searchParams.get('token');

        if (token && !searchParams.get('verified')) {
            setResetToken(token);
            setShowResetModal(true);
        }

        const verified = searchParams.get('verified');
        if (verified === 'true') {
            const verifiedToken = searchParams.get('token');
            const verifiedUsername = searchParams.get('username');
            const rolesStr = searchParams.get('roles');
            const id = searchParams.get('id');
            const companyId = searchParams.get('companyId');

            if (verifiedToken && verifiedUsername) {
                const userData = {
                    token: verifiedToken,
                    username: verifiedUsername,
                    roles: rolesStr ? rolesStr.split(',') : [],
                    id: id,
                    companyId: companyId,
                    subscriptionStatus: 'TRIAL'
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
                const msg = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
                let userFriendlyMessage = msg;

                if (error.response && error.response.status === 401) {
                    userFriendlyMessage = msg.includes("Error:") ? msg : "Usuario o contraseña incorrectos.";
                } else if (msg.includes("401")) {
                    userFriendlyMessage = "Usuario o contraseña incorrectos.";
                } else if (msg.includes("Network Error")) {
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
            () => {
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
                <div className="d-flex gap-2 align-items-center">
                    <Button variant="link" onClick={() => setShowLoginModal(true)} className="text-primary text-decoration-none fw-bold px-2" style={{ fontSize: '0.9rem' }}>Entrar</Button>
                    <Button onClick={() => document.getElementById('planes').scrollIntoView({ behavior: 'smooth' })} className="btn btn-primary rounded-pill px-3 shadow-sm" style={{ fontSize: '0.9rem' }}>Ver Planes</Button>
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
                            Punto de venta, control de inventario y presencia automática en el marketplace local — todo desde un solo panel.
                        </p>
                        <div className="d-flex gap-3">
                            <Button onClick={() => openRegister('free')} className="btn btn-primary btn-lg px-4 py-3 shadow-lg">
                                Crear mi Tienda Gratis
                            </Button>
                            <Button
                                variant="outline-primary"
                                className="btn-lg px-4 py-3"
                                onClick={() => navigate('/demo')}
                            >
                                🎭 Ver Demo
                            </Button>
                        </div>
                    </Col>

                    {/* Hero stats panel — replaces redundant login card */}
                    <Col lg={5} className="mt-5 mt-lg-0">
                        <div className="glass-panel p-5 border-0 shadow-xl bg-white" style={{ borderRadius: '32px' }}>
                            <p className="text-secondary small fw-bold text-uppercase mb-4" style={{ letterSpacing: '1px' }}>¿Qué incluye Tiendario?</p>
                            <div className="d-flex flex-column gap-3">
                                {[
                                    { icon: <FaBolt className="text-primary" />, text: "Punto de venta (POS) para cobros rápidos" },
                                    { icon: <FaChartBar className="text-primary" />, text: "Inventario y métricas de ventas en tiempo real" },
                                    { icon: <FaMapMarkerAlt className="text-primary" />, text: "Presencia automática en el marketplace local" },
                                    { icon: <FaRocket className="text-primary" />, text: "Listo en minutos, sin instalaciones ni técnicos" },
                                ].map((item, i) => (
                                    <div key={i} className="d-flex align-items-center gap-3">
                                        <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', minWidth: '40px', fontSize: '16px' }}>
                                            {item.icon}
                                        </div>
                                        <span className="text-dark" style={{ fontSize: '0.95rem' }}>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                            <hr className="my-4" />
                            <Button onClick={() => setShowLoginModal(true)} variant="outline-primary" className="w-100 rounded-pill fw-bold">
                                Ya tengo cuenta — Entrar
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Container>

            {/* Mockup Section */}
            <Container id="mockup" className="text-center mb-5 pb-5">
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
            <Container id="planes" className="py-5 mt-5">
                <div className="text-center mb-5">
                    <h2 className="mb-3">Planes Transparentes</h2>
                    <p className="text-secondary fs-5">Escala a medida que creces. Sin sorpresas.</p>

                    {/* Billing Toggle */}
                    <div className="d-inline-flex align-items-center gap-3 mt-2 bg-light rounded-pill px-4 py-2">
                        <span className={`fw-bold small ${!billingAnnual ? 'text-primary' : 'text-secondary'}`}>Mensual</span>
                        <div
                            className="position-relative"
                            style={{ cursor: 'pointer', width: '48px', height: '26px', background: billingAnnual ? '#007bff' : '#dee2e6', borderRadius: '13px', transition: 'background 0.3s' }}
                            onClick={() => setBillingAnnual(!billingAnnual)}
                        >
                            <div style={{
                                position: 'absolute', top: '3px', left: billingAnnual ? '25px' : '3px',
                                width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                                transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                        <span className={`fw-bold small ${billingAnnual ? 'text-primary' : 'text-secondary'}`}>
                            Anual <Badge bg="success" pill className="ms-1" style={{ fontSize: '0.65rem' }}>-17%</Badge>
                        </span>
                    </div>
                </div>

                <Row className="justify-content-center g-4 align-items-stretch">

                    {/* Free Trial Plan */}
                    <Col md={5} lg={4}>
                        <div className="glass-panel p-5 h-100 d-flex flex-column card-hover bg-white">
                            <div className="mb-4">
                                <span className="badge bg-light text-secondary rounded-pill px-3 py-2">Para empezar</span>
                            </div>
                            <h3 className="mb-1 text-dark" style={{ background: 'none', WebkitTextFillColor: 'initial' }}>Gratis</h3>
                            <div className="d-flex align-items-baseline mb-1">
                                <span className="display-4 fw-bold text-dark">$0</span>
                                <span className="text-secondary ms-2">/ 1 mes</span>
                            </div>
                            <p className="text-muted small mb-4">Prueba todo Tiendario sin compromiso durante 30 días.</p>
                            <ul className="list-unstyled flex-grow-1 text-secondary">
                                <li className="mb-3 d-flex align-items-center gap-2"><FaCheck className="text-primary flex-shrink-0" /> Acceso completo por 30 días</li>
                                <li className="mb-3 d-flex align-items-center gap-2"><FaCheck className="text-primary flex-shrink-0" /> POS, inventario y ventas</li>
                                <li className="mb-3 d-flex align-items-center gap-2"><FaCheck className="text-primary flex-shrink-0" /> Presencia en Marketplace</li>
                                <li className="mb-3 d-flex align-items-center gap-2 text-muted"><FaTimes className="text-danger flex-shrink-0" /> Sin tarjeta de crédito requerida</li>
                            </ul>
                            <Button onClick={() => openRegister('free')} variant="outline-primary" className="w-100 mt-3 rounded-pill">
                                Comenzar Ahora Gratis
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
                            <h3 className="mb-1 text-dark" style={{ background: 'none', WebkitTextFillColor: 'initial' }}>Premium</h3>
                            <div className="d-flex align-items-baseline mb-1">
                                <span className="display-4 fw-bold text-dark">
                                    {billingAnnual ? '$200' : '$20'}
                                </span>
                                <span className="text-secondary ms-2">
                                    {billingAnnual ? '/año' : '/mes'}
                                </span>
                            </div>
                            {billingAnnual
                                ? <p className="text-success small fw-bold mb-4">Ahorras $40 vs. pago mensual</p>
                                : <p className="text-muted small mb-4">Después del primer mes gratuito.</p>
                            }
                            <ul className="list-unstyled flex-grow-1 text-secondary">
                                <li className="mb-3 d-flex align-items-center gap-2"><FaCheck className="text-primary flex-shrink-0" /> Punto de Venta (POS) completo</li>
                                <li className="mb-3 d-flex align-items-center gap-2"><FaCheck className="text-primary flex-shrink-0" /> Control de Ventas e Inventario</li>
                                <li className="mb-3 d-flex align-items-center gap-2"><FaCheck className="text-primary flex-shrink-0" /> Métricas Financieras en tiempo real</li>
                                <li className="mb-3 d-flex align-items-center gap-2"><FaCheck className="text-primary flex-shrink-0" /> Reportes de Ventas avanzados</li>
                                <li className="mb-3 d-flex align-items-center gap-2"><FaCheck className="text-primary flex-shrink-0" /> Presencia Destacada en Marketplace</li>
                            </ul>
                            <Button onClick={() => openRegister('premium')} className="btn btn-primary w-100 mt-3 rounded-pill shadow-lg">
                                {billingAnnual ? 'Obtener Premium Anual' : 'Obtener Premium'}
                            </Button>
                        </div>
                    </Col>

                </Row>
            </Container>

            <div className="py-5 text-center text-secondary small">
                &copy; 2026 Tiendario Inc. Hecho con ❤️ para emprendedores.
            </div>


            {/* Registration Modal */}
            <div className={`modal fade ${showRegisterModal ? 'show' : ''}`} style={{ display: showRegisterModal ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content rounded-4 border-0 shadow-lg">
                        <div className="modal-header border-0 pb-0">
                            <h5 className="modal-title fw-bold">Crear Tienda — Plan {regPlan.toUpperCase()}</h5>
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
                                        Haz clic en el mapa para marcar tu ubicación exacta. {regPosition && <span className="text-success fw-bold">(Ubicación marcada ✓)</span>}
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
                        Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña.
                    </p>
                    <Form onSubmit={handleForgotPassword}>
                        <Form.Group className="mb-3">
                            <Form.Control
                                type="text"
                                placeholder="tu@email.com"
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

        </div>
    );
};

export default LandingPage;
