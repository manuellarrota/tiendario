import React, { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Card, Table, Button, Badge, Spinner, Modal, Alert, OverlayTrigger, Tooltip, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import CustomerService from "../services/customer.service";
import AuthService from "../services/auth.service";
import Navbar from "../components/Navbar";

const POLL_INTERVAL_MS = 30000; // 30 seconds

const CustomerDashboard = () => {
    const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0, lastOrderDate: null });
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);
    const [cancelFeedback, setCancelFeedback] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    
    // Filtros y Orden
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterStore, setFilterStore] = useState("ALL");
    const [sortOrder, setSortOrder] = useState("DESC");

    const navigate = useNavigate();
    const pollRef = useRef(null);

    const loadDashboard = (isInitial = false) => {
        if (isInitial) setLoading(true);
        Promise.all([CustomerService.getDashboardStats(), CustomerService.getMyOrders()])
            .then(([statsRes, ordersRes]) => {
                setStats(statsRes.data);

                // Helper to parse dates correctly even if they arrive as arrays
                const parseDate = (dateVal) => {
                    if (!dateVal) return new Date(0);
                    if (Array.isArray(dateVal)) {
                        return new Date(dateVal[0], dateVal[1] - 1, dateVal[2], dateVal[3] || 0, dateVal[4] || 0);
                    }
                    return new Date(dateVal);
                };

                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                sevenDaysAgo.setHours(0, 0, 0, 0);

                const filteredOrders = ordersRes.data.filter(o => {
                    const d = parseDate(o.date);
                    return d >= sevenDaysAgo;
                });

                setOrders(filteredOrders);
                setLastUpdated(new Date());
                if (isInitial) setLoading(false);
            })
            .catch(err => {
                console.error("Error loading dashboard", err);
                if (err.response && err.response.status === 401) {
                    localStorage.removeItem("customer");
                    window.location.href = "/";
                }
                if (isInitial) setLoading(false);
            });
    };

    useEffect(() => {
        const user = AuthService.getCurrentUser();
        if (!user) {
            navigate("/");
            return;
        }

        loadDashboard(true);
    }, [navigate]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'READY_FOR_PICKUP':
                return (
                    <Badge bg="info" className="text-white px-3 py-2 rounded-pill shadow-sm animate-pulse-subtle">
                        📦 Lista para Retirar
                    </Badge>
                );
            case 'PAID':
                return (
                    <Badge bg="success" className="px-3 py-2 rounded-pill">
                        ✅ Completado
                    </Badge>
                );
            case 'CANCELLED':
                return (
                    <Badge bg="danger" className="px-3 py-2 rounded-pill">
                        ❌ Cancelado
                    </Badge>
                );
            case 'PENDING':
            default:
                return (
                    <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">
                        ⏳ En Proceso
                    </Badge>
                );
        }
    };

    // Helper for Tooltips
    const renderTooltip = (props, text) => (
        <Tooltip id="button-tooltip" {...props}>
            {text}
        </Tooltip>
    );

    // Apply Filters & Sorting
    const getFilteredAndSortedOrders = () => {
        let result = [...orders];

        if (filterStatus !== "ALL") {
            result = result.filter(o => o.status === filterStatus);
        }

        if (filterStore !== "ALL") {
            result = result.filter(o => (o.company?.name || "Tienda Local") === filterStore);
        }

        result.sort((a, b) => {
            const dateA = Array.isArray(a.date) ? new Date(a.date[0], a.date[1]-1, a.date[2], a.date[3]||0, a.date[4]||0) : new Date(a.date);
            const dateB = Array.isArray(b.date) ? new Date(b.date[0], b.date[1]-1, b.date[2], b.date[3]||0, b.date[4]||0) : new Date(b.date);
            return sortOrder === "DESC" ? dateB - dateA : dateA - dateB;
        });

        return result;
    };

    const displayedOrders = getFilteredAndSortedOrders();
    const uniqueStores = [...new Set(orders.map(o => o.company?.name || "Tienda Local"))];

    return (
        <div className="bg-light min-vh-100">
            <Navbar />
            <div className="bg-primary py-5 text-white" style={{ background: 'var(--primary-gradient)', borderRadius: '0 0 40px 40px' }}>
                <Container>
                    <h1 className="display-5 fw-800 mb-2">Mi Panel de Cliente</h1>
                    <p className="lead opacity-75 mb-0">Gestiona tus compras y puntos de lealtad en un solo lugar.</p>
                </Container>
            </div>

            <Container className="mt-n4" style={{ marginTop: '-40px' }}>
                {/* Stats Cards */}
                <Row className="mb-5 g-4">
                    <Col md={4}>
                        <Card className="border-0 shadow-lg rounded-4 overflow-hidden h-100 card-hover">
                            <Card.Body className="p-4 d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 p-3 rounded-4 me-3">
                                    <h2 className="mb-0">💰</h2>
                                </div>
                                <div>
                                    <small className="text-muted fw-bold text-uppercase">Gasto Total</small>
                                    <h2 className="fw-800 mb-0">${stats.totalSpent?.toLocaleString()}</h2>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 shadow-lg rounded-4 overflow-hidden h-100 card-hover">
                            <Card.Body className="p-4 d-flex align-items-center">
                                <div className="bg-success bg-opacity-10 p-3 rounded-4 me-3">
                                    <h2 className="mb-0">📦</h2>
                                </div>
                                <div>
                                    <small className="text-muted fw-bold text-uppercase">Total Pedidos</small>
                                    <h2 className="fw-800 mb-0">{stats.totalOrders}</h2>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 shadow-lg rounded-4 overflow-hidden h-100 card-hover">
                            <Card.Body className="p-4 d-flex align-items-center">
                                <div className="bg-info bg-opacity-10 p-3 rounded-4 me-3">
                                    <h2 className="mb-0">🕒</h2>
                                </div>
                                <div>
                                    <small className="text-muted fw-bold text-uppercase">Última Visita</small>
                                    <h4 className="fw-800 mb-0">{stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString() : "Hoy"}</h4>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Orders Table */}
                <Card className="border-0 shadow-lg rounded-4 overflow-hidden mb-5">
                    <Card.Header className="bg-white py-4 border-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <h4 className="fw-800 mb-0 text-gradient">Mis Pedidos Recientes</h4>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <Form.Select size="sm" style={{ width: 'auto', borderRadius: '20px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="ALL">Todos los Estados</option>
                                <option value="PENDING">En Proceso</option>
                                <option value="PAID">Completado</option>
                                <option value="READY_FOR_PICKUP">Listo para Retirar</option>
                                <option value="CANCELLED">Cancelado</option>
                            </Form.Select>
                            <Form.Select size="sm" style={{ width: 'auto', borderRadius: '20px' }} value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
                                <option value="ALL">Todas las Tiendas</option>
                                {uniqueStores.map(store => (
                                    <option key={store} value={store}>{store}</option>
                                ))}
                            </Form.Select>
                            <Form.Select size="sm" style={{ width: 'auto', borderRadius: '20px' }} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                                <option value="DESC">Más Recientes</option>
                                <option value="ASC">Más Antiguos</option>
                            </Form.Select>
                            <OverlayTrigger placement="top" overlay={(p) => renderTooltip(p, "Esta tabla se actualiza automáticamente cada pocos segundos")}>
                                <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill shadow-sm" style={{ cursor: 'help' }}>🔄 Auto-update</Badge>
                            </OverlayTrigger>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {loading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-3 text-muted">Cargando tus pedidos...</p>
                            </div>
                        ) : (
                            <Table hover responsive className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="px-4 py-3 border-0">ID Pedido</th>
                                        <th className="py-3 border-0">Fecha y Hora</th>
                                        <th className="py-3 border-0">Tienda / Comercio</th>
                                        <th className="py-3 border-0 text-center">Estado</th>
                                        <th className="py-3 border-0 text-end">Monto Total</th>
                                        <th className="px-4 py-3 border-0">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedOrders.map(order => (
                                        <OverlayTrigger key={order.id} placement="top" overlay={(p) => renderTooltip(p, "Haz clic para ver el recibo y opciones de cancelación")}>
                                            <tr onClick={() => { setSelectedOrder(order); setShowModal(true); }} style={{ cursor: 'pointer' }} className="table-row-hover">
                                                <td className="px-4 py-3 fw-bold">#{order.id}</td>
                                                <td className="py-3 text-secondary">
                                                    {(() => {
                                                        const d = order.date;
                                                        if (Array.isArray(d)) {
                                                            return `${d[2]}/${d[1]}/${d[0]} ${String(d[3]).padStart(2, '0')}:${String(d[4]).padStart(2, '0')}`;
                                                        }
                                                        return new Date(d).toLocaleString();
                                                    })()}
                                                </td>
                                                <td className="py-3">
                                                    <div className="d-flex align-items-center">
                                                        <OverlayTrigger placement="top" overlay={(p) => renderTooltip(p, "Ir a la página de esta tienda")}>
                                                            <div className="bg-light rounded-circle p-2 me-2" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                🏪
                                                            </div>
                                                        </OverlayTrigger>
                                                        <span className="fw-600">{order.company?.name || "Tienda Local"}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-center">
                                                    <OverlayTrigger placement="top" overlay={(p) => renderTooltip(p, `El pedido se encuentra actualmente: ${order.status}`)}>
                                                        <div style={{ display: 'inline-block' }}>{getStatusBadge(order.status)}</div>
                                                    </OverlayTrigger>
                                                </td>
                                                <td className="py-3 text-end fw-bold text-success">${(order.totalAmount || 0).toFixed(2)}</td>
                                                <td className="px-4 py-3">
                                                    {order.items && order.items.length > 0 ? (
                                                        <div className="small text-muted">
                                                            <div className="text-truncate" style={{ maxWidth: '200px' }}>
                                                                {order.items[0].quantity}x {order.items[0].product?.name}
                                                            </div>
                                                            {order.items.length > 1 && (
                                                                <div className="fst-italic mt-1 text-primary" style={{ fontSize: '0.85em' }}>
                                                                    + {order.items.length - 1} producto(s) más
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="small text-muted">Sin productos</span>
                                                    )}
                                                </td>
                                            </tr>
                                        </OverlayTrigger>
                                    ))}
                                    {displayedOrders.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-5 text-muted">
                                                <div className="opacity-50 fs-2 mb-2">🛍️</div>
                                                <h5>No se encontraron pedidos</h5>
                                                <small>Intenta cambiar los filtros o realiza una nueva compra.</small>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>
            </Container>

            {/* Order Details Modal */}
            <Modal show={showModal} onHide={() => { setShowModal(false); setCancelFeedback(null); }} centered size="lg">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">Detalle del Pedido #{selectedOrder?.id}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0 bg-light">
                    {cancelFeedback && (
                        <div className="p-3 pb-0">
                            <Alert variant={cancelFeedback.type} className="mb-0 rounded-3 shadow-sm border-0" onClose={() => setCancelFeedback(null)} dismissible>
                                {cancelFeedback.message}
                            </Alert>
                        </div>
                    )}
                    {selectedOrder && (
                        <div className="bg-white mx-auto my-3 shadow-sm" style={{ maxWidth: '400px', border: '1px solid #eee' }}>
                            {/* Receipt Header */}
                            <div className="text-center p-4 border-bottom border-2 border-dashed">
                                <h4 className="fw-bold mb-1">{selectedOrder.company?.name || "Tienda Local"}</h4>
                                <p className="text-muted small mb-2">Recibo Electrónico</p>
                                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                                    <div className="text-start">
                                        <span className="d-block small text-muted">Orden N°</span>
                                        <span className="fw-bold">#{selectedOrder.id}</span>
                                    </div>
                                    <div className="text-end">
                                        <span className="d-block small text-muted">Fecha</span>
                                        <span className="fw-bold">
                                            {(() => {
                                                const d = selectedOrder.date;
                                                if (!d) return '-';
                                                if (Array.isArray(d)) return `${d[2]}/${d[1]}/${d[0]} ${String(d[3] || 0).padStart(2, '0')}:${String(d[4] || 0).padStart(2, '0')}`;
                                                return new Date(d).toLocaleDateString();
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Receipt Items */}
                            <div className="p-4">
                                <Table borderless size="sm" className="mb-0">
                                    <thead>
                                        <tr className="border-bottom text-muted small">
                                            <th>Cant</th>
                                            <th>Descripción</th>
                                            <th className="text-end">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="border-bottom">
                                        {selectedOrder.items?.map(item => (
                                            <tr key={item.id}>
                                                <td className="fw-semibold text-muted">{item.quantity}</td>
                                                <td>{item.product?.name}</td>
                                                <td className="text-end fw-semibold">${(item.subtotal || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>

                                {/* Totals */}
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    <span className="fw-bold fs-5">
                                        {selectedOrder.status === 'PENDING' ? 'TOTAL A PAGAR' : 'TOTAL PAGADO'}
                                    </span>
                                    <span className="fw-bold fs-4">${(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                                </div>

                                {/* Payment Details */}
                                <div className="mt-4 p-3 bg-light rounded text-center">
                                    <span className="d-block text-muted small mb-1">
                                        {selectedOrder.status === 'PENDING' ? 'Método acordado' : 'Pagado mediante'}
                                    </span>
                                    <span className="fw-bold fs-6">
                                        {selectedOrder.paymentMethod === 'CASH' ? 'Efectivo' : 
                                         selectedOrder.paymentMethod === 'CARD' ? 'Tarjeta' : 
                                         selectedOrder.paymentMethod === 'TRANSFER' ? 'Transferencia' : 
                                         selectedOrder.paymentMethod === 'MOBILE_PAYMENT' ? 'Pago Móvil' : 
                                         selectedOrder.paymentMethod || 'A convenir'}
                                        {selectedOrder.paymentCurrency && ` (${selectedOrder.paymentCurrency})`}
                                    </span>
                                    
                                    {selectedOrder.exchangeRateUsed && selectedOrder.paymentCurrency && selectedOrder.paymentCurrency !== 'USD' && (
                                        <div className="mt-2 pt-2 border-top">
                                            <div className="d-flex justify-content-between small text-muted">
                                                <span>Tasa de cambio:</span>
                                                <strong>{Number(selectedOrder.exchangeRateUsed).toFixed(2)}</strong>
                                            </div>
                                            <div className="d-flex justify-content-between small text-muted">
                                                <span>Total en {selectedOrder.paymentCurrency}:</span>
                                                <strong>{Number(selectedOrder.paymentAmountInCurrency || 0).toFixed(2)} {selectedOrder.paymentCurrency}</strong>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 text-center">
                                    <span className="d-block text-muted small mb-2">Estado del Pedido</span>
                                    {getStatusBadge(selectedOrder.status)}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0 d-flex justify-content-between">
                    {selectedOrder && (selectedOrder.status === 'PENDING' || selectedOrder.status === 'PREPARING') ? (
                        <Button variant="outline-danger" className="rounded-pill px-4" disabled={cancelling} onClick={() => setShowConfirmCancel(true)}>
                            Cancelar Pedido
                        </Button>
                    ) : <div></div>}
                    <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowModal(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Confirm Cancel Modal */}
            <Modal show={showConfirmCancel} onHide={() => !cancelling && setShowConfirmCancel(false)} centered backdrop="static">
                <Modal.Header closeButton={!cancelling} className="border-0 bg-danger text-white">
                    <Modal.Title className="fw-bold fs-5">Confirmar Cancelación</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4 text-center">
                    <div className="mb-3 text-danger" style={{ fontSize: '3rem' }}>⚠️</div>
                    <h5 className="fw-bold mb-3">¿Estás completamente seguro?</h5>
                    <p className="text-muted">
                        Esta acción cancelará tu pedido de forma permanente y devolverá el inventario a la tienda.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0 d-flex justify-content-center gap-3">
                    <Button variant="light" className="rounded-pill px-4 fw-bold" disabled={cancelling} onClick={() => setShowConfirmCancel(false)}>
                        No, mantener pedido
                    </Button>
                    <Button variant="danger" className="rounded-pill px-4 fw-bold shadow-sm" disabled={cancelling} onClick={() => {
                        setCancelling(true);
                        CustomerService.cancelOrder(selectedOrder.id)
                            .then(() => {
                                setShowConfirmCancel(false);
                                setCancelFeedback({ type: 'success', message: '✅ Tu pedido ha sido cancelado exitosamente.' });
                                loadDashboard(); // Refresh
                            })
                            .catch(err => {
                                setShowConfirmCancel(false);
                                setCancelFeedback({ type: 'danger', message: '❌ ' + (err.response?.data?.message || "No se pudo cancelar el pedido.") });
                            })
                            .finally(() => setCancelling(false));
                    }}>
                        {cancelling ? <><Spinner size="sm" animation="border" className="me-2" /> Cancelando...</> : "Sí, Cancelar Pedido"}
                    </Button>
                </Modal.Footer>
            </Modal>

            <style>{`
                @keyframes pulse-subtle {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default CustomerDashboard;
