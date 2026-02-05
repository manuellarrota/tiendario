import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import AuthService from "../services/auth.service";

import Navbar from "../components/Navbar";

const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

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
                            <small><Link to="/">Volver a la Tienda</Link></small>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default LoginPage;
