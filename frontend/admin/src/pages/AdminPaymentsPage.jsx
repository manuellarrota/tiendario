import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Alert, Modal, Form, Row, Col } from 'react-bootstrap';
import { FaMoneyBillWave, FaCheck, FaTimes, FaEye, FaInfoCircle, FaSearch, FaFilter } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';

const AdminPaymentsPage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [processing, setProcessing] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    // Filters and Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterDate, setFilterDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Details Modal
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [detailsPayment, setDetailsPayment] = useState(null);

    const openDetailsModal = (payment) => {
        setDetailsPayment(payment);
        setShowDetailsModal(true);
    };

    const loadPayments = () => {
        setLoading(true);
        AdminService.getGlobalPayments().then(
            (response) => {
                setPayments(response.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading global payments", error);
                setError(error.translatedMessage || "No se pudieron cargar los pagos globales.");
                setLoading(false);
            }
        );
    };

    useEffect(() => {
        loadPayments();
    }, []);

    // Clear messages when they change
    useEffect(() => {
        if (error || successMsg) {
            const timer = setTimeout(() => {
                setError('');
                setSuccessMsg('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, successMsg]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, filterDate]);

    const openApproveModal = (payment) => {
        setSelectedPayment(payment);
        setShowApproveModal(true);
    };

    const handleApprove = () => {
        const id = selectedPayment.id;
        setProcessing(id);
        AdminService.approvePayment(id).then(
            () => {
                setPayments(payments.map(p => p.id === id ? { ...p, status: 'APPROVED' } : p));
                setProcessing(null);
                setShowApproveModal(false);
                setSuccessMsg('El pago ha sido aprobado exitosamente.');
            },
            (err) => {
                console.error("Error approving payment", err);
                setError(err.translatedMessage || "Error al aprobar pago");
                setProcessing(null);
            }
        );
    };

    const openRejectModal = (payment) => {
        setSelectedPayment(payment);
        setShowRejectModal(true);
    };

    const handleReject = () => {
        if (!rejectReason) {
            setError("Por favor indica un motivo de rechazo");
            return;
        }

        setProcessing(selectedPayment.id);
        AdminService.rejectPayment(selectedPayment.id, rejectReason).then(
            () => {
                setPayments(payments.map(p => p.id === selectedPayment.id ? { ...p, status: 'REJECTED', notes: rejectReason } : p));
                setProcessing(null);
                setShowRejectModal(false);
                setRejectReason('');
                setSuccessMsg('El pago ha sido rechazado.');
            },
            (err) => {
                console.error("Error rejecting payment", err);
                setError("Error al rechazar pago");
                setProcessing(null);
            }
        );
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return <Badge bg="warning" text="dark">Pendiente</Badge>;
            case 'APPROVED': return <Badge bg="success">Aprobado</Badge>;
            case 'REJECTED': return <Badge bg="danger">Rechazado</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    // Filter Logic
    const filteredPayments = payments.filter(p => {
        const matchSearch = searchTerm ? (p.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.reference?.toLowerCase().includes(searchTerm.toLowerCase())) : true;
        const matchStatus = filterStatus !== 'ALL' ? p.status === filterStatus : true;
        
        let matchDate = true;
        if (filterDate) {
            const pDate = new Date(p.createdAt).toISOString().split('T')[0];
            matchDate = pDate === filterDate;
        }

        return matchSearch && matchStatus && matchDate;
    });

    const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedPayments = filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const renderPaymentDetailsBox = (p) => {
        if (!p) return null;
        return (
            <div className="p-3 bg-light rounded-3 mt-3 border">
                <p className="small text-muted fw-bold mb-3 border-bottom pb-2">DETALLES DEL PAGO</p>
                <div className="row">
                    <div className="col-md-6 mb-2">
                        <small className="text-muted d-block">Empresa:</small>
                        <span className="fw-bold">{p.company?.name}</span>
                    </div>
                    <div className="col-md-6 mb-2">
                        <small className="text-muted d-block">Monto:</small>
                        <span className="fw-bold text-success">${p.amount}</span>
                    </div>
                    <div className="col-md-6 mb-2">
                        <small className="text-muted d-block">Referencia / Método:</small>
                        <span className="fw-bold">{p.paymentMethod}</span> <br/>
                        <span className="small">{p.reference}</span>
                    </div>
                    <div className="col-md-6 mb-2">
                        <small className="text-muted d-block">Aplica a:</small>
                        {p.paymentType === 'EXTRA_REGISTER' ? (
                            <span className="fw-bold text-info">+{p.requestedExtraRegisters || 1} Caja(s) Extra</span>
                        ) : (
                            <span className="fw-bold text-primary">Plan {p.targetPlan === 'BASIC' ? 'Básico' : p.targetPlan === 'MEDIUM' ? 'Medium' : 'Premium'} ({p.billingCycle === 'ANNUAL' ? 'Anual' : 'Mensual'})</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                    <Spinner animation="border" variant="primary" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto' }}>
                <Container className="py-4">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                        <h2 className="mb-0 d-flex align-items-center">
                            <FaMoneyBillWave className="me-3 text-success" />
                            Validación de Pagos (Membresías)
                        </h2>
                    </div>

                    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                    {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

                    {/* Filters Section */}
                    <Card className="border-0 shadow-sm rounded-4 mb-4">
                        <Card.Body className="p-3">
                            <Row className="g-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted"><FaSearch className="me-1"/> BUSCAR EMPRESA O REFERENCIA</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Buscar..."
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

                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">ID</th>
                                        <th>Empresa</th>
                                        <th>Plan</th>
                                        <th>Monto</th>
                                        <th>Referencia</th>
                                        <th>Fecha</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPayments.length > 0 ? paginatedPayments.map((p) => (
                                        <tr key={p.id}>
                                            <td className="ps-4 text-muted small">#{p.id}</td>
                                            <td>
                                                <div className="fw-bold">{p.company?.name}</div>
                                                <small className="text-muted">ID: {p.company?.id}</small>
                                            </td>
                                            <td className="fw-bold text-success">${p.amount}</td>
                                            <td>
                                                {p.paymentType === 'EXTRA_REGISTER' ? (
                                                    <Badge bg="info" text="dark" className="me-1">
                                                        +{p.requestedExtraRegisters || 1} Caja(s) Extra
                                                    </Badge>
                                                ) : p.targetPlan && (
                                                    <Badge bg={p.targetPlan === 'PREMIUM' ? 'warning' : p.targetPlan === 'MEDIUM' ? 'primary' : 'secondary'} text={p.targetPlan === 'PREMIUM' ? 'dark' : undefined} className="me-1">
                                                        {p.targetPlan === 'BASIC' ? 'Básico' : p.targetPlan === 'MEDIUM' ? 'Medium' : 'Premium'}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td>
                                                <div className="small font-monospace">{p.paymentMethod}</div>
                                                <div className="small text-muted">{p.reference}</div>
                                                {p.billingCycle === 'ANNUAL' ? (
                                                    <Badge bg="success" className="mt-1" style={{ fontSize: '0.65rem' }}>Anual</Badge>
                                                ) : (
                                                    <Badge bg="info" className="mt-1" style={{ fontSize: '0.65rem' }}>Mensual</Badge>
                                                )}
                                            </td>
                                            <td className="small">
                                                {new Date(p.createdAt).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </td>
                                            <td>{getStatusBadge(p.status)}</td>
                                            <td>
                                                {p.status === 'PENDING' && (
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            variant="outline-success"
                                                            size="sm"
                                                            className="rounded-pill px-3"
                                                            onClick={() => openApproveModal(p)}
                                                            disabled={processing === p.id}
                                                        >
                                                            {processing === p.id ? <Spinner size="sm" animation="border" /> : <><FaCheck /> Aprobar</>}
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            className="rounded-pill px-3"
                                                            onClick={() => openRejectModal(p)}
                                                            disabled={processing === p.id}
                                                        >
                                                            <FaTimes /> Rechazar
                                                        </Button>
                                                    </div>
                                                )}
                                                {p.status !== 'PENDING' && (
                                                    <Button variant="link" size="sm" className="text-muted text-decoration-none" onClick={() => openDetailsModal(p)}>
                                                        <FaEye /> Ver detalles
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="8" className="text-center py-5">
                                                <p className="text-muted mb-0">No hay pagos que coincidan con la búsqueda.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                            {/* Pagination */}
                            {filteredPayments.length > 0 && (
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 border-top gap-3">
                                    <small className="text-muted">Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredPayments.length)} de {filteredPayments.length} pagos</small>
                                    <div className="d-flex gap-2">
                                        <Button variant="outline-primary" size="sm" className="rounded-pill px-3" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
                                        <div className="d-flex align-items-center px-3 bg-light rounded-pill fw-bold text-primary">{currentPage} de {totalPages || 1}</div>
                                        <Button variant="outline-primary" size="sm" className="rounded-pill px-3" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</Button>
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    <Modal scrollable show={showRejectModal} onHide={() => setShowRejectModal(false)} centered size="lg">
                        <Modal.Header closeButton className="border-0 pb-0">
                            <Modal.Title className="fw-bold text-danger">
                                <FaTimes className="me-2" /> Rechazar Pago
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-4">
                            {renderPaymentDetailsBox(selectedPayment)}
                            <Alert variant="warning" className="border-0 shadow-sm rounded-3 my-4">
                                <FaInfoCircle className="me-2" />
                                Indica el motivo por el cual el pago está siendo rechazado. La tienda podrá ver este mensaje.
                            </Alert>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-muted">MOTIVO DEL RECHAZO</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Ej: La referencia no coincide, el monto es incorrecto..."
                                    className="py-2"
                                />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer className="border-0">
                            <Button variant="light" onClick={() => setShowRejectModal(false)} className="rounded-pill px-4" disabled={processing === selectedPayment?.id}>Cancelar</Button>
                            <Button variant="danger" onClick={handleReject} className="rounded-pill px-4 fw-bold" disabled={processing === selectedPayment?.id}>
                                {processing === selectedPayment?.id ? <Spinner size="sm" animation="border" /> : 'Confirmar Rechazo'}
                            </Button>
                        </Modal.Footer>
                    </Modal>

                    {/* Modal para aprobar pago */}
                    <Modal scrollable show={showApproveModal} onHide={() => setShowApproveModal(false)} centered size="lg">
                        <Modal.Header closeButton className="border-0 pb-0">
                            <Modal.Title className="fw-bold text-success">
                                <FaCheck className="me-2" /> Aprobar Pago
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-4">
                            {renderPaymentDetailsBox(selectedPayment)}
                            <Alert variant="info" className="mt-4 border-0 shadow-sm rounded-3">
                                <FaInfoCircle className="me-2" />
                                Al aprobar, el plan o las cajas de la empresa se actualizarán automáticamente.
                            </Alert>
                        </Modal.Body>
                        <Modal.Footer className="border-0">
                            <Button variant="light" onClick={() => setShowApproveModal(false)} className="rounded-pill px-4" disabled={processing === selectedPayment?.id}>Cancelar</Button>
                            <Button variant="success" onClick={handleApprove} className="rounded-pill px-4 fw-bold" disabled={processing === selectedPayment?.id}>
                                {processing === selectedPayment?.id ? <Spinner size="sm" animation="border" /> : 'Sí, Aprobar Pago'}
                            </Button>
                        </Modal.Footer>
                    </Modal>

                    {/* Details Modal */}
                    <Modal scrollable show={showDetailsModal} onHide={() => setShowDetailsModal(false)} centered size="lg">
                        <Modal.Header closeButton className="border-0 bg-light pb-3">
                            <Modal.Title className="fw-bold d-flex align-items-center text-primary">
                                <FaMoneyBillWave className="me-2" /> Recibo de Pago
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-0">
                            {detailsPayment && (
                                <div className="p-4 bg-white">
                                    <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                                        <div>
                                            <h4 className="fw-bold mb-1">{detailsPayment.company?.name}</h4>
                                            <span className="text-muted small">ID Transacción: #{detailsPayment.id}</span>
                                        </div>
                                        <div className="text-end">
                                            <h3 className="fw-bold text-success mb-1">${detailsPayment.amount}</h3>
                                            {getStatusBadge(detailsPayment.status)}
                                        </div>
                                    </div>
                                    
                                    <div className="row g-4 mb-4">
                                        <div className="col-md-6">
                                            <div className="p-3 bg-light rounded-3 h-100">
                                                <p className="small text-muted fw-bold mb-3">DETALLES DEL PLAN</p>
                                                {detailsPayment.paymentType === 'EXTRA_REGISTER' ? (
                                                    <p className="mb-2"><FaCheck className="text-info me-2"/><strong>Cajas Extra:</strong> +{detailsPayment.requestedExtraRegisters || 1}</p>
                                                ) : (
                                                    <>
                                                        <p className="mb-2"><FaCheck className="text-primary me-2"/><strong>Plan:</strong> {detailsPayment.targetPlan === 'BASIC' ? 'Básico' : detailsPayment.targetPlan === 'MEDIUM' ? 'Medium' : detailsPayment.targetPlan === 'PREMIUM' ? 'Premium' : 'No especificado'}</p>
                                                        <p className="mb-0"><FaCheck className="text-success me-2"/><strong>Ciclo:</strong> {detailsPayment.billingCycle === 'ANNUAL' ? 'Anual (365 días)' : 'Mensual (30 días)'}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-3 bg-light rounded-3 h-100">
                                                <p className="small text-muted fw-bold mb-3">INFORMACIÓN DE PAGO</p>
                                                <p className="mb-2"><strong>Método:</strong> {detailsPayment.paymentMethod}</p>
                                                <p className="mb-2"><strong>Ref:</strong> {detailsPayment.reference}</p>
                                                <p className="mb-0"><strong>Fecha:</strong> {new Date(detailsPayment.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {detailsPayment.processedBy && (
                                        <Alert variant={detailsPayment.status === 'APPROVED' ? 'success' : 'danger'} className="border-0 shadow-sm mb-4 d-flex align-items-center">
                                            <FaInfoCircle className="me-2 fs-5" />
                                            <div className="ms-1">
                                                <strong>{detailsPayment.status === 'APPROVED' ? 'Aprobado por: ' : 'Rechazado por: '}</strong> 
                                                {detailsPayment.processedBy}
                                            </div>
                                        </Alert>
                                    )}
                                    
                                    {detailsPayment.notes && detailsPayment.status === 'REJECTED' && (
                                        <div className="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-3 text-danger">
                                            <p className="small fw-bold mb-1"><FaTimes className="me-2" />MOTIVO DEL RECHAZO</p>
                                            <p className="mb-0">{detailsPayment.notes}</p>
                                        </div>
                                    )}

                                    {detailsPayment.notes && detailsPayment.status !== 'REJECTED' && (
                                        <div className="p-3 bg-light border rounded-3 text-muted">
                                            <p className="small fw-bold mb-1"><FaInfoCircle className="me-2" />NOTA DEL CLIENTE</p>
                                            <p className="mb-0">{detailsPayment.notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Modal.Body>
                        <Modal.Footer className="border-0 bg-light pt-3">
                            <Button variant="secondary" onClick={() => setShowDetailsModal(false)} className="rounded-pill px-4 fw-bold shadow-sm">Cerrar Recibo</Button>
                        </Modal.Footer>
                    </Modal>
                </Container>
            </div>
        </Layout>
    );
};

export default AdminPaymentsPage;
