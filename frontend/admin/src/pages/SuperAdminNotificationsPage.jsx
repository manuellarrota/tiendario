import React, { useState, useEffect } from 'react';
import { Container, Card, ListGroup, Button, Badge, Modal, Row, Col, Form, OverlayTrigger, Tooltip, Pagination, InputGroup } from 'react-bootstrap';
import { FaBell, FaCheck, FaEye, FaSearch, FaExclamationTriangle, FaMoneyBillWave, FaBullhorn, FaInfoCircle, FaTimes } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import AdminService from '../services/admin.service';
import { useToast } from '../components/ToastContext';

const SuperAdminNotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    
    const [selectedNotif, setSelectedNotif] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    
    // For Reject Payment
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [paymentToReject, setPaymentToReject] = useState(null);
    const [paymentDetails, setPaymentDetails] = useState(null);
    
    // For Approve Payment
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [paymentToApprove, setPaymentToApprove] = useState(null);
    
    const toast = useToast();

    const loadNotifications = () => {
        setLoading(true);
        AdminService.getSuperAdminNotifications(page, 10, filterType, search, filterStatus).then(
            res => {
                setNotifications(res.data.content);
                setTotalPages(res.data.totalPages);
                setLoading(false);
            },
            () => {
                setLoading(false);
            }
        );
    };

    useEffect(() => {
        loadNotifications();
    }, [page, filterType, filterStatus]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(0);
        loadNotifications();
    };

    const markAsRead = (id) => {
        AdminService.markNotificationAsRead(id).then(() => {
            loadNotifications();
        });
    };

    const handleViewDetails = (notif) => {
        setSelectedNotif(notif);
        setShowDetailModal(true);
        setPaymentDetails(null);

        if (notif.type === 'SUBSCRIPTION_PAYMENT' && notif.referenceId) {
            AdminService.getPaymentById(notif.referenceId).then(
                res => setPaymentDetails(res.data),
                err => console.error("Could not fetch payment details", err)
            );
        }

        if (!notif.readStatus) {
            markAsRead(notif.id);
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

    const getIconForType = (type) => {
        switch (type) {
            case 'SYSTEM_ALERT': return <FaExclamationTriangle className="text-danger" />;
            case 'SUBSCRIPTION_PAYMENT': return <FaMoneyBillWave className="text-success" />;
            case 'NEWS': return <FaBullhorn className="text-info" />;
            default: return <FaBell className="text-primary" />;
        }
    };

    const getBadgeForType = (type) => {
        switch (type) {
            case 'SYSTEM_ALERT': return <Badge bg="danger">ALERTA SISTEMA</Badge>;
            case 'SUBSCRIPTION_PAYMENT': return <Badge bg="success">PAGO</Badge>;
            case 'NEWS': return <Badge bg="info">NOVEDAD</Badge>;
            default: return <Badge bg="secondary">{type || 'GENERAL'}</Badge>;
        }
    };

    const openApproveModal = (id) => {
        setPaymentToApprove(id);
        setShowApproveModal(true);
    };

    const confirmApprovePayment = () => {
        AdminService.approvePayment(paymentToApprove).then(
            () => {
                toast.showSuccess("Pago aprobado exitosamente.");
                setShowApproveModal(false);
                setShowDetailModal(false);
                loadNotifications();
            },
            () => toast.showError("Error al aprobar pago.")
        );
    };

    const openRejectModal = (id) => {
        setPaymentToReject(id);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const confirmRejectPayment = () => {
        if (!rejectReason.trim()) {
            toast.showError("Debes ingresar un motivo de rechazo.");
            return;
        }
        AdminService.rejectPayment(paymentToReject, rejectReason).then(
            () => {
                toast.showSuccess("Pago rechazado.");
                setShowRejectModal(false);
                setShowDetailModal(false);
                loadNotifications();
            },
            () => toast.showError("Error al rechazar pago.")
        );
    };

    return (
        <div className="d-flex admin-content-area overflow-hidden">
            <Sidebar isSuperAdmin={true} />
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <h2 className="mb-4 d-flex align-items-center">
                        <FaBell className="me-2 text-primary" /> Centro Global de Notificaciones
                    </h2>

                    <Row className="mb-4">
                        <Col md={6}>
                            <Form onSubmit={handleSearch}>
                                <InputGroup>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por titulo o mensaje..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                    <Button variant="primary" type="submit">
                                        <FaSearch /> Buscar
                                    </Button>
                                </InputGroup>
                            </Form>
                        </Col>
                        <Col md={6} className="text-md-end mt-3 mt-md-0 d-flex gap-2 justify-content-md-end">
                            <Form.Select 
                                value={filterStatus} 
                                onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                                style={{ width: 'auto', display: 'inline-block' }}
                            >
                                <option value="">Todos los Estados</option>
                                <option value="UNREAD">No Leídos</option>
                                <option value="READ">Leídos</option>
                            </Form.Select>
                            <Form.Select 
                                value={filterType} 
                                onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
                                style={{ width: 'auto', display: 'inline-block' }}
                            >
                                <option value="">Todos los Tipos</option>
                                <option value="SUBSCRIPTION_PAYMENT">Pagos / Membresías</option>
                                <option value="SYSTEM_ALERT">Alertas del Sistema</option>
                                <option value="NEWS">Novedades</option>
                            </Form.Select>
                        </Col>
                    </Row>

                    <Card className="border-0 shadow-sm rounded-4">
                        <Card.Header className="bg-white py-3 border-0">
                            <h5 className="mb-0 fw-bold">Alertas y Registros</h5>
                        </Card.Header>
                        <ListGroup variant="flush">
                            {loading ? (
                                <div className="text-center py-5">Cargando...</div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-5 text-muted">No se encontraron notificaciones.</div>
                            ) : (
                                notifications.map(notif => (
                                    <ListGroup.Item
                                        key={notif.id}
                                        className={`py-4 px-4 notification-item-hover ${!notif.readStatus ? 'bg-primary bg-opacity-10 border-start border-4 border-primary' : ''}`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleViewDetails(notif)}
                                    >
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="me-3 mt-1 fs-4">
                                                {getIconForType(notif.type)}
                                            </div>
                                            <div className="flex-grow-1">
                                                <h6 className={`fw-bold mb-1 ${!notif.readStatus ? 'text-primary' : ''}`}>
                                                    {notif.title}
                                                </h6>
                                                <p className="mb-1 text-secondary text-truncate" style={{ maxWidth: '800px' }}>{notif.message}</p>
                                                <div className="d-flex align-items-center gap-2 mt-2">
                                                    <small className="text-muted">
                                                        {new Date(notif.createdAt).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </small>
                                                    {getBadgeForType(notif.type)}
                                                </div>
                                            </div>
                                            <div className="ms-3 d-flex flex-column align-items-end gap-2">
                                                <Button variant="outline-primary" size="sm" className="rounded-pill px-3">
                                                    <FaEye className="me-1" /> Ver Detalle
                                                </Button>
                                                {!notif.readStatus && (
                                                    <Button
                                                        variant="light"
                                                        size="sm"
                                                        className="rounded-circle"
                                                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                                    >
                                                        <FaCheck className="text-success" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                ))
                            )}
                        </ListGroup>
                        
                        {totalPages > 1 && (
                            <Card.Footer className="bg-white border-0 py-3">
                                <Pagination className="justify-content-center mb-0">
                                    <Pagination.Prev disabled={page === 0} onClick={() => setPage(page - 1)} />
                                    <Pagination.Item disabled>{page + 1} de {totalPages}</Pagination.Item>
                                    <Pagination.Next disabled={page === totalPages - 1} onClick={() => setPage(page + 1)} />
                                </Pagination>
                            </Card.Footer>
                        )}
                    </Card>
                </Container>
            </div>

            {/* Modal de Detalle */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered className="rounded-4">
                <Modal.Header closeButton className={(selectedNotif?.type === 'SYSTEM_ALERT' ? 'bg-danger text-white' : (selectedNotif?.type === 'SUBSCRIPTION_PAYMENT' && paymentDetails ? 'bg-light border-0 pb-3' : ''))}>
                    <Modal.Title className={`fw-bold ${selectedNotif?.type === 'SUBSCRIPTION_PAYMENT' && paymentDetails ? 'd-flex align-items-center text-primary' : ''}`}>
                        {selectedNotif?.type === 'SYSTEM_ALERT' ? '⚠️ Alerta Crítica del Sistema' : selectedNotif?.type === 'SUBSCRIPTION_PAYMENT' && paymentDetails ? <><FaMoneyBillWave className="me-2" /> Recibo de Pago</> : 'Detalle de Notificación'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className={selectedNotif?.type === 'SUBSCRIPTION_PAYMENT' && paymentDetails ? 'p-0' : 'p-4'}>
                    {selectedNotif && selectedNotif.type === 'SUBSCRIPTION_PAYMENT' && paymentDetails ? (
                        <div className="p-4 bg-white">
                            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                                <div>
                                    <h4 className="fw-bold mb-1">{paymentDetails.company?.name}</h4>
                                    <span className="text-muted small">ID Transacción: #{paymentDetails.id}</span>
                                </div>
                                <div className="text-end">
                                    <h3 className="fw-bold text-success mb-1">{paymentDetails.amount} USD</h3>
                                    {getPaymentStatusBadge(paymentDetails.status)}
                                </div>
                            </div>
                            
                            <div className="row g-4 mb-4">
                                <div className="col-md-6">
                                    <div className="p-3 bg-light rounded-3 h-100">
                                        <p className="small text-muted fw-bold mb-3">DETALLES DEL PLAN</p>
                                        {paymentDetails.paymentType === 'EXTRA_REGISTER' ? (
                                            <p className="mb-2"><FaCheck className="text-info me-2"/><strong>Cajas Extra:</strong> +{paymentDetails.requestedExtraRegisters || 1}</p>
                                        ) : (
                                            <>
                                                <p className="mb-2"><FaCheck className="text-primary me-2"/><strong>Plan:</strong> {paymentDetails.targetPlan === 'BASIC' ? 'Básico' : paymentDetails.targetPlan === 'MEDIUM' ? 'Medium' : paymentDetails.targetPlan === 'PREMIUM' ? 'Premium' : 'No especificado'}</p>
                                                <p className="mb-0"><FaCheck className="text-success me-2"/><strong>Ciclo:</strong> {paymentDetails.billingCycle === 'ANNUAL' ? 'Anual (365 días)' : 'Mensual (30 días)'}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="p-3 bg-light rounded-3 h-100">
                                        <p className="small text-muted fw-bold mb-3">INFORMACIÓN DE PAGO</p>
                                        <p className="mb-2"><strong>Método:</strong> {paymentDetails.paymentMethod}</p>
                                        <p className="mb-2"><strong>Ref:</strong> {paymentDetails.reference}</p>
                                        <p className="mb-0"><strong>Fecha:</strong> {new Date(paymentDetails.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {paymentDetails.processedBy && (
                                <div className={`alert border-0 shadow-sm mb-4 d-flex align-items-center ${paymentDetails.status === 'APPROVED' ? 'alert-success' : 'alert-danger'}`}>
                                    <FaInfoCircle className="me-2 fs-5" />
                                    <div className="ms-1">
                                        <strong>{paymentDetails.status === 'APPROVED' ? 'Aprobado por: ' : 'Rechazado por: '}</strong> 
                                        {paymentDetails.processedBy}
                                    </div>
                                </div>
                            )}
                            
                            {paymentDetails.notes && paymentDetails.status === 'REJECTED' && (
                                <div className="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-3 text-danger mb-4">
                                    <p className="small fw-bold mb-1"><FaTimes className="me-2" />MOTIVO DEL RECHAZO</p>
                                    <p className="mb-0">{paymentDetails.notes}</p>
                                </div>
                            )}

                            {paymentDetails.notes && paymentDetails.status !== 'REJECTED' && (
                                <div className="p-3 bg-light border rounded-3 text-muted mb-4">
                                    <p className="small fw-bold mb-1"><FaInfoCircle className="me-2" />NOTA DEL CLIENTE</p>
                                    <p className="mb-0">{paymentDetails.notes}</p>
                                </div>
                            )}

                            {paymentDetails.status === 'PENDING' && (
                                <div className="mt-4 p-3 border border-success rounded-3 bg-success bg-opacity-10">
                                    <h6 className="fw-bold text-success mb-3">Acciones de Pago</h6>
                                    <div className="d-flex gap-2">
                                        <Button variant="success" onClick={() => openApproveModal(selectedNotif.referenceId)}>
                                            <FaCheck className="me-2" /> Aprobar Pago
                                        </Button>
                                        <Button variant="danger" onClick={() => openRejectModal(selectedNotif.referenceId)}>
                                            <FaTimes className="me-1" /> Rechazar Pago
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : selectedNotif ? (
                        <div>
                            <div className="d-flex justify-content-between mb-3">
                                <h5 className="fw-bold">{selectedNotif.title}</h5>
                                {getBadgeForType(selectedNotif.type)}
                            </div>
                            <div className="bg-light p-3 rounded-3 mb-4" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {selectedNotif.message}
                            </div>
                            
                            <p className="text-muted small">Fecha: {new Date(selectedNotif.createdAt).toLocaleString('es-ES')}</p>

                            {selectedNotif.type === 'SUBSCRIPTION_PAYMENT' && selectedNotif.referenceId && !paymentDetails && (
                                <div className="text-center py-4 text-muted">Cargando detalles del pago...</div>
                            )}
                        </div>
                    ) : null}
                </Modal.Body>
                <Modal.Footer className={`border-0 ${selectedNotif?.type === 'SUBSCRIPTION_PAYMENT' && paymentDetails ? 'bg-light pt-3' : 'p-4'}`}>
                    <Button variant="secondary" onClick={() => setShowDetailModal(false)} className={selectedNotif?.type === 'SUBSCRIPTION_PAYMENT' && paymentDetails ? 'rounded-pill px-4 fw-bold shadow-sm' : ''}>
                        {selectedNotif?.type === 'SUBSCRIPTION_PAYMENT' && paymentDetails ? 'Cerrar Recibo' : 'Cerrar'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal para Rechazar Pago */}
            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Rechazar Pago</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Motivo del rechazo (se enviará a la tienda):</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={3} 
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Ej. Comprobante ilegible, monto incorrecto..."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setShowRejectModal(false)}>Cancelar</Button>
                    <Button variant="danger" onClick={confirmRejectPayment}>Confirmar Rechazo</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal para Aprobar Pago */}
            <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)} centered>
                <Modal.Header closeButton className="bg-success text-white border-0">
                    <Modal.Title className="fw-bold"><FaCheck className="me-2" />Aprobar Pago</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4 text-center">
                    <FaMoneyBillWave className="text-success mb-3" style={{fontSize: '3.5rem'}} />
                    <h5 className="fw-bold mb-3">¿Estás completamente seguro?</h5>
                    <p className="text-muted mb-0">Al aprobar este pago, se actualizará el estado de la suscripción de la tienda y se le otorgarán los días y beneficios correspondientes al plan pagado.</p>
                </Modal.Body>
                <Modal.Footer className="border-0 justify-content-center pb-4 pt-0 gap-2">
                    <Button variant="light" className="px-4 rounded-pill fw-bold shadow-sm" onClick={() => setShowApproveModal(false)}>Cancelar</Button>
                    <Button variant="success" className="px-4 rounded-pill fw-bold shadow-sm" onClick={confirmApprovePayment}>Sí, Aprobar Pago</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default SuperAdminNotificationsPage;
