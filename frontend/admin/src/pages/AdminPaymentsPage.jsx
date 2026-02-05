import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { FaMoneyBillWave, FaCheck, FaTimes, FaEye, FaInfoCircle } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';

const AdminPaymentsPage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = () => {
        setLoading(true);
        AdminService.getGlobalPayments().then(
            (response) => {
                setPayments(response.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading global payments", error);
                setError("No se pudieron cargar los pagos globales.");
                setLoading(false);
            }
        );
    };

    const handleApprove = (id) => {
        if (!window.confirm("¿Estás seguro de aprobar este pago? Se actualizará el plan de la empresa a PAID.")) return;

        setProcessing(id);
        AdminService.approvePayment(id).then(
            () => {
                setPayments(payments.map(p => p.id === id ? { ...p, status: 'APPROVED' } : p));
                setProcessing(null);
            },
            (err) => {
                console.error("Error approving payment", err);
                alert("Error al aprobar pago");
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
            alert("Por favor indica un motivo de rechazo");
            return;
        }

        setProcessing(selectedPayment.id);
        AdminService.rejectPayment(selectedPayment.id, rejectReason).then(
            () => {
                setPayments(payments.map(p => p.id === selectedPayment.id ? { ...p, status: 'REJECTED', notes: rejectReason } : p));
                setProcessing(null);
                setShowRejectModal(false);
                setRejectReason('');
            },
            (err) => {
                console.error("Error rejecting payment", err);
                alert("Error al rechazar pago");
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
                        <FaMoneyBillWave className="me-3 text-success" />
                        Validación de Pagos (Membresías)
                    </h2>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">ID</th>
                                        <th>Empresa</th>
                                        <th>Monto</th>
                                        <th>Referencia</th>
                                        <th>Fecha</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.length > 0 ? payments.map((p) => (
                                        <tr key={p.id}>
                                            <td className="ps-4 text-muted small">#{p.id}</td>
                                            <td>
                                                <div className="fw-bold">{p.company?.name}</div>
                                                <small className="text-muted">ID: {p.company?.id}</small>
                                            </td>
                                            <td className="fw-bold text-success">${p.amount}</td>
                                            <td>
                                                <div className="small font-monospace">{p.paymentMethod}</div>
                                                <div className="small text-muted">{p.reference}</div>
                                            </td>
                                            <td className="small">
                                                {new Date(p.createdAt).toLocaleString()}
                                            </td>
                                            <td>{getStatusBadge(p.status)}</td>
                                            <td>
                                                {p.status === 'PENDING' && (
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            variant="outline-success"
                                                            size="sm"
                                                            className="rounded-pill px-3"
                                                            onClick={() => handleApprove(p.id)}
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
                                                    <Button variant="link" size="sm" className="text-muted text-decoration-none">
                                                        <FaEye /> Ver detalles
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="7" className="text-center py-5">
                                                <p className="text-muted mb-0">No hay pagos pendientes de revisión.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>

                    <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
                        <Modal.Header closeButton className="border-0">
                            <Modal.Title className="fw-bold text-danger">Rechazar Pago</Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-4">
                            <p className="small text-muted mb-3">
                                Indica el motivo por el cual el pago está siendo rechazado. La tienda podrá ver este mensaje.
                            </p>
                            <Form.Group>
                                <Form.Label className="small fw-bold">MOTIVO DEL RECHAZO</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Ej: La referencia no coincide, el monto es incorrecto..."
                                />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer className="border-0">
                            <Button variant="light" onClick={() => setShowRejectModal(false)} className="rounded-pill px-4">Cancelar</Button>
                            <Button variant="danger" onClick={handleReject} className="rounded-pill px-4">Confirmar Rechazo</Button>
                        </Modal.Footer>
                    </Modal>
                </Container>
            </div>
        </div>
    );
};

export default AdminPaymentsPage;
