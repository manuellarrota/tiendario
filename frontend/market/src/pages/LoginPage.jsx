import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Container, Card, Form, Button, Alert, Modal, Spinner } from "react-bootstrap";
import AuthService from "../services/auth.service";
import axios from "axios";

import Navbar from "../components/Navbar";

const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const API_URL = import.meta.env.VITE_API_URL;

    // Forgot password state
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotMsg, setForgotMsg] = useState("");
    const [forgotOk, setForgotOk] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);

    // Reset password state
    const [showReset, setShowReset] = useState(false);
    const [resetToken, setResetToken] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [resetMsg, setResetMsg] = useState("");
    const [resetOk, setResetOk] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) { setResetToken(token); setShowReset(true); }
    }, [searchParams]);

    const handleLogin = (e) => {
        e.preventDefault();
        AuthService.login(email, password).then(
            () => {
                navigate("/dashboard");
                window.location.reload();
            },
            (error) => {
                let resMessage =
                    (error.response &&
                        error.response.data &&
                        error.response.data.message) ||
                    error.message ||
                    error.toString();

                if (error.response && error.response.status === 401) {
                    resMessage = "Usuario o contraseña incorrectos.";
                }

                setError(resMessage);
            }
        );
    };

    const handleForgot = (e) => {
        e.preventDefault();
        setForgotLoading(true); setForgotMsg("");
        axios.post(API_URL + '/auth/forgot-password', { email: forgotEmail })
            .then(r => { setForgotMsg(r.data.message); setForgotOk(true); setForgotLoading(false); })
            .catch(e => { setForgotMsg(e.response?.data?.message || "Error"); setForgotOk(false); setForgotLoading(false); });
    };

    const handleReset = (e) => {
        e.preventDefault();
        if (newPass !== confirmPass) { setResetMsg("Las contraseñas no coinciden."); return; }
        if (newPass.length < 6) { setResetMsg("Mínimo 6 caracteres."); return; }
        setResetLoading(true); setResetMsg("");
        axios.post(API_URL + '/auth/reset-password', { token: resetToken, newPassword: newPass })
            .then(r => { setResetMsg(r.data.message); setResetOk(true); setResetLoading(false); })
            .catch(e => { setResetMsg(e.response?.data?.message || "Error"); setResetOk(false); setResetLoading(false); });
    };

    return (
        <div className="min-vh-100 bg-light">
            <Navbar />
            <Container className="d-flex justify-content-center align-items-center" style={{ height: "calc(100vh - 80px)" }}>
                <Card style={{ width: "400px", borderRadius: '24px' }} className="shadow-lg border-0 market-card">
                    <Card.Body className="p-4">
                        <h2 className="text-center mb-4 fw-bold text-primary">Iniciar Sesión</h2>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form onSubmit={handleLogin}>
                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="tu@email.com"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Contraseña</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="********"
                                />
                            </Form.Group>

                            <Button variant="primary" type="submit" className="w-100 mb-3">
                                Ingresar
                            </Button>
                        </Form>
                        <div className="text-center">
                            <small>¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link></small>
                            <br />
                            <small><a href="#" onClick={(e) => { e.preventDefault(); setShowForgot(true); setForgotMsg(''); setForgotEmail(''); setForgotOk(false); }}>¿Olvidaste tu contraseña?</a></small>
                            <br />
                            <small><Link to="/">Volver a la Tienda</Link></small>
                        </div>
                    </Card.Body>
                </Card>
            </Container>

            {/* Forgot Password Modal */}
            <Modal show={showForgot} onHide={() => setShowForgot(false)} centered>
                <Modal.Header closeButton className="border-0"><Modal.Title className="fw-bold">Recuperar Contraseña</Modal.Title></Modal.Header>
                <Modal.Body className="p-4">
                    <Form onSubmit={handleForgot}>
                        <Form.Control type="text" placeholder="Email o usuario" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required className="mb-3 rounded-3 py-2" />
                        {forgotMsg && <Alert variant={forgotOk ? "success" : "danger"} className="small py-2">{forgotMsg}</Alert>}
                        {!forgotOk ? (
                            <Button variant="primary" type="submit" className="w-100 rounded-pill" disabled={forgotLoading}>
                                {forgotLoading ? <Spinner size="sm" animation="border" /> : "Enviar Instrucciones"}
                            </Button>
                        ) : (
                            <Button variant="secondary" className="w-100 rounded-pill" onClick={() => setShowForgot(false)}>Cerrar</Button>
                        )}
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Reset Password Modal */}
            <Modal show={showReset} onHide={() => setShowReset(false)} centered>
                <Modal.Header closeButton className="border-0"><Modal.Title className="fw-bold">Nueva Contraseña</Modal.Title></Modal.Header>
                <Modal.Body className="p-4">
                    <Form onSubmit={handleReset}>
                        <Form.Control type="password" placeholder="Nueva contraseña" value={newPass} onChange={e => setNewPass(e.target.value)} required className="mb-3 rounded-3 py-2" />
                        <Form.Control type="password" placeholder="Confirmar contraseña" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required className="mb-3 rounded-3 py-2" />
                        {resetMsg && <Alert variant={resetOk ? "success" : "danger"} className="small py-2">{resetMsg}</Alert>}
                        {!resetOk ? (
                            <Button variant="primary" type="submit" className="w-100 rounded-pill" disabled={resetLoading}>
                                {resetLoading ? <Spinner size="sm" animation="border" /> : "Restablecer"}
                            </Button>
                        ) : (
                            <Button variant="success" className="w-100 rounded-pill" onClick={() => { setShowReset(false); navigate('/login'); }}>Ir a Login</Button>
                        )}
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default LoginPage;
