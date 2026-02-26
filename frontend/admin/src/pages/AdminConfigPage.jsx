import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { FaCogs, FaSave, FaExclamationTriangle, FaEnvelope, FaPhone, FaBullhorn, FaCreditCard, FaMoneyBillWave } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';

const AdminConfigPage = () => {
    const [config, setConfig] = useState({
        freePlanProductLimit: 20,
        premiumPlanMonthlyPrice: 25.00,
        trialDays: 30,
        maintenanceMode: false,
        announcementMessage: "",
        contactEmail: "",
        contactPhone: "",
        exchangeRate: 36.50,
        enableSecondaryCurrency: true,
        secondaryCurrencyLabel: "VES",
        secondaryCurrencySymbol: "Bs."
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = () => {
        setLoading(true);
        AdminService.getPlatformConfig().then(
            (response) => {
                setConfig(response.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading config", error);
                setError("No se pudo cargar la configuración de la plataforma.");
                setLoading(false);
            }
        );
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: (type === 'checkbox' || type === 'switch') ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");

        AdminService.updatePlatformConfig(config).then(
            () => {
                setSaving(false);
                setSuccess("Configuración actualizada correctamente.");
                window.scrollTo(0, 0);
            },
            (err) => {
                setSaving(false);
                setError("Error al guardar la configuración.");
            }
        );
    };

    if (loading) {
        return (
            <div className="d-flex" style={{ height: '100vh' }}>
                <Sidebar />
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                    <Spinner animation="border" variant="primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="d-flex admin-content-area overflow-hidden">
            <Sidebar />
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto' }}>
                <Container className="py-4">
                    <h2 className="mb-4 d-flex align-items-center">
                        <FaCogs className="me-3 text-secondary" />
                        Configuración de la Plataforma
                    </h2>

                    {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
                    {success && <Alert variant="success" dismissible onClose={() => setSuccess("")}>{success}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col lg={7}>
                                {/* Membresías y Límites */}
                                <Card className="border-0 shadow-sm rounded-4 mb-4">
                                    <Card.Body className="p-4">
                                        <h5 className="fw-bold mb-4 d-flex align-items-center">
                                            <FaCreditCard className="me-2 text-primary" /> Planes y Membresías
                                        </h5>
                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">LÍMITE PRODUCTOS (FREE)</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        name="freePlanProductLimit"
                                                        value={config.freePlanProductLimit}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">PRECIO PREMIUM (USD)</Form.Label>
                                                    <InputGroup>
                                                        <InputGroup.Text>$</InputGroup.Text>
                                                        <Form.Control
                                                            type="number"
                                                            step="0.01"
                                                            name="premiumPlanMonthlyPrice"
                                                            value={config.premiumPlanMonthlyPrice}
                                                            onChange={handleChange}
                                                            required
                                                        />
                                                    </InputGroup>
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">DÍAS DE PRUEBA (TRIAL)</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        name="trialDays"
                                                        value={config.trialDays}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>

                                {/* Comunicación */}
                                <Card className="border-0 shadow-sm rounded-4 mb-4">
                                    <Card.Body className="p-4">
                                        <h5 className="fw-bold mb-4 d-flex align-items-center">
                                            <FaBullhorn className="me-2 text-warning" /> Comunicación Global
                                        </h5>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold text-muted">ANUNCIO EN MARKETPLACE</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                name="announcementMessage"
                                                value={config.announcementMessage}
                                                onChange={handleChange}
                                                placeholder="Ej: ¡Ofertas de fin de semana!"
                                            />
                                            <Form.Text className="text-muted">Este mensaje aparecerá en el encabezado del Marketplace público.</Form.Text>
                                        </Form.Group>

                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">EMAIL SOPORTE</Form.Label>
                                                    <InputGroup>
                                                        <InputGroup.Text><FaEnvelope /></InputGroup.Text>
                                                        <Form.Control
                                                            type="email"
                                                            name="contactEmail"
                                                            value={config.contactEmail}
                                                            onChange={handleChange}
                                                        />
                                                    </InputGroup>
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">TELÉFONO SOPORTE</Form.Label>
                                                    <InputGroup>
                                                        <InputGroup.Text><FaPhone /></InputGroup.Text>
                                                        <Form.Control
                                                            type="text"
                                                            name="contactPhone"
                                                            value={config.contactPhone}
                                                            onChange={handleChange}
                                                        />
                                                    </InputGroup>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>

                                {/* Configuración de Moneda */}
                                <Card className="border-0 shadow-sm rounded-4 mb-4">
                                    <Card.Body className="p-4">
                                        <h5 className="fw-bold mb-4 d-flex align-items-center">
                                            <FaMoneyBillWave className="me-2 text-success" /> Configuración de Moneda (Múltiples Divisas)
                                        </h5>
                                        <div className="mb-4 p-3 bg-success bg-opacity-10 rounded-3">
                                            <Form.Check
                                                type="switch"
                                                id="secondary-currency-switch"
                                                label="Habilitar Segunda Moneda"
                                                name="enableSecondaryCurrency"
                                                checked={config.enableSecondaryCurrency}
                                                onChange={handleChange}
                                                className="fw-bold text-success"
                                            />
                                            <p className="small text-muted mb-0 mt-2">Permite mostrar precios duales (ej: USD y VES) en el POS y Marketplace.</p>
                                        </div>

                                        {config.enableSecondaryCurrency && (
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-bold text-muted">TASA DE CAMBIO (1 USD = ?)</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            step="0.01"
                                                            name="exchangeRate"
                                                            value={config.exchangeRate}
                                                            onChange={handleChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-bold text-muted">ETIQUETA (EJ: VES)</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="secondaryCurrencyLabel"
                                                            value={config.secondaryCurrencyLabel}
                                                            onChange={handleChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-bold text-muted">SÍMBOLO (EJ: BS.)</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="secondaryCurrencySymbol"
                                                            value={config.secondaryCurrencySymbol}
                                                            onChange={handleChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col lg={5}>
                                {/* Estado del Sistema */}
                                <Card className="border-0 shadow-sm rounded-4 mb-4">
                                    <Card.Body className="p-4">
                                        <h5 className="fw-bold mb-4 d-flex align-items-center">
                                            <FaExclamationTriangle className="me-2 text-danger" /> Control de Sistema
                                        </h5>
                                        <div className="p-3 bg-light rounded-3 mb-4 border-start border-danger border-4">
                                            <Form.Check
                                                type="switch"
                                                id="maintenance-switch"
                                                label="Modo Mantenimiento"
                                                name="maintenanceMode"
                                                checked={config.maintenanceMode}
                                                onChange={handleChange}
                                                className="fw-bold text-danger"
                                            />
                                            <p className="small text-muted mb-0 mt-2">
                                                Activar esto bloqueará el acceso a todas las tiendas y al marketplace para realizar tareas técnicas.
                                            </p>
                                        </div>

                                        <div className="d-grid">
                                            <Button variant="primary" type="submit" size="lg" className="rounded-pill py-3 fw-bold" disabled={saving}>
                                                {saving ? <Spinner size="sm" animation="border" /> : <><FaSave className="me-2" /> Guardar Cambios</>}
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>

                                <Card className="border-0 shadow-sm rounded-4 bg-dark text-white">
                                    <Card.Body className="p-4">
                                        <h6 className="fw-bold text-info"><FaCogs className="me-2" /> Nota del sistema</h6>
                                        <p className="small opacity-75 mb-0">
                                            Los cambios realizados en esta sección afectan a todos los tenants de forma inmediata.
                                            Asegúrate de comunicar cambios de precios o límites de productos con antelación.
                                        </p>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Form>
                </Container>
            </div>
        </div>
    );
};

export default AdminConfigPage;
