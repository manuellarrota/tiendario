import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, Button, Form, Modal, Table, Alert, Spinner } from 'react-bootstrap';
import { FaBuilding, FaCrown, FaCheckCircle, FaExclamationTriangle, FaHistory, FaFileUpload, FaInfoCircle, FaEdit, FaSave, FaTimes, FaPhone, FaMapMarkerAlt, FaImage, FaMoneyBillWave, FaClock } from 'react-icons/fa';
import CompanyService from '../services/company.service';
import PaymentService from '../services/payment.service';

import Sidebar from '../components/Sidebar';

const CompanyPage = () => {
    const [company, setCompany] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saveSuccess, setSaveSuccess] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('BASIC');
    const [billingCycle, setBillingCycle] = useState('MONTHLY');

    const PLAN_PRICES = {
        BASIC:   { MONTHLY: 19.99,  ANNUAL: 199.99 },
        MEDIUM:  { MONTHLY: 29.99,  ANNUAL: 299.99 },
        PREMIUM: { MONTHLY: 49.99,  ANNUAL: 499.99 },
    };

    const PLAN_INFO = {
        BASIC:   { label: 'Básico',   registers: 1, features: ['1 caja registradora', 'Ventas presenciales', 'Inventario básico', 'Reportes de ventas'] },
        MEDIUM:  { label: 'Medium',   registers: 3, features: ['Hasta 3 cajas registradoras', 'Todo lo del plan Básico', 'Gestión de compras', 'Reportes avanzados'] },
        PREMIUM: { label: 'Premium',  registers: 5, features: ['Hasta 5 cajas registradoras', 'Todo lo del plan Medium', 'Ventas en marketplace', 'Soporte prioritario'] },
    };

    const calculateAmount = (plan, cycle) => {
        const base = PLAN_PRICES[plan]?.[cycle] || 19.99;
        const extras = (company?.extraRegisters || 0) * (cycle === 'MONTHLY' ? 10 : 100);
        const billing = company?.hasElectronicBilling ? (cycle === 'MONTHLY' ? 10 : 100) : 0;
        return (base + extras + billing).toFixed(2);
    };

    const openPlanModal = (plan) => {
        setSelectedPlan(plan);
        setPaymentForm(prev => ({
            ...prev,
            targetPlan: plan,
            billingCycle: billingCycle,
            amount: calculateAmount(plan, billingCycle)
        }));
        setSubmitSuccess(false);
        setShowModal(true);
    };

    // Form states
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        paymentMethod: 'Zelle',
        reference: '',
        notes: '',
        targetPlan: 'BASIC',
        billingCycle: 'MONTHLY'
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (company?.subscriptionPlan) {
            setSelectedPlan(company.subscriptionPlan);
        }
    }, [company]);

    useEffect(() => {
        setPaymentForm(prev => ({
            ...prev,
            targetPlan: selectedPlan,
            billingCycle: billingCycle,
            amount: company ? calculateAmount(selectedPlan, billingCycle) : prev.amount
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPlan, billingCycle, company]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [profileRes, paymentsRes] = await Promise.all([
                CompanyService.getProfile(),
                PaymentService.getMyPayments()
            ]);
            setCompany(profileRes.data);
            setPayments(paymentsRes.data);
        } catch (err) {
            console.error("Error loading company data", err);
            setError("No se pudieron cargar los datos de la empresa.");
        } finally {
            setLoading(false);
        }
    };

    const startEditing = () => {
        setEditForm({
            name: company?.name || '',
            description: company?.description || '',
            phoneNumber: company?.phoneNumber || '',
            imageUrl: company?.imageUrl || '',
            latitude: company?.latitude || '',
            longitude: company?.longitude || '',
            baseCurrency: company?.baseCurrency || 'USD',
            timezone: company?.timezone || 'America/Caracas'
        });
        setEditing(true);
        setSaveSuccess('');
    };

    const cancelEditing = () => {
        setEditing(false);
        setEditForm({});
        setSaveSuccess('');
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSaveSuccess('');
        try {
            const payload = {
                ...editForm,
                latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
                longitude: editForm.longitude ? parseFloat(editForm.longitude) : null
            };
            const res = await CompanyService.updateProfile(payload);
            setCompany(res.data);
            setEditing(false);
            setSaveSuccess('¡Perfil actualizado exitosamente!');
            setTimeout(() => setSaveSuccess(''), 4000);
        } catch (err) {
            console.error("Error updating profile", err);
            setError("Error al actualizar el perfil. Intenta de nuevo.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPaymentForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await PaymentService.submitPayment(paymentForm);
            setSubmitSuccess(true);
            setPaymentForm({ amount: '', paymentMethod: 'Zelle', reference: '', notes: '', targetPlan: 'BASIC', billingCycle: 'MONTHLY' });
            loadData();
            setTimeout(() => setShowModal(false), 3000);
        } catch (err) {
            console.error("Error submitting payment", err);
            setError("Error al enviar el comprobante. Intenta de nuevo.");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status, plan) => {
        const planName = plan === 'PREMIUM' ? 'Premium' : plan === 'MEDIUM' ? 'Medium' : 'Básico';
        switch (status) {
            case 'TRIAL': return <Badge bg="warning" text="dark">Prueba {planName}</Badge>;
            case 'PAID': return <Badge bg="success">Membresía {planName} Activa</Badge>;
            case 'PAST_DUE': return <Badge bg="danger">Suscripción {planName} Vencida (Solo Lectura)</Badge>;
            case 'SUSPENDED': return <Badge bg="dark">Cuenta Suspendida</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const getPaymentStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return <Badge bg="warning" text="dark">Pendiente</Badge>;
            case 'APPROVED': return <Badge bg="success">Aprobado</Badge>;
            case 'REJECTED': return <Badge bg="danger">Rechazado</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    if (loading) return (
        <div className="d-flex" style={{ height: '100vh' }}>
            <Sidebar />
            <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                <Spinner animation="border" variant="primary" />
            </div>
        </div>
    );

    return (
        <div className="d-flex admin-content-area overflow-hidden">
            <Sidebar />
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto' }}>
                <Container fluid className="py-4 px-4 bg-light min-vh-100">
                    <Row className="mb-4">
                        <Col>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h2 className="d-flex align-items-center text-dark">
                                        <FaBuilding className="me-3 text-primary" />
                                        Perfil de Empresa
                                    </h2>
                                    <p className="text-muted">Gestiona tu suscripción y detalles del comercio.</p>
                                </div>
                                {!editing && (
                                    <Button variant="outline-primary" className="rounded-pill px-4" onClick={startEditing}>
                                        <FaEdit className="me-2" /> Editar Perfil
                                    </Button>
                                )}
                            </div>
                        </Col>
                    </Row>

                    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                    {saveSuccess && <Alert variant="success" dismissible onClose={() => setSaveSuccess('')}>{saveSuccess}</Alert>}

                    <Row>
                        <Col lg={4}>
                            <Card className="border-0 shadow-sm rounded-4 mb-4">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-4">Información General</h5>

                                    {editing ? (
                                        <Form onSubmit={handleSaveProfile}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="text-muted small d-block">NOMBRE COMERCIAL</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="name"
                                                    value={editForm.name}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="py-2"
                                                />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="text-muted small d-block">
                                                    <FaPhone className="me-1" /> TELÉFONO
                                                </Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="phoneNumber"
                                                    value={editForm.phoneNumber}
                                                    onChange={handleEditChange}
                                                    placeholder="Ej: +58 412-1234567"
                                                    className="py-2"
                                                />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="text-muted small d-block">DESCRIPCIÓN</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={3}
                                                    name="description"
                                                    value={editForm.description}
                                                    onChange={handleEditChange}
                                                    placeholder="Describe tu negocio para los clientes..."
                                                    className="py-2"
                                                />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="text-muted small d-block">
                                                    <FaImage className="me-1" /> IMAGEN (URL)
                                                </Form.Label>
                                                <Form.Control
                                                    type="url"
                                                    name="imageUrl"
                                                    value={editForm.imageUrl}
                                                    onChange={handleEditChange}
                                                    placeholder="https://ejemplo.com/logo.png"
                                                    className="py-2"
                                                />
                                            </Form.Group>
                                            <Row>
                                                <Col>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="text-muted small d-block">
                                                            <FaMoneyBillWave className="me-1" /> MONEDA BASE
                                                        </Form.Label>
                                                        <Form.Select
                                                            name="baseCurrency"
                                                            value={editForm.baseCurrency}
                                                            onChange={handleEditChange}
                                                            className="py-2 rounded-3"
                                                        >
                                                            <option value="USD">Dólares (USD)</option>
                                                            <option value="EUR">Euros (EUR)</option>
                                                            <option value="VES">Bolívares (VES)</option>
                                                            <option value="COP">Pesos Colombianos (COP)</option>
                                                            <option value="CLP">Pesos Chilenos (CLP)</option>
                                                            <option value="MXN">Pesos Mexicanos (MXN)</option>
                                                            <option value="ARS">Pesos Argentinos (ARS)</option>
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="text-muted small d-block">
                                                            <FaClock className="me-1" /> ZONA HORARIA
                                                        </Form.Label>
                                                        <Form.Select
                                                            name="timezone"
                                                            value={editForm.timezone}
                                                            onChange={handleEditChange}
                                                            className="py-2 rounded-3"
                                                        >
                                                            <option value="America/Caracas">Caracas (UTC-4)</option>
                                                            <option value="America/Bogota">Bogotá (UTC-5)</option>
                                                            <option value="America/Santiago">Santiago (UTC-4/UTC-3)</option>
                                                            <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                                                            <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
                                                            <option value="America/New_York">New York (EST/EDT)</option>
                                                            <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <Row>
                                                <Col>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="text-muted small d-block">
                                                            <FaMapMarkerAlt className="me-1" /> LATITUD
                                                        </Form.Label>
                                                        <Form.Control
                                                            type="number" onFocus={(e) => e.target.select()}
                                                            step="any"
                                                            name="latitude"
                                                            value={editForm.latitude}
                                                            onChange={handleEditChange}
                                                            placeholder="Ej: 10.4806"
                                                            className="py-2"
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="text-muted small d-block">LONGITUD</Form.Label>
                                                        <Form.Control
                                                            type="number" onFocus={(e) => e.target.select()}
                                                            step="any"
                                                            name="longitude"
                                                            value={editForm.longitude}
                                                            onChange={handleEditChange}
                                                            placeholder="Ej: -66.9036"
                                                            className="py-2"
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <div className="d-flex gap-2 mt-3">
                                                <Button variant="primary" type="submit" className="flex-grow-1 rounded-pill fw-bold py-2" disabled={submitting}>
                                                    {submitting ? <Spinner size="sm" animation="border" /> : <><FaSave className="me-2" /> Guardar Cambios</>}
                                                </Button>
                                                <Button variant="outline-secondary" className="rounded-pill px-3" onClick={cancelEditing} disabled={submitting}>
                                                    <FaTimes />
                                                </Button>
                                            </div>
                                        </Form>
                                    ) : (
                                        <>
                                            <div className="mb-3">
                                                <label className="text-muted small d-block">NOMBRE COMERCIAL</label>
                                                <span className="fs-5 fw-bold">{company?.name}</span>
                                            </div>
                                            {company?.phoneNumber && (
                                                <div className="mb-3">
                                                    <label className="text-muted small d-block"><FaPhone className="me-1" /> TELÉFONO</label>
                                                    <span>{company.phoneNumber}</span>
                                                </div>
                                            )}
                                            {company?.description && (
                                                <div className="mb-3">
                                                    <label className="text-muted small d-block">DESCRIPCIÓN</label>
                                                    <span className="text-muted">{company.description}</span>
                                                </div>
                                            )}
                                            <Row className="mb-3">
                                                <Col>
                                                    <label className="text-muted small d-block"><FaMoneyBillWave className="me-1"/> MONEDA</label>
                                                    <Badge bg="light" text="dark" className="border">{company?.baseCurrency || 'USD'}</Badge>
                                                </Col>
                                                <Col>
                                                    <label className="text-muted small d-block"><FaClock className="me-1"/> ZONA HORARIA</label>
                                                    <Badge bg="light" text="dark" className="border">{company?.timezone || 'America/Caracas'}</Badge>
                                                </Col>
                                            </Row>
                                            <div className="mb-3">
                                                <label className="text-muted small d-block">ID DE TIENDA</label>
                                                <span className="text-muted">#{company?.id}</span>
                                            </div>
                                        </>
                                    )}

                                    {!editing && (
                                        <>
                                            <hr className="my-4" />
                                            <h5 className="fw-bold mb-3">Estado de Suscripción</h5>
                                            <div className="mb-3">
                                                {getStatusBadge(company?.subscriptionStatus, company?.subscriptionPlan)}
                                            </div>
                                            {company?.subscriptionEndDate && (
                                                <div className="mb-3 p-2 bg-light rounded-3">
                                                    <label className="text-muted small d-block">VENCIMIENTO</label>
                                                    <span className="fw-bold">{new Date(company.subscriptionEndDate).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {company?.extraRegisters > 0 && (
                                                <div className="mb-3 p-2 bg-light rounded-3 border-start border-primary border-3">
                                                    <label className="text-muted small d-block">CAJAS EXTRA</label>
                                                    <span className="fw-bold text-primary">+{company.extraRegisters} {company.extraRegisters === 1 ? 'Caja' : 'Cajas'}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={8}>
                            {/* Plan selector cards */}
                            <Card className="border-0 shadow-sm rounded-4 mb-4">
                                <Card.Header className="bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fw-bold d-flex align-items-center">
                                        <FaCrown className="me-2 text-warning" /> Planes de Membresía
                                    </h5>
                                    <div className="d-flex align-items-center gap-2">
                                        <small className="text-muted">Ciclo:</small>
                                        <div className="btn-group btn-group-sm">
                                            <button
                                                type="button"
                                                className={`btn btn-${billingCycle === 'MONTHLY' ? 'primary' : 'outline-secondary'}`}
                                                onClick={() => setBillingCycle('MONTHLY')}
                                            >Mensual</button>
                                            <button
                                                type="button"
                                                className={`btn btn-${billingCycle === 'ANNUAL' ? 'primary' : 'outline-secondary'}`}
                                                onClick={() => setBillingCycle('ANNUAL')}
                                            >Anual <Badge bg="success" style={{fontSize:'0.6rem'}}>-16%</Badge></button>
                                        </div>
                                    </div>
                                </Card.Header>
                                <Card.Body className="p-4">
                                    <Row className="g-3">
                                        {Object.entries(PLAN_INFO).map(([planKey, info]) => {
                                            const isCurrent = company?.subscriptionPlan === planKey && company?.subscriptionStatus === 'PAID';
                                            const isSelected = selectedPlan === planKey;
                                            return (
                                                <Col md={4} key={planKey}>
                                                    <div
                                                        onClick={() => setSelectedPlan(planKey)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            border: isSelected ? '2px solid #0d6efd' : '2px solid #dee2e6',
                                                            borderRadius: '12px',
                                                            padding: '1.25rem',
                                                            background: isCurrent ? '#f0f7ff' : isSelected ? '#f8f9ff' : '#fff',
                                                            transition: 'all 0.2s',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        {isCurrent && (
                                                            <Badge bg="success" className="position-absolute" style={{top:'10px',right:'10px',fontSize:'0.65rem'}}>
                                                                ✓ Activo
                                                            </Badge>
                                                        )}
                                                        <div className="fw-bold fs-6 mb-1">{info.label}</div>
                                                        <div className="mb-2">
                                                            <span className="fs-4 fw-bold text-primary">${PLAN_PRICES[planKey][billingCycle]}</span>
                                                            <small className="text-muted">/{billingCycle === 'MONTHLY' ? 'mes' : 'año'}</small>
                                                        </div>
                                                        <ul className="list-unstyled mb-0" style={{fontSize:'0.8rem'}}>
                                                            {info.features.map((f, i) => (
                                                                <li key={i} className="text-muted mb-1">
                                                                    <FaCheckCircle className="me-1 text-success" style={{fontSize:'0.7rem'}} />{f}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                    <div className="mt-4">
                                        <Button
                                            variant={company?.subscriptionStatus === 'PAID' && company?.subscriptionPlan === selectedPlan ? 'outline-success' : 'primary'}
                                            className="w-100 py-3 rounded-pill fw-bold"
                                            onClick={() => openPlanModal(selectedPlan)}
                                        >
                                            {company?.subscriptionStatus === 'PAID' && company?.subscriptionPlan === selectedPlan
                                                ? <><FaCheckCircle className="me-2" /> Renovar Plan {PLAN_INFO[selectedPlan]?.label}</>
                                                : <><FaCrown className="me-2" /> Contratar Plan {PLAN_INFO[selectedPlan]?.label} — ${calculateAmount(selectedPlan, billingCycle)}</>}
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Payment history */}
                            <Card className="border-0 shadow-sm rounded-4 mb-4">
                                <Card.Header className="bg-white border-0 py-3 px-4">
                                    <h5 className="mb-0 fw-bold d-flex align-items-center">
                                        <FaHistory className="me-2 text-primary" /> Historial de Pagos
                                    </h5>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    <Table hover responsive className="mb-0 align-middle">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4">Fecha</th>
                                                <th>Plan</th>
                                                <th>Método</th>
                                                <th>Monto</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.length > 0 ? payments.map((p) => (
                                                <tr key={p.id}>
                                                    <td className="ps-4">{new Date(p.createdAt).toLocaleDateString()}</td>
                                                    <td><Badge bg="light" text="dark" className="border small">{p.targetPlan || 'N/A'}</Badge></td>
                                                    <td>{p.paymentMethod}</td>
                                                    <td className="fw-bold">${p.amount}</td>
                                                    <td>{getPaymentStatusBadge(p.status)}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5 text-muted">
                                                        No hay registros de pagos realizados.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Modal para reportar pago */}
                    <Modal scrollable show={showModal} onHide={() => { setShowModal(false); setSubmitSuccess(false); }} centered scrollable size="lg">
                        <Modal.Header closeButton className="border-0 pb-0">
                            <Modal.Title className="fw-bold">
                                Reportar Pago — Plan {PLAN_INFO[paymentForm.targetPlan]?.label || 'Básico'}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-4">
                            {submitSuccess ? (
                                <Alert variant="success" className="rounded-3 text-center py-4">
                                    <FaCheckCircle className="mb-2" style={{ fontSize: '2rem' }} />
                                    <h5 className="fw-bold mb-1">¡Comprobante enviado!</h5>
                                    <p className="mb-0 small">El equipo de Nugar lo revisará pronto y activará tu membresía.</p>
                                </Alert>
                            ) : (
                                <>
                                    <div className="p-3 rounded-3 mb-3" style={{ background: '#f0f7ff', border: '1px solid #cce5ff' }}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className="text-muted small">PLAN SELECCIONADO</div>
                                                <div className="fw-bold fs-6">{PLAN_INFO[paymentForm.targetPlan]?.label} — {paymentForm.billingCycle === 'MONTHLY' ? 'Mensual' : 'Anual'}</div>
                                            </div>
                                            <div className="text-end">
                                                <div className="text-muted small">MONTO A PAGAR</div>
                                                <div className="fw-bold fs-4 text-primary">${paymentForm.amount}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <Alert variant="info" className="border-0 shadow-sm rounded-3">
                                        <h6 className="fw-bold"><FaInfoCircle className="me-2" /> Datos de Transferencia:</h6>
                                        <ul className="mb-0 small">
                                            <li><strong>Zelle:</strong> pagos@nugar.com (Antigravity Inc)</li>
                                            <li><strong>Binance Pay ID:</strong> 12345678</li>
                                            <li><strong>Pago Móvil:</strong> 0102 - 0412-0000000 - V-12345678</li>
                                        </ul>
                                    </Alert>

                                    <Form onSubmit={handleSubmitPayment}>
                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">MONTO PAGADO (USD)</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        onFocus={(e) => e.target.select()}
                                                        name="amount"
                                                        value={paymentForm.amount}
                                                        onChange={handleInputChange}
                                                        step="0.01"
                                                        required
                                                        className="py-2"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">MÉTODO DE PAGO</Form.Label>
                                                    <Form.Select
                                                        name="paymentMethod"
                                                        value={paymentForm.paymentMethod}
                                                        onChange={handleInputChange}
                                                        className="py-2"
                                                    >
                                                        <option value="Zelle">Zelle</option>
                                                        <option value="Binance">Binance USDT</option>
                                                        <option value="Pago Móvil">Pago Móvil (VES)</option>
                                                        <option value="PayPal">PayPal</option>
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold text-muted">REFERENCIA / NRO COMPROBANTE</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="reference"
                                                value={paymentForm.reference}
                                                onChange={handleInputChange}
                                                placeholder="Pegue aquí el ID o referencia de la transacción"
                                                required
                                                className="py-2"
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold text-muted">NOTAS ADICIONALES (OPCIONAL)</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={2}
                                                name="notes"
                                                value={paymentForm.notes}
                                                onChange={handleInputChange}
                                                placeholder="Algún detalle adicional sobre tu pago"
                                                className="py-2"
                                            />
                                        </Form.Group>

                                        <div className="d-grid mt-4">
                                            <Button variant="primary" type="submit" size="lg" className="rounded-pill fw-bold py-3" disabled={submitting}>
                                                {submitting ? <Spinner size="sm" animation="border" /> : <><FaFileUpload className="me-2" /> Enviar Comprobante de Pago</>}
                                            </Button>
                                        </div>
                                    </Form>
                                </>
                            )}
                        </Modal.Body>
                    </Modal>
                </Container>
            </div>
        </div>
    );
};

export default CompanyPage;
