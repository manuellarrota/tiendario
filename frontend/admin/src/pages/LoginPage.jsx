import React, { useState } from "react";
import { Form, Button, Alert, Container, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AuthService from "../services/auth.service";

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        AuthService.login(username, password, rememberMe).then(
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

                // Custom handling for 401
                if (error.response && error.response.status === 401) {
                    resMessage = "Usuario o contraseña incorrectos.";
                }

                setLoading(false);
                setMessage(resMessage);
            }
        );
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
            <Card className="glass-panel p-4 shadow border-0" style={{ width: "400px" }}>
                <h2 className="text-center mb-4">Tiendario - Iniciar Sesión</h2>
                <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>Usuario</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Ingresa tu usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="bg-white text-dark border"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formBasicPassword">
                        <Form.Label>Contraseña</Form.Label>
                        <Form.Control
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="bg-white text-dark border"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formBasicCheckbox">
                        <Form.Check
                            type="checkbox"
                            label="Recuérdame"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                    </Form.Group>

                    {message && (
                        <Alert variant="danger">
                            {message}
                        </Alert>
                    )}

                    <Button variant="primary" type="submit" className="w-100 mt-2" disabled={loading}>
                        {loading ? "Cargando..." : "Ingresar"}
                    </Button>
                </Form>

                <div className="text-center mt-3">
                    <small>¿No tienes una cuenta? <span className="text-primary fw-bold" style={{ cursor: 'pointer' }} onClick={() => navigate('/register')}>Regístrate aquí</span></small>
                </div>
            </Card>
        </Container>
    );
};

export default LoginPage;
