import React from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';

/**
 * Auth Modals — Login and Register modals for the marketplace.
 */
export const LoginModal = ({
    show, onHide, loginData, setLoginData, loginError,
    loginLoading, onLogin, onSwitchToRegister, onForgotPassword
}) => (
    <Modal show={show} onHide={onHide} centered scrollable className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">Ingresar al Marketplace</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
            <p className="text-secondary small mb-4">Inicia sesión para acumular puntos por tus compras y gestionar tus pedidos.</p>
            {loginError && <Alert variant="danger" className="py-2 small">{loginError}</Alert>}
            <Form onSubmit={onLogin}>
                <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold">Usuario o Correo</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="tu@email.com o usuario"
                        className="py-2 rounded-3"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                    />
                </Form.Group>
                <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold">Contraseña</Form.Label>
                    <Form.Control
                        type="password"
                        placeholder="••••••••"
                        className="py-2 rounded-3"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                    />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100 py-2 fw-bold shadow-sm" disabled={loginLoading}>
                    {loginLoading ? "Verificando..." : "Ingresar"}
                </Button>
            </Form>
            <div className="text-center mt-3">
                <small className="text-secondary">¿No tienes cuenta? <span className="fw-bold text-primary" onClick={onSwitchToRegister} style={{ cursor: 'pointer' }}>Regístrate gratis</span></small>
                <br />
                <small><span className="text-primary fw-bold" onClick={onForgotPassword} style={{ cursor: 'pointer' }}>¿Olvidaste tu contraseña? Recupérala aquí.</span></small>
            </div>
        </Modal.Body>
    </Modal>
);

export const RegisterModal = ({
    show, onHide, registerData, setRegisterData,
    registerMessage, registerSuccess, registerLoading, onRegister, onSwitchToLogin
}) => (
    <Modal show={show} onHide={onHide} centered scrollable className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">Crear Cuenta</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
            {registerSuccess ? (
                <div className="text-center py-5 animate-fade-in">
                    <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-4 shadow" style={{ width: '80px', height: '80px' }}>
                        <FaCheck size={40} />
                    </div>
                    <h3 className="fw-bold mb-3 text-dark">¡Cuenta Creada!</h3>
                    <p className="text-muted mb-4 px-md-3">
                        Te hemos enviado un correo a <strong className="text-dark">{registerData.email}</strong> con las instrucciones para activar tu cuenta.
                        <br/><br/>
                        <small>Revisa tu bandeja de entrada o carpeta de spam para poder iniciar sesión.</small>
                    </p>
                    <Button variant="primary" size="lg" className="rounded-pill px-5 fw-bold shadow-sm w-100" onClick={onSwitchToLogin}>
                        Entendido, Iniciar Sesión
                    </Button>
                </div>
            ) : (
                <>
                    <p className="text-secondary small mb-4">Únete a Nugar y disfruta de una experiencia de compra unificada.</p>
                    {registerMessage && <Alert variant="danger" className="py-2 small">{registerMessage}</Alert>}
                    <Form onSubmit={onRegister}>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Nombre Completo</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Juan Perez"
                                className="py-2 rounded-3"
                                value={registerData.name}
                                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Correo Electrónico</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="tu@email.com"
                                className="py-2 rounded-3"
                                value={registerData.email}
                                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Teléfono / WhatsApp</Form.Label>
                            <Form.Control
                                type="tel"
                                inputMode="tel"
                                placeholder="Ej: 04141234567"
                                className="py-2 rounded-3"
                                value={registerData.phone}
                                onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Cédula / RIF</Form.Label>
                            <Form.Control
                                type="text"
                                inputMode="numeric"
                                placeholder="Ej: 12345678"
                                className="py-2 rounded-3"
                                value={registerData.cedula}
                                onChange={(e) => setRegisterData({ ...registerData, cedula: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold">Contraseña</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                className="py-2 rounded-3"
                                value={registerData.password}
                                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Button variant="success" type="submit" className="w-100 py-2 fw-bold shadow-sm" disabled={registerLoading}>
                            {registerLoading ? "Registrando..." : "Registrarse"}
                        </Button>
                    </Form>
                    <div className="text-center mt-3">
                        <small className="text-secondary">¿Ya tienes cuenta? <span className="fw-bold text-primary" onClick={onSwitchToLogin} style={{ cursor: 'pointer' }}>Inicia Sesión</span></small>
                    </div>
                </>
            )}
        </Modal.Body>
    </Modal>
);

export const ForgotPasswordModal = ({
    show, onHide, forgotEmail, setForgotEmail,
    forgotMessage, forgotSuccess, forgotLoading, onForgotPassword
}) => (
    <Modal show={show} onHide={onHide} centered scrollable className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">Recuperar Contraseña</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
            <p className="text-secondary small mb-4">Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.</p>
            {forgotMessage && <Alert variant={forgotSuccess ? "success" : "danger"} className="py-2 small">{forgotMessage}</Alert>}
            <Form onSubmit={onForgotPassword}>
                <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold">Correo Electrónico</Form.Label>
                    <Form.Control
                        type="email"
                        placeholder="tu@email.com"
                        className="py-2 rounded-3"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                    />
                </Form.Group>
                {!forgotSuccess ? (
                    <Button variant="primary" type="submit" className="w-100 py-2 fw-bold shadow-sm" disabled={forgotLoading}>
                        {forgotLoading ? "Enviando..." : "Recuperar Contraseña"}
                    </Button>
                ) : (
                    <Button variant="secondary" className="w-100 py-2 fw-bold shadow-sm" onClick={onHide}>
                        Cerrar
                    </Button>
                )}
            </Form>
        </Modal.Body>
    </Modal>
);
