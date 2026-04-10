import React from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';

/**
 * Auth Modals — Login and Register modals for the marketplace.
 */
export const LoginModal = ({
    show, onHide, loginData, setLoginData, loginError,
    loginLoading, onLogin, onSwitchToRegister
}) => (
    <Modal show={show} onHide={onHide} centered className="rounded-4 overflow-hidden">
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
                <small><span className="text-muted" style={{ cursor: 'default' }}>¿Olvidaste tu contraseña? Contáctanos.</span></small>
            </div>
        </Modal.Body>
    </Modal>
);

export const RegisterModal = ({
    show, onHide, registerData, setRegisterData,
    registerMessage, registerSuccess, onRegister, onSwitchToLogin
}) => (
    <Modal show={show} onHide={onHide} centered className="rounded-4 overflow-hidden">
        <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">Crear Cuenta</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
            <p className="text-secondary small mb-4">Únete a Tiendario y disfruta de una experiencia de compra unificada.</p>
            {registerMessage && <Alert variant={registerSuccess ? "success" : "danger"} className="py-2 small">{registerMessage}</Alert>}
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
                        placeholder="+58 412 1234567"
                        className="py-2 rounded-3"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
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
                {!registerSuccess && (
                    <Button variant="success" type="submit" className="w-100 py-2 fw-bold shadow-sm">
                        Registrarse
                    </Button>
                )}
                {registerSuccess && (
                    <Button variant="primary" className="w-100 py-2 fw-bold shadow-sm" onClick={onSwitchToLogin}>
                        Iniciar Sesión Ahora
                    </Button>
                )}
            </Form>
            <div className="text-center mt-3">
                <small className="text-secondary">¿Ya tienes cuenta? <span className="fw-bold text-primary" onClick={onSwitchToLogin} style={{ cursor: 'pointer' }}>Inicia Sesión</span></small>
            </div>
        </Modal.Body>
    </Modal>
);
