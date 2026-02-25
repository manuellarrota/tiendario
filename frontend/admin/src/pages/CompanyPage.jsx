import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, Button, Form, Modal, Table, Alert, Spinner } from 'react-bootstrap';
import { FaBuilding, FaCrown, FaCheckCircle, FaExclamationTriangle, FaHistory, FaFileUpload, FaInfoCircle } from 'react-icons/fa';
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

    // Form states
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        paymentMethod: 'Zelle',
        reference: '',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPaymentForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await PaymentService.submitPayment(paymentForm);
            setShowModal(false);
            setPaymentForm({ amount: '', paymentMethod: 'Zelle', reference: '', notes: '' });
            loadData();
            alert("Pago enviado correctamente. El equipo de Tiendario lo revisará pronto.");
        } catch (err) {
            console.error("Error submitting payment", err);
            alert("Error al enviar el pago. Intenta de nuevo.");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAID': return <Badge bg="success"><FaCheckCircle className="me-1" /> Premium</Badge>;
            case 'TRIAL': return <Badge bg="info">Prueba Gratuita</Badge>;
            case 'FREE': return <Badge bg="secondary">Gratis (Solo Exhibición)</Badge>;
            case 'PAST_DUE': return <Badge bg="warning">Pago Pendiente</Badge>;
            case 'SUSPENDED': return <Badge bg="danger">Suspendida</Badge>;
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
                            <h2 className="d-flex align-items-center text-dark">
                                <FaBuilding className="me-3 text-primary" />
                                Perfil de Empresa
                            </h2>
                            <p className="text-muted">Gestiona tu suscripción y detalles del comercio.</p>
                        </Col>
                    </Row>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Row>
                        <Col lg={4}>
                            <Card className="border-0 shadow-sm rounded-4 mb-4">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-4">Información General</h5>
                                    <div className="mb-3">
                                        <label className="text-muted small d-block">NOMBRE COMERCIAL</label>
                                        <span className="fs-5 fw-bold">{company?.name}</span>
                                    </div>
                                    <div className="mb-3">
                                        <label className="text-muted small d-block">ID DE TIENDA</label>
                                        <span className="text-muted">#{company?.id}</span>
                                    </div>
                                    <hr className="my-4" />
                                    <h5 className="fw-bold mb-3">Estado de Suscripción</h5>
                                    <div className="mb-4">
                                        {getStatusBadge(company?.subscriptionStatus)}
                                    </div>

                                    {company?.subscriptionEndDate && (
                                        <div className="mb-3 p-3 bg-light rounded-3">
                                            <label className="text-muted small d-block">VENCIMIENTO</label>
                                            <span className="fw-bold">
                                                {new Date(company.subscriptionEndDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}

                                    {company?.subscriptionStatus !== 'PAID' && (
                                        <Button
                                            variant="primary"
                                            className="w-100 py-3 rounded-pill fw-bold"
                                            onClick={() => setShowModal(true)}
                                        >
                                            <FaCrown className="me-2" /> Subir a Premium
                                        </Button>
                                    )}
                                </Card.Body>
                            </Card>

                            <Card className="border-0 shadow-sm rounded-4 bg-primary text-white">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-3 d-flex align-items-center">
                                        <FaInfoCircle className="me-2" /> ¿Por qué Premium?
                                    </h5>
                                    <ul className="list-unstyled mb-0">
                                        <li className="mb-2 small"><FaCheckCircle className="me-2 text-info" /> Ventas en marketplace habilitadas</li>
                                        <li className="mb-2 small"><FaCheckCircle className="me-2 text-info" /> Gestión de pedidos online</li>
                                        <li className="mb-2 small"><FaCheckCircle className="me-2 text-info" /> Reportes avanzados de ventas</li>
                                        <li className="small"><FaCheckCircle className="me-2 text-info" /> Soporte prioritario</li>
                                    </ul>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={8}>
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
                                                <th>Método</th>
                                                <th>Referencia</th>
                                                <th>Monto</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.length > 0 ? payments.map((p) => (
                                                <tr key={p.id}>
                                                    <td className="ps-4">
                                                        {new Date(p.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td>{p.paymentMethod}</td>
                                                    <td><code className="bg-light text-dark px-2 rounded small">{p.reference}</code></td>
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
                    <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                        <Modal.Header closeButton className="border-0 pb-0">
                            <Modal.Title className="fw-bold">Reportar Pago de Membresía</Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-4">
                            <Alert variant="info" className="border-0 shadow-sm rounded-3">
                                <h6 className="fw-bold"><FaInfoCircle className="me-2" /> Datos de Transferencia:</h6>
                                <ul className="mb-0 small">
                                    <li><strong>Zelle:</strong> pagos@tiendario.com (Antigravity Inc)</li>
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
                                                name="amount"
                                                value={paymentForm.amount}
                                                onChange={handleInputChange}
                                                placeholder="Ej: 15.00"
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
                                        placeholder="Pegué aquí el ID o referencia de la transacción"
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
                                        {submitting ? <Spinner size="sm" animation="border" /> : <><FaFileUpload className="me-2" /> Enviar Comprobante</>}
                                    </Button>
                                </div>
                            </Form>
                        </Modal.Body>
                    </Modal>
                </Container>
            </div>
        </div>
    );
};

export default CompanyPage;
