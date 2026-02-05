import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import CustomerService from "../services/customer.service";
import AuthService from "../services/auth.service";
import Navbar from "../components/Navbar";

const CustomerDashboard = () => {
    const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0, lastOrderDate: null });
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const user = AuthService.getCurrentUser();
        if (!user) {
            navigate("/");
            return;
        }

        Promise.all([CustomerService.getDashboardStats(), CustomerService.getMyOrders()])
            .then(([statsRes, ordersRes]) => {
                setStats(statsRes.data);
                setOrders(ordersRes.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading dashboard", err);
                setLoading(false);
            });
    }, [navigate]);

    return (
        <div className="bg-light min-vh-100">
            <Navbar />
            <div className="bg-primary py-5 text-white" style={{ background: 'var(--primary-gradient)', borderRadius: '0 0 40px 40px' }}>
                <Container>
                    <h1 className="display-5 fw-800 mb-2">Mi Panel de Cliente</h1>
                    <p className="lead opacity-75">Gestiona tus compras y puntos de lealtad en un solo lugar.</p>
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
                        <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill">Historial Completo</Badge>
                    </Card.Header>
                    <Card.Body className="p-0">
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
                                        <td className="py-3 text-secondary">{new Date(order.date).toLocaleString()}</td>
                                        <td className="py-3">
                                            <div className="d-flex align-items-center">
                                                <div className="bg-light rounded-circle p-2 me-2" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    🏪
                                                </div>
                                                <span className="fw-600">{order.company?.name || "Tienda Local"}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-center">
                                            {order.status === 'READY_FOR_PICKUP' ? (
                                                <Badge bg="info" className="text-white px-3 py-2 rounded-pill shadow-sm">
                                                    Lista para Retirar
                                                </Badge>
                                            ) : order.status === 'PAID' ? (
                                                <Badge bg="success" className="px-3 py-2 rounded-pill">
                                                    Completado
                                                </Badge>
                                            ) : (
                                                <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">
                                                    En Proceso
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="py-3 text-end fw-bold text-success">${order.totalAmount.toFixed(2)}</td>
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
                                        <td colSpan="5" className="text-center py-5 text-muted">
                                            <div className="opacity-50 fs-2 mb-2">🛍️</div>
                                            <h5>Aún no has realizado pedidos</h5>
                                            <small>¡Explora el marketplace y acumula tus primeros puntos!</small>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default CustomerDashboard;
