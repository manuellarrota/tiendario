import React, { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Card, Table, Button, Badge, Spinner } from "react-bootstrap";
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

        // Start polling for real-time updates
        pollRef.current = setInterval(() => loadDashboard(false), POLL_INTERVAL_MS);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
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

    return (
        <div className="bg-light min-vh-100">
            <Navbar />
            <div className="bg-primary py-5 text-white" style={{ background: 'var(--primary-gradient)', borderRadius: '0 0 40px 40px' }}>
                <Container>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4">
                        <div>
                            <h1 className="display-5 fw-800 mb-2">Mi Panel de Cliente</h1>
                            <p className="lead opacity-75 mb-0">Gestiona tus compras y puntos de lealtad en un solo lugar.</p>
                        </div>
                        <Button 
                            onClick={() => navigate("/")} 
                            variant="white" 
                            className="glass-panel rounded-pill px-4 py-3 border-0 shadow-lg fw-bold text-primary d-flex align-items-center gap-2"
                            style={{ height: 'fit-content' }}
                        >
                            🛒 Seguir Comprando
                        </Button>
                    </div>
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
                    <Card.Header className="bg-white py-4 border-0 d-flex justify-content-between align-items-center">
                        <h4 className="fw-800 mb-0 text-gradient">Mis Pedidos Recientes</h4>
                        <div className="d-flex align-items-center gap-3">
                            {lastUpdated && (
                                <small className="text-muted">
                                    🔄 Actualizado: {lastUpdated.toLocaleTimeString()}
                                </small>
                            )}
                            <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill">Actualización automática</Badge>
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
                                    {orders.map(order => (
                                        <tr key={order.id}>
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
                                                    <div className="bg-light rounded-circle p-2 me-2" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        🏪
                                                    </div>
                                                    <span className="fw-600">{order.company?.name || "Tienda Local"}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-center">
                                                {getStatusBadge(order.status)}
                                            </td>
                                            <td className="py-3 text-end fw-bold text-success">${(order.totalAmount || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                {order.items?.map(item => (
                                                    <div key={item.id} className="small text-muted border-bottom py-1 last-child-border-0">
                                                        {item.quantity}x {item.product?.name}
                                                    </div>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                    {orders.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-5 text-muted">
                                                <div className="opacity-50 fs-2 mb-2">🛍️</div>
                                                <h5>Aún no has realizado pedidos</h5>
                                                <small>¡Explora el marketplace y acumula tus primeros puntos!</small>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>
            </Container>

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
