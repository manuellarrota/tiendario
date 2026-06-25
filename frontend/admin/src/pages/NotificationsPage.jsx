import React, { useState, useEffect } from 'react';
import { Container, Card, ListGroup, Button, Badge, Modal, Row, Col, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaBell, FaCheck, FaEye, FaUser, FaPhoneAlt, FaMapMarkerAlt, FaClock, FaCheckCircle, FaTrash } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import NotificationService from '../services/notification.service';
import SaleService from '../services/sale.service';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const loadNotifications = () => {
        NotificationService.getNotifications().then(
            res => {
                setNotifications(res.data);
                setLoading(false);
            },
            () => {
                setLoading(false);
            }
        );
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const markAsRead = (id) => {
        NotificationService.markAsRead(id).then(() => {
            loadNotifications();
        });
    };

    const handleViewDetails = (notif) => {
        if (notif.type === 'SALE' && notif.referenceId) {
            SaleService.getSaleById(notif.referenceId).then(
                res => {
                    setSelectedSale(res.data);
                    setShowSaleModal(true);
                    // Mark as read automatically when opened
                    if (!notif.readStatus) {
                        markAsRead(notif.id);
                    }
                },
                () => {
                    toast.showError("❌ Error al cargar los detalles de la venta. El registro podría no estar disponible.");
                }
            );
        } else {
            // Just mark as read if it has no details
            markAsRead(notif.id);
        }
    };

    const handleStatusUpdate = (id, status) => {
        performStatusUpdate(id, status);
    };

    const performStatusUpdate = (id, status, method = null) => {
        SaleService.updateStatus(id, status, method).then(
            () => {
                // Update selected sale if detail modal is open
                if (selectedSale && selectedSale.id === id) {
                    setSelectedSale(prev => ({ ...prev, status: status, paymentMethod: method || prev.paymentMethod }));
                }
            },
            () => toast.showError("❌ Error al intentar actualizar el estado del pedido.")
        );
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAID': return <Badge bg="success" className="rounded-pill px-3">PAGADO</Badge>;
            case 'PREPARING': return <Badge bg="primary" className="rounded-pill px-3">EN PREPARACIÓN</Badge>;
            case 'READY_FOR_PICKUP': return <Badge bg="info" text="white" className="rounded-pill px-3">LISTO PARA RECOGER</Badge>;
            case 'PENDING': return <Badge bg="warning" text="dark" className="rounded-pill px-3">PENDIENTE</Badge>;
            case 'CANCELLED': return <Badge bg="danger" className="rounded-pill px-3">CANCELADO</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="d-flex admin-content-area overflow-hidden">
            <Sidebar />
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <h2 className="mb-4 d-flex align-items-center">
                        <FaBell className="me-2 text-primary" /> Centro de Notificaciones
                    </h2>

                    <Card className="border-0 shadow-sm rounded-4">
                        <Card.Header className="bg-white py-3 border-0">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold">Alertas del Sistema</h5>
                                <Badge bg="primary">{notifications.length} Totales</Badge>
                            </div>
                        </Card.Header>
                        <ListGroup variant="flush">
                            {loading ? (
                                <div className="text-center py-5">Cargando...</div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-5 text-muted">No tienes notificaciones nuevas.</div>
                            ) : (
                                notifications.map(notif => (
                                    <ListGroup.Item
                                        key={notif.id}
                                        className={`py-4 px-4 notification-item-hover ${!notif.readStatus ? 'bg-primary bg-opacity-10 border-start border-4 border-primary' : ''}`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleViewDetails(notif)}
                                    >
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="flex-grow-1">
                                                <h6 className={`fw-bold mb-1 ${!notif.readStatus ? 'text-primary' : ''}`}>
                                                    {notif.title}
                                                </h6>
                                                <p className="mb-1 text-secondary">{notif.message}</p>
                                                <div className="d-flex align-items-center gap-2">
                                                    <small className="text-muted">
                                                        {new Date(notif.createdAt).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </small>
                                                    {notif.type === 'SALE' && (
                                                        <div className="d-flex align-items-center gap-1">
                                                            <Badge bg="info" size="sm">Pedido</Badge>
                                                            {notif.relatedEntityStatus && (
                                                                <Badge bg={
                                                                    notif.relatedEntityStatus === 'PAID' ? 'success' :
                                                                    notif.relatedEntityStatus === 'CANCELLED' ? 'danger' :
                                                                    notif.relatedEntityStatus === 'READY_FOR_PICKUP' ? 'primary' :
                                                                    'warning'
                                                                } size="sm">
                                                                    {notif.relatedEntityStatus === 'PAID' ? 'PAGADO' :
                                                                     notif.relatedEntityStatus === 'CANCELLED' ? 'CANCELADO' :
                                                                     notif.relatedEntityStatus === 'READY_FOR_PICKUP' ? 'LISTO PARA RETIRO' :
                                                                     notif.relatedEntityStatus === 'PREPARING' ? 'EN PREPARACIÓN' :
                                                                     'PENDIENTE'}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {notif.type === 'SALE' ? (
                                                <OverlayTrigger overlay={<Tooltip>Ver y gestionar pedido</Tooltip>}>
                                                    <Button variant="outline-primary" size="sm" className="rounded-pill px-3">
                                                        <FaEye className="me-1" /> Gestionar
                                                    </Button>
                                                </OverlayTrigger>
                                            ) : (
                                                !notif.readStatus && (
                                                    <OverlayTrigger overlay={<Tooltip>Marcar como leída</Tooltip>}>
                                                        <Button
                                                            variant="light"
                                                            size="sm"
                                                            className="rounded-circle"
                                                            onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                                        >
                                                            <FaCheck className="text-success" />
                                                        </Button>
                                                    </OverlayTrigger>
                                                )
                                            )}
                                        </div>
                                    </ListGroup.Item>
                                ))
                            )}
                        </ListGroup>
                    </Card>
                </Container>
            </div>

            {/* Modal de Detalle de Venta */}
            <Modal scrollable show={showSaleModal} onHide={() => setShowSaleModal(false)} size="lg" centered className="rounded-4 overflow-hidden">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">Gestión de Pedido #{selectedSale?.id}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {selectedSale && (
                        <Row>
                            <Col md={6}>
                                <h6 className="text-uppercase fw-bold text-muted small mb-3">Información del Cliente</h6>
                                <div className="bg-light p-3 rounded-4 mb-4">
                                    <p className="mb-2"><FaUser className="me-2 text-primary" /> <strong>Cliente:</strong> {selectedSale.customerName || selectedSale.customer?.name || 'Cliente Mostrador'}</p>
                                    <p className="mb-2"><FaPhoneAlt className="me-2 text-primary" /> <strong>Teléfono:</strong> {selectedSale.customer?.phone || 'N/A'}</p>
                                    <p className="mb-0"><FaMapMarkerAlt className="me-2 text-primary" /> <strong>Dirección:</strong> {selectedSale.customer?.address || 'Retiro en Local'}</p>
                                </div>
                            </Col>
                            <Col md={6}>
                                <h6 className="text-uppercase fw-bold text-muted small mb-3">Resumen del Pedido</h6>
                                <div className="bg-light p-3 rounded-4 mb-4">
                                    <p className="mb-2"><strong>Estado Actual:</strong> {getStatusBadge(selectedSale.status)}</p>
                                    <p className="mb-2"><strong>Fecha:</strong> {new Date(selectedSale.date).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                    <h4 className="fw-bold text-success mb-0 mt-3">Total: ${selectedSale.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                                </div>
                            </Col>
                            <Col md={12}>
                                <h6 className="text-uppercase fw-bold text-muted small mb-3">Productos</h6>
                                <ListGroup variant="flush" className="border rounded-4 overflow-hidden">
                                    {selectedSale.items?.map((item, idx) => (
                                        <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center p-3">
                                            <div>
                                                <div className="fw-bold">{item.product?.name}</div>
                                                <small className="text-muted">{item.quantity} unidades x ${item.unitPrice}</small>
                                            </div>
                                            <div className="fw-bold">${item.subtotal}</div>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>

                                <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded-4 border border-warning border-opacity-25">
                                    <h6 className="fw-bold mb-3">Flujo de Seguimiento:</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {selectedSale.status === 'PENDING' && (
                                            <OverlayTrigger overlay={<Tooltip>Marcar pedido en preparación</Tooltip>}>
                                                <Button variant="primary" className="rounded-pill px-3" onClick={() => handleStatusUpdate(selectedSale.id, 'PREPARING')}>
                                                    1. En Preparación
                                                </Button>
                                            </OverlayTrigger>
                                        )}
                                        {(selectedSale.status === 'PENDING' || selectedSale.status === 'PREPARING') && (
                                            <OverlayTrigger overlay={<Tooltip>Ir al POS para cobrar este pedido</Tooltip>}>
                                                <Button variant="success" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => navigate(`/pos?pendingSaleId=${selectedSale.id}`)}>
                                                    Cobrar en Punto de Venta
                                                </Button>
                                            </OverlayTrigger>
                                        )}
                                        {selectedSale.status === 'PAID' && (
                                            <OverlayTrigger overlay={<Tooltip>Marcar pedido como listo para retirar</Tooltip>}>
                                                <Button variant="info" className="rounded-pill px-3 text-white" onClick={() => handleStatusUpdate(selectedSale.id, 'READY_FOR_PICKUP')}>
                                                    Listo para Retirar
                                                </Button>
                                            </OverlayTrigger>
                                        )}
                                        {selectedSale.status === 'READY_FOR_PICKUP' && (
                                            <OverlayTrigger overlay={<Tooltip>Marcar pedido como entregado al cliente</Tooltip>}>
                                                <Button variant="secondary" className="rounded-pill px-3 text-white" onClick={() => handleStatusUpdate(selectedSale.id, 'DELIVERED')}>
                                                    Entregado
                                                </Button>
                                            </OverlayTrigger>
                                        )}
                                        {selectedSale.status !== 'PAID' && selectedSale.status !== 'CANCELLED' && selectedSale.status !== 'DELIVERED' && selectedSale.status !== 'READY_FOR_PICKUP' && (
                                            <OverlayTrigger overlay={<Tooltip>Cancelar este pedido</Tooltip>}>
                                                <Button variant="outline-danger" className="rounded-pill px-3 ms-auto" onClick={() => handleStatusUpdate(selectedSale.id, 'CANCELLED')}>
                                                    Cancelar Pedido
                                                </Button>
                                            </OverlayTrigger>
                                        )}
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 p-4">
                    <Button variant="light" className="rounded-pill px-4" onClick={() => setShowSaleModal(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default NotificationsPage;
