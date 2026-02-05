import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Badge, Collapse, Button, Row, Col, Form } from 'react-bootstrap';
import { FaChevronDown, FaChevronUp, FaHistory, FaCalendarAlt, FaTruck } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import PurchaseService from '../services/purchase.service';

const PurchaseHistoryPage = () => {
    const [purchases, setPurchases] = useState([]);
    const [filteredPurchases, setFilteredPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    useEffect(() => {
        loadPurchases();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [purchases, filterSupplier, filterDateFrom, filterDateTo]);

    const loadPurchases = () => {
        PurchaseService.getAll().then(
            (response) => {
                setPurchases(response.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching purchases", error);
                setLoading(false);
            }
        );
    };

    const applyFilters = () => {
        let filtered = [...purchases];

        if (filterSupplier) {
            filtered = filtered.filter(p =>
                p.supplier?.name?.toLowerCase().includes(filterSupplier.toLowerCase())
            );
        }

        if (filterDateFrom) {
            filtered = filtered.filter(p =>
                new Date(p.date) >= new Date(filterDateFrom)
            );
        }

        if (filterDateTo) {
            const dateTo = new Date(filterDateTo);
            dateTo.setHours(23, 59, 59, 999);
            filtered = filtered.filter(p =>
                new Date(p.date) <= dateTo
            );
        }

        setFilteredPurchases(filtered);
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const clearFilters = () => {
        setFilterSupplier('');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="fw-bold"><FaHistory className="me-2" />Historial de Compras</h2>
                    </div>

                    {/* Filters */}
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body>
                            <h5 className="mb-3"><FaCalendarAlt className="me-2" />Filtros</h5>
                            <Row>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Proveedor</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Buscar por proveedor..."
                                            value={filterSupplier}
                                            onChange={(e) => setFilterSupplier(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Desde</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={filterDateFrom}
                                            onChange={(e) => setFilterDateFrom(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Hasta</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={filterDateTo}
                                            onChange={(e) => setFilterDateTo(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={2} className="d-flex align-items-end">
                                    <Button
                                        variant="outline-secondary"
                                        className="mb-3 w-100"
                                        onClick={clearFilters}
                                    >
                                        Limpiar
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Purchase History Table */}
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Cargando...</span>
                                    </div>
                                </div>
                            ) : filteredPurchases.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <FaTruck size={50} className="mb-3 opacity-25" />
                                    <h4>No hay compras registradas</h4>
                                    <p>Las compras que realices aparecerán aquí</p>
                                </div>
                            ) : (
                                <Table hover responsive>
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="border-0">ID</th>
                                            <th className="border-0">Fecha</th>
                                            <th className="border-0">Proveedor</th>
                                            <th className="border-0 text-center">Items</th>
                                            <th className="border-0 text-end">Total</th>
                                            <th className="border-0 text-center">Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPurchases.map((purchase) => (
                                            <React.Fragment key={purchase.id}>
                                                <tr>
                                                    <td className="fw-bold">#{purchase.id}</td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {new Date(purchase.date).toLocaleDateString('es-ES', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <FaTruck className="me-2 text-muted" />
                                                        {purchase.supplier?.name || 'N/A'}
                                                    </td>
                                                    <td className="text-center">
                                                        <Badge bg="info">{purchase.items?.length || 0}</Badge>
                                                    </td>
                                                    <td className="text-end fw-bold text-success">
                                                        ${purchase.total?.toLocaleString() || 0}
                                                    </td>
                                                    <td className="text-center">
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            onClick={() => toggleExpand(purchase.id)}
                                                        >
                                                            {expandedId === purchase.id ? (
                                                                <FaChevronUp />
                                                            ) : (
                                                                <FaChevronDown />
                                                            )}
                                                        </Button>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colSpan="6" className="p-0 border-0">
                                                        <Collapse in={expandedId === purchase.id}>
                                                            <div className="bg-light p-3">
                                                                <h6 className="mb-3">Detalle de Items</h6>
                                                                <Table size="sm" className="mb-0">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Producto</th>
                                                                            <th className="text-center">Cantidad</th>
                                                                            <th className="text-end">Costo Unitario</th>
                                                                            <th className="text-end">Subtotal</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {purchase.items?.map((item, idx) => (
                                                                            <tr key={idx}>
                                                                                <td>{item.product?.name || 'Producto'}</td>
                                                                                <td className="text-center">{item.quantity}</td>
                                                                                <td className="text-end">${item.unitCost}</td>
                                                                                <td className="text-end fw-bold">
                                                                                    ${(item.quantity * item.unitCost).toFixed(2)}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </Table>
                                                            </div>
                                                        </Collapse>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Summary */}
                    {filteredPurchases.length > 0 && (
                        <Card className="border-0 shadow-sm mt-3">
                            <Card.Body>
                                <Row>
                                    <Col md={4}>
                                        <div className="text-center">
                                            <h6 className="text-muted mb-1">Total Compras</h6>
                                            <h3 className="fw-bold">{filteredPurchases.length}</h3>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-center">
                                            <h6 className="text-muted mb-1">Total Items</h6>
                                            <h3 className="fw-bold">
                                                {filteredPurchases.reduce((acc, p) => acc + (p.items?.length || 0), 0)}
                                            </h3>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-center">
                                            <h6 className="text-muted mb-1">Monto Total</h6>
                                            <h3 className="fw-bold text-success">
                                                ${filteredPurchases.reduce((acc, p) => acc + (p.total || 0), 0).toLocaleString()}
                                            </h3>
                                        </div>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    )}
                </Container>
            </div>
        </div>
    );
};

export default PurchaseHistoryPage;
