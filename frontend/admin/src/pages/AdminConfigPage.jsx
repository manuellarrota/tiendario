import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, InputGroup, Table, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaCogs, FaSave, FaExclamationTriangle, FaEnvelope, FaPhone, FaBullhorn, FaCreditCard, FaMoneyBillWave, FaPlus, FaTrash, FaExchangeAlt } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';

const AdminConfigPage = () => {
    const [config, setConfig] = useState({
        basicPlanMonthlyPrice: 19.99,
        mediumPlanMonthlyPrice: 29.99,
        premiumPlanMonthlyPrice: 49.99,
        extraRegisterMonthlyPrice: 5.00,
        trialDays: 30,
        maintenanceMode: false,
        announcementMessage: "",
        contactEmail: "",
        contactPhone: "",
        exchangeRate: 36.50,
        enableSecondaryCurrency: true,
        secondaryCurrencyLabel: "VES",
        secondaryCurrencySymbol: "Bs.",
        paymentInfoZelle: "pagos@nugar.com (Antigravity Inc)",
        paymentZelleEnabled: true,
        paymentInfoBinance: "Pay ID: 12345678 | Alias: NugarApp",
        paymentBinanceEnabled: true,
        paymentInfoPagoMovil: "0102 - 0412-0000000 - V-12345678",
        paymentPagoMovilEnabled: true,
        paymentInfoTransferencia: "Banco Banesco, Cuenta Corriente 0134-..., Antigravity Inc, J-123456789",
        paymentTransferenciaEnabled: true,
        paymentEfectivoEnabled: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [currencies, setCurrencies] = useState([]);

    const loadConfig = () => {
        setLoading(true);
        AdminService.getPlatformConfig().then(
            (response) => {
                setConfig(response.data);
                try {
                    setCurrencies(JSON.parse(response.data.currencies || '[]'));
                } catch { setCurrencies([]); }
                setLoading(false);
            },
            (error) => {
                console.error("Error loading config", error);
                setError("No se pudo cargar la configuración de la plataforma.");
                setLoading(false);
            }
        );
    };

    useEffect(() => {
        loadConfig();
    }, []);

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

        const configToSave = { 
            ...config, 
            basicPlanMonthlyPrice: parseFloat(config.basicPlanMonthlyPrice || 19.99).toFixed(2),
            mediumPlanMonthlyPrice: parseFloat(config.mediumPlanMonthlyPrice || 29.99).toFixed(2),
            premiumPlanMonthlyPrice: parseFloat(config.premiumPlanMonthlyPrice || 49.99).toFixed(2),
            extraRegisterMonthlyPrice: parseFloat(config.extraRegisterMonthlyPrice || 5.00).toFixed(2),
            currencies: JSON.stringify(currencies) 
        };

        AdminService.updatePlatformConfig(configToSave).then(
            () => {
                setSaving(false);
                setSuccess("Configuración actualizada correctamente.");
                window.scrollTo(0, 0);
            },
            () => {
                setSaving(false);
                setError("Error al guardar la configuración.");
            }
        );
    };

    const addCurrency = () => {
        setCurrencies([...currencies, { code: '', symbol: '', name: '', rate: 1.0, enabled: true }]);
    };

    const updateCurrency = (index, field, value) => {
        const updated = [...currencies];
        updated[index] = { ...updated[index], [field]: field === 'rate' ? parseFloat(value) || 0 : field === 'enabled' ? value : value };
        setCurrencies(updated);
    };

    const removeCurrency = (index) => {
        setCurrencies(currencies.filter((_, i) => i !== index));
    };

    if (loading) {
        return (
            <Layout>
                <div className="d-flex align-items-center justify-content-center h-100">
                    <Spinner animation="border" variant="primary" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Container className="py-2">
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
                                                <Form.Label className="small fw-bold text-muted">PRECIO BÁSICO (USD)</Form.Label>
                                                <InputGroup>
                                                    <InputGroup.Text>$</InputGroup.Text>
                                                    <Form.Control
                                                        type="number"
                                                        step="0.01"
                                                        name="basicPlanMonthlyPrice"
                                                        value={config.basicPlanMonthlyPrice || 19.99}
                                                        onChange={handleChange}
                                                        onFocus={e => e.target.select()}
                                                        required
                                                    />
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold text-muted">PRECIO MEDIUM (USD)</Form.Label>
                                                <InputGroup>
                                                    <InputGroup.Text>$</InputGroup.Text>
                                                    <Form.Control
                                                        type="number"
                                                        step="0.01"
                                                        name="mediumPlanMonthlyPrice"
                                                        value={config.mediumPlanMonthlyPrice || 29.99}
                                                        onChange={handleChange}
                                                        onFocus={e => e.target.select()}
                                                        required
                                                    />
                                                </InputGroup>
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
                                                        value={config.premiumPlanMonthlyPrice || 49.99}
                                                        onChange={handleChange}
                                                        onFocus={e => e.target.select()}
                                                        required
                                                    />
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold text-muted">PRECIO CAJA EXTRA (USD/MES)</Form.Label>
                                                <InputGroup>
                                                    <InputGroup.Text>$</InputGroup.Text>
                                                    <Form.Control
                                                        type="number"
                                                        step="0.01"
                                                        name="extraRegisterMonthlyPrice"
                                                        value={config.extraRegisterMonthlyPrice || 5.00}
                                                        onChange={handleChange}
                                                        onFocus={e => e.target.select()}
                                                        required
                                                    />
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold text-muted">DÍAS DE PRUEBA</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    name="trialDays"
                                                    value={config.trialDays}
                                                    onChange={handleChange}
                                                    onFocus={e => e.target.select()}
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

                            {/* Información de Pagos */}
                            <Card className="border-0 shadow-sm rounded-4 mb-4">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-4 d-flex align-items-center">
                                        <FaMoneyBillWave className="me-2 text-success" /> Información de Pagos (Membresías)
                                    </h5>
                                    
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <Form.Label className="small fw-bold text-muted mb-0">ZELLE</Form.Label>
                                            <Form.Check type="switch" id="zelle-switch" name="paymentZelleEnabled" checked={config.paymentZelleEnabled} onChange={handleChange} label="Habilitar" />
                                        </div>
                                        <Form.Control as="textarea" rows={2} name="paymentInfoZelle" value={config.paymentInfoZelle} onChange={handleChange} placeholder="Ej: pagos@nugar.com (Antigravity Inc)" disabled={!config.paymentZelleEnabled} />
                                    </div>

                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <Form.Label className="small fw-bold text-muted mb-0">BINANCE / CRYPTO</Form.Label>
                                            <Form.Check type="switch" id="binance-switch" name="paymentBinanceEnabled" checked={config.paymentBinanceEnabled} onChange={handleChange} label="Habilitar" />
                                        </div>
                                        <Form.Control as="textarea" rows={2} name="paymentInfoBinance" value={config.paymentInfoBinance} onChange={handleChange} placeholder="Ej: Pay ID: 12345678 | Alias: NugarApp" disabled={!config.paymentBinanceEnabled} />
                                    </div>

                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <Form.Label className="small fw-bold text-muted mb-0">PAGO MÓVIL</Form.Label>
                                            <Form.Check type="switch" id="pagomovil-switch" name="paymentPagoMovilEnabled" checked={config.paymentPagoMovilEnabled} onChange={handleChange} label="Habilitar" />
                                        </div>
                                        <Form.Control as="textarea" rows={2} name="paymentInfoPagoMovil" value={config.paymentInfoPagoMovil} onChange={handleChange} placeholder="Ej: 0102 - 0412-0000000 - V-12345678" disabled={!config.paymentPagoMovilEnabled} />
                                    </div>

                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <Form.Label className="small fw-bold text-muted mb-0">TRANSFERENCIA BANCARIA</Form.Label>
                                            <Form.Check type="switch" id="transferencia-switch" name="paymentTransferenciaEnabled" checked={config.paymentTransferenciaEnabled} onChange={handleChange} label="Habilitar" />
                                        </div>
                                        <Form.Control as="textarea" rows={2} name="paymentInfoTransferencia" value={config.paymentInfoTransferencia} onChange={handleChange} placeholder="Ej: Banco Banesco, Cuenta Corriente..." disabled={!config.paymentTransferenciaEnabled} />
                                    </div>
                                    
                                    <div className="mb-2 p-3 bg-light rounded-3 d-flex justify-content-between align-items-center border">
                                        <div>
                                            <Form.Label className="small fw-bold text-muted mb-0 d-block">EFECTIVO (LOCAL)</Form.Label>
                                            <small className="text-muted">Permite registrar pagos en efectivo en persona.</small>
                                        </div>
                                        <Form.Check type="switch" id="efectivo-switch" name="paymentEfectivoEnabled" checked={config.paymentEfectivoEnabled} onChange={handleChange} />
                                    </div>
                                </Card.Body>
                            </Card>


                            {/* Configuración de Monedas */}
                            <Card className="border-0 shadow-sm rounded-4 mb-4">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-4 d-flex align-items-center">
                                        <FaMoneyBillWave className="me-2 text-success" /> Configuración de Monedas
                                    </h5>

                                    {/* Base Currency */}
                                    <div className="mb-4 p-3 bg-primary bg-opacity-10 rounded-3">
                                        <p className="small fw-bold text-primary mb-2"><FaExchangeAlt className="me-1" /> Moneda Base (Precios del sistema)</p>
                                        <Row>
                                            <Col md={4}>
                                                <Form.Group className="mb-2">
                                                    <Form.Label className="small fw-bold text-muted">CÓDIGO (EJ: USD)</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="baseCurrencyCode"
                                                        value={config.baseCurrencyCode || 'USD'}
                                                        onChange={handleChange}
                                                        maxLength={5}
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={4}>
                                                <Form.Group className="mb-2">
                                                    <Form.Label className="small fw-bold text-muted">SÍMBOLO (EJ: $)</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="baseCurrencySymbol"
                                                        value={config.baseCurrencySymbol || '$'}
                                                        onChange={handleChange}
                                                        maxLength={5}
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </div>

                                    {/* Multi-currency table */}
                                    <div className="mb-3">
                                        <p className="small fw-bold text-muted mb-2">MONEDAS ADICIONALES PARA COBRO</p>
                                        <p className="small text-muted">Configura las monedas en las que tu tienda puede cobrar. La tasa es cuánto vale 1 unidad de la moneda base.</p>
                                    </div>

                                    {currencies.length > 0 ? (
                                        <Table responsive size="sm" className="align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '80px' }}>Código</th>
                                                    <th style={{ width: '70px' }}>Símbolo</th>
                                                    <th>Nombre</th>
                                                    <th style={{ width: '120px' }}>Tasa (1 {config.baseCurrencyCode || 'USD'} =)</th>
                                                    <th style={{ width: '60px' }}>Activa</th>
                                                    <th style={{ width: '40px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currencies.map((curr, idx) => (
                                                    <tr key={idx}>
                                                        <td>
                                                            <Form.Control
                                                                size="sm"
                                                                type="text"
                                                                value={curr.code}
                                                                onChange={(e) => updateCurrency(idx, 'code', e.target.value.toUpperCase())}
                                                                placeholder="COP"
                                                                maxLength={5}
                                                            />
                                                        </td>
                                                        <td>
                                                            <Form.Control
                                                                size="sm"
                                                                type="text"
                                                                value={curr.symbol}
                                                                onChange={(e) => updateCurrency(idx, 'symbol', e.target.value)}
                                                                placeholder="$"
                                                                maxLength={5}
                                                            />
                                                        </td>
                                                        <td>
                                                            <Form.Control
                                                                size="sm"
                                                                type="text"
                                                                value={curr.name}
                                                                onChange={(e) => updateCurrency(idx, 'name', e.target.value)}
                                                                placeholder="Peso Colombiano"
                                                            />
                                                        </td>
                                                        <td>
                                                            <Form.Control
                                                                size="sm"
                                                                type="number"
                                                                step="0.01"
                                                                value={curr.rate}
                                                                onChange={(e) => updateCurrency(idx, 'rate', e.target.value)}
                                                                onFocus={e => e.target.select()}
                                                            />
                                                        </td>
                                                        <td className="text-center">
                                                            <Form.Check
                                                                type="switch"
                                                                checked={curr.enabled}
                                                                onChange={(e) => updateCurrency(idx, 'enabled', e.target.checked)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <OverlayTrigger overlay={<Tooltip>Eliminar Moneda</Tooltip>}>
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={() => removeCurrency(idx)}
                                                                >
                                                                    <FaTrash />
                                                                </Button>
                                                            </OverlayTrigger>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    ) : (
                                        <div className="text-center text-muted py-3 bg-light rounded-3 mb-3">
                                            <p className="mb-0">No hay monedas adicionales configuradas.</p>
                                            <small>Agrega monedas como COP, VES, EUR, etc.</small>
                                        </div>
                                    )}

                                    <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={addCurrency}
                                        className="d-flex align-items-center"
                                    >
                                        <FaPlus className="me-1" /> Agregar Moneda
                                    </Button>

                                    {/* Preview */}
                                    {currencies.filter(c => c.enabled && c.code).length > 0 && (
                                        <div className="mt-3 p-3 bg-success bg-opacity-10 rounded-3">
                                            <p className="small fw-bold text-success mb-2">Vista previa (ejemplo: $10.00 {config.baseCurrencyCode || 'USD'}):</p>
                                            {currencies.filter(c => c.enabled && c.code).map(c => (
                                                <span key={c.code} className="badge bg-success me-2 mb-1">
                                                    {c.symbol} {(10 * c.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {c.code}
                                                </span>
                                            ))}
                                        </div>
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
                                        Los cambios realizados en esta sección afectan a todas las tiendas de forma inmediata.
                                        Asegúrate de comunicar cambios de precios o límites de productos con antelación.
                                    </p>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Form>
            </Container>
        </Layout>
    );
};

export default AdminConfigPage;
