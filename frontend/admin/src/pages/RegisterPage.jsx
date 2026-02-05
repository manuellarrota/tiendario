import React, { useState, useEffect } from "react";
import { Form, Button, Alert, Container, Card } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthService from "../services/auth.service";

const RegisterPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [successful, setSuccessful] = useState(false);
    const [message, setMessage] = useState("");

    const [searchParams] = useSearchParams();
    const plan = searchParams.get("plan") || "free"; // 'free' or 'premium'

    const navigate = useNavigate();

    const handleRegister = (e) => {
        e.preventDefault();
        setMessage("");
        setSuccessful(false);

        // Default role is manager for new registers via this form
        AuthService.register(username, password, "manager", companyName).then(
            (response) => {
                setMessage("✅ Registro exitoso. Redirigiendo al login...");
                setSuccessful(true);
                setTimeout(() => {
                    navigate("/");
                }, 2000);
            },
            (error) => {
                const resMessage =
                    (error.response &&
                        error.response.data &&
                        error.response.data.message) ||
                    error.message ||
                    error.toString();

                setMessage(resMessage);
                setSuccessful(false);
            }
        );
    };

    return (
        <div className="min-vh-100 bg-light d-flex flex-column">
            {/* Header */}
            <div className="bg-white py-3 shadow-sm border-bottom">
                <Container className="d-flex align-items-center">
                    <div className="d-flex align-items-center gap-2 text-decoration-none text-dark" style={{ cursor: 'pointer' }} onClick={() => window.location.href = 'http://localhost:8080'}>
                        <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: 35, height: 35 }}>
                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
                                <path d="M528 128V16c0-8.8-7.2-16-16-16H64c-8.8 0-16 7.2-16 16v112H8c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h24v304c0 17.7 14.3 32 32 32h448c17.7 0 32-14.3 32-32V160h24c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8h-40zM112 448V160h352v288H112zM96 48h384v64H96V48zm336 176v160H144V224h288z"></path>
                            </svg>
                        </div>
                        <span className="fs-5 fw-bold">Tiendario <span className="text-primary">Admin</span></span>
                    </div>
                </Container>
            </div>

            <Container className="d-flex justify-content-center align-items-center flex-grow-1">
                <Card className="glass-panel p-4 shadow border-0" style={{ width: "400px" }}>
                    <h2 className="text-center mb-2">Crear Tienda</h2>
                    <p className="text-center text-secondary mb-4">Plan Seleccionado: <strong className="text-uppercase text-primary">{plan}</strong></p>

                    <Form onSubmit={handleRegister}>
                        <Form.Group className="mb-3" controlId="formCompanyName">
                            <Form.Label>Nombre de tu Empresa</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Ej. Tienda de Pedro"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                className="bg-white text-dark border"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicEmail">
                            <Form.Label>Usuario (Admin)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Elige un nombre de usuario"
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
                                placeholder="Contraseña segura"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-white text-dark border"
                            />
                        </Form.Group>

                        {message && (
                            <Alert variant={successful ? "success" : "danger"}>
                                {message}
                            </Alert>
                        )}

                        <Button variant="primary" type="submit" className="w-100 mt-2">
                            Registrar Empresa
                        </Button>
                    </Form>

                    <div className="text-center mt-3">
                        <small>¿Ya tienes una cuenta? <span className="text-primary fw-bold" style={{ cursor: 'pointer' }} onClick={() => navigate('/login')}>Inicia Sesión</span></small>
                    </div>
                </Card>
            </Container>

            {/* Footer */}
            <div className="py-4 text-center text-secondary small">
                &copy; 2026 Tiendario Inc. Panel de Administración para Vendedores.
            </div>
        </div>
    );
};

export default RegisterPage;
