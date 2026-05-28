import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, Button, Form, Modal, Table, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { FaBuilding, FaCrown, FaCheckCircle, FaExclamationTriangle, FaHistory, FaFileUpload, FaInfoCircle, FaEdit, FaSave, FaTimes, FaPhone, FaMapMarkerAlt, FaImage, FaMoneyBillWave, FaClock, FaSearch, FaFilter } from 'react-icons/fa';
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
    const [showRemoveRegistersModal, setShowRemoveRegistersModal] = useState(false);
    const [removingRegisters, setRemovingRegisters] = useState(false);
    const [registersToCancel, setRegistersToCancel] = useState(1);

    // Pagination and Filters for Payments
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterDate, setFilterDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

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
        return base.toFixed(2);
    };

    const buildBreakdown = (plan, cycle) => {
        const cycleLabel = cycle === 'MONTHLY' ? 'mensual' : 'anual';
        const base = PLAN_PRICES[plan]?.[cycle] || 19.99;
        return { base, total: base.toFixed(2), cycleLabel };
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
        paymentMethod: 'PAGO_MOVIL',
        reference: '',
        banco: '',
        cedula: '',
        nombreTitular: '',
        correoTelefono: '',
        ordenId: '',
        notes: '',
        targetPlan: 'BASIC',
        billingCycle: 'MONTHLY'
    });

    useEffect(() => {
        loadData(true);
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

    const loadData = async (showLoading = false) => {
        if (showLoading) setLoading(true);
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
            if (showLoading) setLoading(false);
        }
    };

    const startEditing = () => {
        setEditForm({
            name: company?.name || '',
            rif: company?.rif || '',
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

    const buildReference = () => {
        const method = paymentForm.paymentMethod;
        if (method === 'PAGO_MOVIL') return `Banco: ${paymentForm.banco} | Cédula: ${paymentForm.cedula} | Ref: ${paymentForm.reference}`;
        if (method === 'ZELLE') return `Titular: ${paymentForm.nombreTitular} | Contacto: ${paymentForm.correoTelefono}`;
        if (method === 'BINANCE') return `Orden ID: ${paymentForm.ordenId} | Titular: ${paymentForm.nombreTitular}`;
        if (method === 'TRANSFERENCIA') return `Ref: ${paymentForm.reference}`;
        return 'Efectivo';
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...paymentForm,
                amount: parseFloat(paymentForm.amount),
                reference: buildReference(),
                paymentType: (company?.extraRegisters > 0) ? 'SUBSCRIPTION_AND_REGISTERS' : 'SUBSCRIPTION'
            };
            await PaymentService.submitPayment(payload);
            setSubmitSuccess(true);
            setPaymentForm({ amount: '', paymentMethod: 'PAGO_MOVIL', reference: '', banco: '', cedula: '', nombreTitular: '', correoTelefono: '', ordenId: '', notes: '', targetPlan: 'BASIC', billingCycle: 'MONTHLY' });
            loadData(false);
        } catch (err) {
            console.error("Error submitting payment", err);
            setError("Error al enviar el comprobante. Intenta de nuevo.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveRegisters = async () => {
        setRemovingRegisters(true);
        try {
            const newTotal = Math.max(0, (company.extraRegisters || 0) - registersToCancel);
            await CompanyService.addExtraRegisters(newTotal);
            setShowRemoveRegistersModal(false);
            setSaveSuccess('La reducción de cajas ha sido programada para el próximo ciclo.');
            setTimeout(() => setSaveSuccess(''), 4000);
            
            // Optimistic update
            setCompany(prev => ({ ...prev, nextCycleExtraRegisters: newTotal }));
            // Background refresh
            loadData(false);
        } catch (err) {
            console.error("Error removing registers", err);
            setError("Error al cancelar las cajas. Intenta de nuevo.");
        } finally {
            setRemovingRegisters(false);
        }
    };

    const handleUndoCancelRegisters = async () => {
        setRemovingRegisters(true);
        try {
            await CompanyService.addExtraRegisters(company.extraRegisters);
            setSaveSuccess('Reducción cancelada. Tus cajas se mantendrán activas.');
            setTimeout(() => setSaveSuccess(''), 4000);
            setCompany(prev => ({ ...prev, nextCycleExtraRegisters: null }));
        } catch (err) {
            console.error("Error undoing register removal", err);
            setError("Error al deshacer la reducción. Intenta de nuevo.");
        } finally {
            setRemovingRegisters(false);
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

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, filterDate]);

    // Payment Filter Logic
    const filteredPayments = payments.filter(p => {
        const matchSearch = searchTerm ? p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        const matchStatus = filterStatus !== 'ALL' ? p.status === filterStatus : true;
        
        let matchDate = true;
        if (filterDate) {
            const pDate = new Date(p.createdAt).toISOString().split('T')[0];
            matchDate = pDate === filterDate;
        }

        return matchSearch && matchStatus && matchDate;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedPayments = filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

                    <Tabs defaultActiveKey="ajustes" className="mb-4 modern-tabs">
                        <Tab eventKey="ajustes" title={<><FaBuilding className="me-2" />Ajustes de Tienda</>}>
                            <Row className="mt-3">
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
                                                <Form.Label className="text-muted small d-block">RIF DE EMPRESA</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="rif"
                                                    value={editForm.rif}
                                                    onChange={handleEditChange}
                                                    placeholder="Ej: J-12345678-9"
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
                                            {company?.rif && (
                                                <div className="mb-3">
                                                    <label className="text-muted small d-block">RIF DE EMPRESA</label>
                                                    <span className="fw-bold">{company.rif}</span>
                                                </div>
                                            )}
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
                                                <div className="mb-3 p-3 bg-light rounded-3 border-start border-primary border-3 d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <label className="text-muted small d-block">CAJAS EXTRA CONTRATADAS</label>
                                                        <span className="fw-bold text-primary fs-5">+{company.extraRegisters} {company.extraRegisters === 1 ? 'Caja' : 'Cajas'}</span>
                                                        {company.nextCycleExtraRegisters != null && (
                                                            <div className="small text-danger mt-1">
                                                                <FaInfoCircle className="me-1" />
                                                                Se reducirán a {company.nextCycleExtraRegisters} en el próximo ciclo
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        {company.nextCycleExtraRegisters != null ? (
                                                            <Button variant="outline-secondary" size="sm" onClick={handleUndoCancelRegisters} disabled={removingRegisters}>
                                                                {removingRegisters ? <Spinner size="sm" animation="border" /> : 'Deshacer Reducción'}
                                                            </Button>
                                                        ) : (
                                                            <Button variant="outline-danger" size="sm" onClick={() => { setRegistersToCancel(1); setShowRemoveRegistersModal(true); }}>
                                                                Cancelar Cajas
                                                            </Button>
                                                        )}
                                                    </div>
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

                        </Col>
                            </Row>
                        </Tab>
                        <Tab eventKey="historial" title={<><FaHistory className="me-2" />Historial de Pagos</>}>
                            <div className="mt-3">
                                <Card className="border-0 shadow-sm rounded-4 mb-4">
                                    <Card.Body className="p-3">
                                        <Row className="g-3">
                                            <Col md={4}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-muted"><FaSearch className="me-1"/> BUSCAR REFERENCIA</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Número de referencia..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="rounded-pill"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={4}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-muted"><FaFilter className="me-1"/> ESTADO DEL PAGO</Form.Label>
                                                    <Form.Select 
                                                        value={filterStatus} 
                                                        onChange={(e) => setFilterStatus(e.target.value)}
                                                        className="rounded-pill"
                                                    >
                                                        <option value="ALL">Todos los Estados</option>
                                                        <option value="PENDING">Pendientes</option>
                                                        <option value="APPROVED">Aprobados</option>
                                                        <option value="REJECTED">Rechazados</option>
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                            <Col md={4}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-muted"><FaFilter className="me-1"/> FECHA DE REGISTRO</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        value={filterDate}
                                                        onChange={(e) => setFilterDate(e.target.value)}
                                                        className="rounded-pill"
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>

                                <Card className="border-0 shadow-sm rounded-4 mb-4">
                                    <Card.Body className="p-0">
                                        <Table hover responsive className="mb-0 align-middle">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="ps-4">Fecha</th>
                                                    <th>Plan / Concepto</th>
                                                    <th>Método y Detalles</th>
                                                    <th>Monto</th>
                                                    <th>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedPayments.length > 0 ? paginatedPayments.map((p) => (
                                                    <tr key={p.id}>
                                                        <td className="ps-4">{new Date(p.createdAt).toLocaleDateString()}</td>
                                                        <td>
                                                            {p.paymentType === 'EXTRA_REGISTER' ? (
                                                                <Badge bg="info" text="dark" className="border small">+{p.requestedExtraRegisters || 1} Caja(s)</Badge>
                                                            ) : (
                                                                <Badge bg="light" text="dark" className="border small">{p.targetPlan || 'N/A'}</Badge>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="small fw-bold">{p.paymentMethod}</div>
                                                            <div className="small text-muted mb-1">Ref: {p.reference}</div>
                                                            {(p.banco || p.cedula || p.nombreTitular || p.correoTelefono || p.ordenId) && (
                                                                <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                                                    {p.banco && <div>Banco: {p.banco}</div>}
                                                                    {p.cedula && <div>C.I: {p.cedula}</div>}
                                                                    {p.nombreTitular && <div>Titular: {p.nombreTitular}</div>}
                                                                    {p.correoTelefono && <div>Contacto: {p.correoTelefono}</div>}
                                                                    {p.ordenId && <div>Orden ID: {p.ordenId}</div>}
                                                                </div>
                                                            )}
                                                            {p.notes && (
                                                                <div className="small mt-1 text-secondary fst-italic" style={{ fontSize: '0.75rem' }}>
                                                                    Nota: {p.notes}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="fw-bold text-success">${p.amount}</td>
                                                        <td>{getPaymentStatusBadge(p.status)}</td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="5" className="text-center py-5 text-muted">
                                                            No hay registros de pagos que coincidan con la búsqueda.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                        {filteredPayments.length > 0 && (
                                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 border-top gap-3">
                                                <small className="text-muted">Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredPayments.length)} de {filteredPayments.length} pagos</small>
                                                <div className="d-flex gap-2">
                                                    <Button variant="outline-primary" size="sm" className="rounded-pill px-3" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Anterior</Button>
                                                    <div className="d-flex align-items-center px-3 bg-light rounded-pill fw-bold text-primary">{currentPage} de {totalPages || 1}</div>
                                                    <Button variant="outline-primary" size="sm" className="rounded-pill px-3" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)}>Siguiente</Button>
                                                </div>
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </div>
                        </Tab>
                    </Tabs>

                    {/* Modal para reportar pago */}
                    <Modal scrollable show={showModal} onHide={() => { setShowModal(false); setSubmitSuccess(false); }} centered size="lg">
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
                                    {/* Resumen del plan */}
                                    {(() => {
                                        const bd = buildBreakdown(paymentForm.targetPlan, paymentForm.billingCycle);
                                        return (
                                            <div className="rounded-3 mb-3 overflow-hidden border">
                                                <div className="d-flex justify-content-between align-items-center px-4 py-3" style={{ background: '#f0f7ff', borderBottom: '1px solid #cce5ff' }}>
                                                    <div>
                                                        <div className="text-muted small">PLAN SELECCIONADO</div>
                                                        <div className="fw-bold fs-6">{PLAN_INFO[paymentForm.targetPlan]?.label} — {paymentForm.billingCycle === 'MONTHLY' ? 'Mensual' : 'Anual'}</div>
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="text-muted small">MONTO A PAGAR</div>
                                                        <div className="fw-bold fs-4 text-primary">${bd.total}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

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
                                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value, reference: '', banco: '', cedula: '', nombreTitular: '', correoTelefono: '', ordenId: '' }))}
                                                        className="py-2"
                                                    >
                                                        <option value="PAGO_MOVIL">📱 Pago Móvil</option>
                                                        <option value="ZELLE">💵 Zelle</option>
                                                        <option value="BINANCE">🪙 Binance / Crypto</option>
                                                        <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                                                        <option value="EFECTIVO">💰 Efectivo (Local)</option>
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                        </Row>

                                        {(paymentForm.paymentMethod === 'PAGO_MOVIL' || paymentForm.paymentMethod === 'TRANSFERENCIA') && (
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">BANCO</Form.Label>
                                                    <Form.Select
                                                        name="banco"
                                                        className="py-2"
                                                        value={paymentForm.banco}
                                                        onChange={handleInputChange}
                                                        required
                                                    >
                                                        <option value="">-- Seleccionar Banco --</option>
                                                        <option>Banco de Venezuela</option>
                                                        <option>Banesco</option>
                                                        <option>Banco Mercantil</option>
                                                        <option>Banco Provincial</option>
                                                        <option>Banco Nacional de Crédito (BNC)</option>
                                                        <option>Banco Bicentenario</option>
                                                        <option>Banco del Tesoro</option>
                                                        <option>Banco Exterior</option>
                                                        <option>Banplus</option>
                                                        <option>Bancamiga</option>
                                                        <option>Banco Plaza</option>
                                                        <option>Banco Activo</option>
                                                        <option>Bancaribe</option>
                                                        <option>Banco Sofitasa</option>
                                                        <option>Banco Caroní</option>
                                                        <option>100% Banco</option>
                                                        <option>Mi Banco</option>
                                                        <option>Banco de la Fuerza Armada (BANFANB)</option>
                                                        <option>Banco del Sur</option>
                                                        <option>Otro</option>
                                                    </Form.Select>
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">CÉDULA DEL TITULAR</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="cedula"
                                                        placeholder="Ej: V-12345678"
                                                        className="py-2"
                                                        value={paymentForm.cedula}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">NÚMERO DE REFERENCIA</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="reference"
                                                        placeholder="Ej: 123456789"
                                                        className="py-2"
                                                        value={paymentForm.reference}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </Form.Group>
                                            </>
                                        )}

                                        {paymentForm.paymentMethod === 'ZELLE' && (
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">NOMBRE DEL TITULAR DE LA CUENTA</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="nombreTitular"
                                                        placeholder="Ej: John Doe"
                                                        className="py-2"
                                                        value={paymentForm.nombreTitular}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">CORREO O TELÉFONO ZELLE</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="correoTelefono"
                                                        placeholder="Ej: john@email.com o +1234567890"
                                                        className="py-2"
                                                        value={paymentForm.correoTelefono}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </Form.Group>
                                            </>
                                        )}

                                        {paymentForm.paymentMethod === 'BINANCE' && (
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">NÚMERO DE ID DE LA ORDEN</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="ordenId"
                                                        placeholder="Ej: 123456789"
                                                        className="py-2"
                                                        value={paymentForm.ordenId}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-muted">NOMBRE DEL TITULAR DE LA CUENTA</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="nombreTitular"
                                                        placeholder="Ej: Juan Pérez"
                                                        className="py-2"
                                                        value={paymentForm.nombreTitular}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </Form.Group>
                                            </>
                                        )}



                                        {paymentForm.paymentMethod === 'EFECTIVO' && (
                                            <Alert variant="warning" className="small py-2 border-0">
                                                📍 Coordina la entrega del efectivo con el administrador de la plataforma.
                                            </Alert>
                                        )}
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

                    {/* Modal para cancelar cajas extra */}
                    <Modal show={showRemoveRegistersModal} onHide={() => !removingRegisters && setShowRemoveRegistersModal(false)} centered>
                        <Modal.Header closeButton={!removingRegisters} className="border-0 pb-0">
                            <Modal.Title className="fw-bold text-danger">
                                <FaExclamationTriangle className="me-2" /> Cancelar Cajas Extra
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-4">
                            <p className="mb-3">
                                ¿Cuántas cajas extra deseas cancelar? Actualmente tienes <strong>{company?.extraRegisters} {company?.extraRegisters === 1 ? 'caja' : 'cajas'} extra</strong> contratadas.
                            </p>
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-muted">CANTIDAD A CANCELAR</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max={company?.extraRegisters || 1}
                                    value={registersToCancel}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setRegistersToCancel(val === '' ? '' : parseInt(val, 10));
                                    }}
                                    className="py-2"
                                />
                            </Form.Group>
                            <Alert variant="warning" className="border-0 shadow-sm rounded-3">
                                <FaInfoCircle className="me-2" />
                                <strong>Nota importante:</strong> Como el servicio es prepago, las cajas que canceles seguirán activas hasta el final de tu mes actual, ya que fueron pagadas por adelantado. En tu próxima renovación, el monto a pagar se ajustará a tu nueva cantidad de cajas.
                            </Alert>
                            <div className="d-flex gap-2 mt-4">
                                <Button variant="secondary" className="flex-grow-1 rounded-pill" onClick={() => setShowRemoveRegistersModal(false)} disabled={removingRegisters}>
                                    Volver
                                </Button>
                                <Button variant="danger" className="flex-grow-1 rounded-pill fw-bold" onClick={handleRemoveRegisters} disabled={removingRegisters || registersToCancel === '' || registersToCancel < 1 || registersToCancel > (company?.extraRegisters || 0)}>
                                    {removingRegisters ? <Spinner size="sm" animation="border" /> : `Sí, cancelar ${registersToCancel === '' ? '' : registersToCancel} ${registersToCancel === 1 ? 'caja' : 'cajas'}`}
                                </Button>
                            </div>
                        </Modal.Body>
                    </Modal>
                </Container>
            </div>
        </div>
    );
};

export default CompanyPage;
