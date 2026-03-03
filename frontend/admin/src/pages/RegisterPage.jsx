import React, { useState } from "react";
import { Form, Button, Alert, Container, Card } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthService from "../services/auth.service";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Arreglo para los íconos por defecto de Leaflet en React
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

const RegisterPage = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [successful, setSuccessful] = useState(false);
    const [message, setMessage] = useState("");
    const [position, setPosition] = useState(null);

    const [searchParams] = useSearchParams();
    const plan = searchParams.get("plan") || "free"; // 'free' or 'premium'

    const navigate = useNavigate();

    const handleRegister = (e) => {
        e.preventDefault();
        setMessage("");
        setSuccessful(false);

        // Default role is manager for new registers via this form
        const lat = position ? position.lat : 0;
        const lng = position ? position.lng : 0;

        AuthService.register(username, email, password, "manager", companyName, phoneNumber, lat, lng).then(
            () => {
                setMessage("✅ Registro exitoso. Cuenta creada pero INACTIVA. Revisa 'backend/verification_links.txt' para activar tu cuenta antes de iniciar sesión.");
                setSuccessful(true);
                setTimeout(() => {
                    navigate("/");
                }, 2000);
            },
            (error) => {
                const message =
                    (error.response &&
                        error.response.data &&
                        error.response.data.message) ||
                    error.message ||
                    error.toString();

                let userFriendlyMessage = message;

                if (message.includes("400")) {
                    userFriendlyMessage = "Error en el registro. Verifique que el usuario no exista ya.";
                } else if (message.includes("Network Error")) {
                    userFriendlyMessage = "Error de conexión. Intente más tarde.";
                }

                setMessage(userFriendlyMessage);
                setSuccessful(false);
            }
        );
    };

    return (
        <div className="min-vh-100 bg-light d-flex flex-column">
            {/* Header */}
            <div className="bg-white py-3 shadow-sm border-bottom">
                <Container className="d-flex align-items-center">
                    <div className="d-flex align-items-center gap-2 text-decoration-none text-dark" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                        <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: 35, height: 35 }}>
                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
                                <path d="M528 128V16c0-8.8-7.2-16-16-16H64c-8.8 0-16 7.2-16 16v112H8c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h24v304c0 17.7 14.3 32 32 32h448c17.7 0 32-14.3 32-32V160h24c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8h-40zM112 448V160h352v288H112zM96 48h384v64H96V48zm336 176v160H144V224h288z"></path>
                            </svg>
                        </div>
                        <span className="fs-5 fw-bold">Tiendario <span className="text-primary">Admin</span></span>
                    </div>
                </Container>
            </div>

            <Container className="d-flex justify-content-center align-items-center flex-grow-1 py-5">
                <Card className="glass-panel p-4 shadow border-0" style={{ width: "500px", maxWidth: "100%" }}>
                    <h2 className="text-center mb-2">Registrar Nueva Tienda</h2>
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

                        <Form.Group className="mb-3" controlId="formBasicEmailAddr">
                            <Form.Label>Correo Electrónico</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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

                        <Form.Group className="mb-3" controlId="formPhoneNumber">
                            <Form.Label>Teléfono de Contacto</Form.Label>
                            <Form.Control
                                type="tel"
                                placeholder="+58 412 1234567"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                required
                                className="bg-white text-dark border"
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label>Ubicación de la Tienda en el Mapa</Form.Label>
                            <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
                                <MapContainer center={[10.4806, -66.9036]} zoom={11} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    />
                                    <LocationMarker position={position} setPosition={setPosition} />
                                </MapContainer>
                            </div>
                            <small className="text-secondary mt-1 d-block">
                                Haz clic en el mapa para marcar o actualizar tu ubicación. {position && <span className="text-success fw-bold">(Ubicación registrada)</span>}
                            </small>
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
                        <small>¿Ya tienes una cuenta? <span className="text-primary fw-bold" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Inicia Sesión</span></small>
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
