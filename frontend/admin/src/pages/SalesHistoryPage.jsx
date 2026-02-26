import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, ListGroup, Form } from 'react-bootstrap';
import { FaHistory, FaEye, FaCheckCircle, FaClock, FaUser, FaPhoneAlt, FaMapMarkerAlt } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import SaleService from '../services/sale.service';
import PublicService from '../services/public.service';

const SalesHistoryPage = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [platformConfig, setPlatformConfig] = useState(null);

    const formatSecondary = (amount) => {
        if (!platformConfig || !platformConfig.enableSecondaryCurrency) return null;
        const converted = amount * platformConfig.exchangeRate;
        return `${platformConfig.secondaryCurrencySymbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    useEffect(() => {
        loadSales();
        PublicService.getPlatformConfig().then(
            (res) => setPlatformConfig(res.data),
            (err) => console.error('Error loading config', err)
        );

        // 30 Seconds Polling for live updates (market orders)
        const interval = setInterval(() => {
            loadSales(true); // silent refresh
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadSales = (silent = false) => {
        if (!silent) setLoading(true);
        SaleService.getSales().then(
            (response) => {
                setSales(response.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading sales", error);
                setLoading(false);
            }
        );
    };

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [saleToPay, setSaleToPay] = useState(null);

    const handleStatusUpdate = (id, status) => {
        if (status === 'PAID') {
            setSaleToPay(id);
            setPaymentMethod('CASH'); // Default
            setShowPaymentModal(true);
            return;
        }

        if (window.confirm(`¿Seguro que quieres cambiar el estado a ${status}?`)) {
            performStatusUpdate(id, status);
        }
    };

    const confirmPayment = () => {
        if (saleToPay) {
            performStatusUpdate(saleToPay, 'PAID', paymentMethod);
            setShowPaymentModal(false);
            setSaleToPay(null);
        }
    };

    const performStatusUpdate = (id, status, method = null) => {
        SaleService.updateStatus(id, status, method).then(
            () => {
                // Update local state immediately for instant feedback
                setSales(prevSales => prevSales.map(sale =>
                    sale.id === id ? { ...sale, status: status, paymentMethod: method || sale.paymentMethod } : sale
                ));

                // Update selected sale if detail modal is open
                if (selectedSale && selectedSale.id === id) {
                    setSelectedSale(prev => ({ ...prev, status: status, paymentMethod: method || prev.paymentMethod }));
                }

                // Reload from server to ensure consistency (silently to avoid disrupt)
                loadSales(true);
            },
            (error) => alert("Error al actualizar estado")
        );
    };

    const openDetail = (sale) => {
        setSelectedSale(sale);
        setShowDetail(true);
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

    const filteredSales = filterStatus === 'ALL'
        ? sales
        : sales.filter(s => s.status === filterStatus);

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                {/* ... existing header and sales table ... */}

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="fw-bold mb-0">Seguimiento de Pedidos</h2>
                        <p className="text-muted">Administra tus ventas del local y pedidos del Marketplace</p>
                    </div>
                    <div className="d-flex gap-2">
                        <Form.Select
                            className="rounded-3 shadow-sm"
                            style={{ width: '200px' }}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="ALL">Todos los estados</option>
                            <option value="PENDING">Pendientes</option>
                            <option value="PREPARING">En Preparación</option>
                            <option value="READY_FOR_PICKUP">Listos para Retiro</option>
                            <option value="PAID">Pagados / Completados</option>
                        </Form.Select>
                        <Button variant="outline-primary" onClick={loadSales} className="rounded-3 shadow-sm">
                            Actualizar
                        </Button>
                    </div>
                </div>

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th className="px-4 py-3">ID / Fecha</th>
                                    <th className="py-3">Cliente</th>
                                    <th className="py-3 text-center">Estado</th>
                                    <th className="py-3 text-end">Total</th>
                                    <th className="py-3 text-center px-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td className="px-4">
                                            <div className="fw-bold text-primary">#{sale.id}</div>
                                            <small className="text-muted">{sale.date ? new Date(sale.date).toLocaleString() : 'N/A'}</small>
                                        </td>
                                        <td>
                                            <div className="fw-bold">{sale.customerName || sale.customer?.name || 'Venta Mostrador'}</div>
                                            <small className="text-muted">{sale.customer?.email || 'Presencial'}</small>
                                        </td>
                                        <td className="text-center">{getStatusBadge(sale.status)}</td>
                                        <td className="text-end fw-bold text-success">
                                            ${sale.totalAmount ? sale.totalAmount.toLocaleString() : '0'}
                                            {platformConfig?.enableSecondaryCurrency && sale.totalAmount > 0 && (
                                                <div className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>{formatSecondary(sale.totalAmount)}</div>
                                            )}
                                        </td>
                                        <td className="text-center px-4">
                                            <Button variant="light" size="sm" className="rounded-circle me-1" onClick={() => openDetail(sale)}>
                                                <FaEye className="text-primary" />
                                            </Button>
                                            {sale.status === 'PENDING' && (
                                                <Button variant="light" size="sm" className="rounded-circle" title="Marcar Listo para Recoger" onClick={() => handleStatusUpdate(sale.id, 'READY_FOR_PICKUP')}>
                                                    <FaClock className="text-info" />
                                                </Button>
                                            )}
                                            {sale.status === 'READY_FOR_PICKUP' && (
                                                <Button variant="light" size="sm" className="rounded-circle" title="Registrar Pago" onClick={() => handleStatusUpdate(sale.id, 'PAID')}>
                                                    <FaCheckCircle className="text-success" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredSales.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5">
                                            <div className="opacity-25 display-1 mb-2">📥</div>
                                            <p className="text-muted">No se encontraron ventas para este filtro.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>

                {/* Modal de Detalle */}
                <Modal show={showDetail} onHide={() => setShowDetail(false)} size="lg" centered className="rounded-4 overflow-hidden">
                    <Modal.Header closeButton>
                        <Modal.Title className="fw-bold">Detalle de la Venta #{selectedSale?.id}</Modal.Title>
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
                                    <h6 className="text-uppercase fw-bold text-muted small mb-3">Resumen de Pago</h6>
                                    <div className="bg-light p-3 rounded-4 mb-4">
                                        <p className="mb-2"><strong>Estado:</strong> {getStatusBadge(selectedSale.status)}</p>
                                        <p className="mb-2"><strong>Fecha:</strong> {selectedSale.date ? new Date(selectedSale.date).toLocaleString() : 'N/A'}</p>
                                        <p className="mb-2"><strong>Método:</strong> {selectedSale.paymentMethod || 'Pendiente'}</p>
                                        <h4 className="fw-bold text-success mb-0 mt-3">Total: ${selectedSale.totalAmount ? selectedSale.totalAmount.toLocaleString() : '0'}</h4>
                                        {platformConfig?.enableSecondaryCurrency && selectedSale.totalAmount > 0 && (
                                            <h5 className="text-muted mt-1 mb-0">{formatSecondary(selectedSale.totalAmount)}</h5>
                                        )}
                                    </div>
                                </Col>
                                <Col md={12}>
                                    <h6 className="text-uppercase fw-bold text-muted small mb-3">Productos Detallados</h6>
                                    <ListGroup variant="flush" className="border rounded-4 overflow-hidden">
                                        {selectedSale.items?.map((item, idx) => (
                                            <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center p-3">
                                                <div>
                                                    <div className="fw-bold">{item.product?.name}</div>
                                                    <small className="text-muted">SKU: {item.product?.sku} | {item.quantity} unidades x ${item.unitPrice}</small>
                                                </div>
                                                <div className="fw-bold">${item.subtotal}</div>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </Col>
                            </Row>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="border-0 p-4">
                        {selectedSale?.status === 'PENDING' && (
                            <Button variant="info" className="rounded-pill px-4 fw-bold text-white" onClick={() => handleStatusUpdate(selectedSale.id, 'READY_FOR_PICKUP')}>
                                <FaClock className="me-2" /> Marcar Listo para Retiro
                            </Button>
                        )}
                        {selectedSale?.status === 'READY_FOR_PICKUP' && (
                            <Button variant="success" className="rounded-pill px-4 fw-bold" onClick={() => handleStatusUpdate(selectedSale.id, 'PAID')}>
                                <FaCheckCircle className="me-2" /> Marcar como Pagado y Entregado
                            </Button>
                        )}
                        <Button variant="light" className="rounded-pill px-4" onClick={() => setShowDetail(false)}>
                            Cerrar
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Confirm Payment Modal */}
                <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title className="fw-bold">Confirmar Pago</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <p className="mb-3">Selecciona el método de pago con el que el cliente ha cancelado la orden:</p>
                        <Form.Select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="mb-3 py-3 rounded-3 shadow-sm"
                        >
                            <option value="CASH">Efectivo 💵</option>
                            <option value="CARD">Tarjeta de Débito/Crédito 💳</option>
                            <option value="TRANSFER">Transferencia / Pago Móvil 📲</option>
                            <option value="OTHER">Otro 📝</option>
                        </Form.Select>
                        <div className="d-grid gap-2">
                            <Button variant="primary" size="lg" className="rounded-pill fw-bold" onClick={confirmPayment}>
                                Confirmar Pago
                            </Button>
                        </div>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default SalesHistoryPage;
