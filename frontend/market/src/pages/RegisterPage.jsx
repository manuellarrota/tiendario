import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { FaCheckCircle } from 'react-icons/fa';
import AuthService from "../services/auth.service";
import Navbar from "../components/Navbar";

const RegisterPage = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const [successful, setSuccessful] = useState(false);

    const handleRegister = (e) => {
        e.preventDefault();
        AuthService.register(name, email, password).then(
            () => {
                // Auto login after successful registration
                AuthService.login(email, password).then(
                    () => {
                        navigate("/");
                        window.location.reload();
                    },
                    (error) => {
                        // If login fails, show success but ask to login manually
                        setSuccessful(true);
                    }
                );
            },
            (error) => {
                const resMessage =
                    (error.response &&
                        error.response.data &&
                        error.response.data.message) ||
                    error.message ||
                    error.toString();
                setError(resMessage);
            }
        );
    };

    if (successful) {
        return (
            <div className="min-vh-100 bg-light d-flex flex-column">
                <Navbar />
                <Container className="d-flex flex-column justify-content-center align-items-center flex-grow-1 py-5">
                    <Card style={{ width: "400px" }} className="shadow border-0 text-center p-4 rounded-4">
                        <Card.Body>
                            <div className="mb-4 text-success display-1">
                                <FaCheckCircle />
                            </div>
                            <h2 className="mb-3 fw-bold text-success">¡Registro Exitoso!</h2>
                            <p className="text-muted mb-4">
                                Tu cuenta ha sido creada. Ya puedes iniciar sesión.
                            </p>
                            <div className="d-grid gap-2">
                                <Button variant="primary" onClick={() => navigate("/login")} className="rounded-pill">
                                    Iniciar Sesión para comprar
                                </Button>
                                <Button variant="outline-secondary" onClick={() => navigate("/")} className="rounded-pill">
                                    Volver a la Tienda
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Container>
                <div className="py-4 text-center text-secondary small">
                    &copy; 2026 Tiendario Inc. Hecho con ❤️ para emprendedores.
                </div>
            </div>
        );
    }

    return (
        <div className="min-vh-100 bg-light d-flex flex-column">
            <Navbar />
            <Container className="d-flex flex-column justify-content-center align-items-center flex-grow-1 py-5">
                <Card style={{ width: "400px" }} className="shadow border-0 rounded-4">
                    <Card.Body className="p-4">
                        <h2 className="text-center mb-4 fw-bold text-success">Crear Cuenta</h2>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form onSubmit={handleRegister}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre Completo</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder="Juan Perez"
                                    className="rounded-3"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="tu@email.com"
                                    className="rounded-3"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Contraseña</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Minimo 6 caracteres"
                                    className="rounded-3"
                                />
                            </Form.Group>

                            <Button variant="success" type="submit" className="w-100 mb-3 rounded-pill fw-bold">
                                Registrarse
                            </Button>
                        </Form>
                        <div className="text-center">
                            <small>¿Ya tienes cuenta? <Link to="/login" className="text-decoration-none fw-bold">Inicia Sesión</Link></small>
                            <br />
                            <small><Link to="/" className="text-muted">Volver a la Tienda</Link></small>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
            <div className="py-4 text-center text-secondary small">
                &copy; 2026 Tiendario Inc. Hecho con ❤️ para emprendedores.
            </div>
        </div>
    );
};

export default RegisterPage;
