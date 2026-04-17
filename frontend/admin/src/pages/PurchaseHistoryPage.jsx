import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Badge, Button, Row, Col, Form, Modal, ListGroup } from 'react-bootstrap';
import { FaHistory, FaCalendarAlt, FaTruck, FaEye, FaSearch, FaTimes, FaInbox } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import PurchaseService from '../services/purchase.service';

const PurchaseHistoryPage = () => {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [showDetail, setShowDetail] = useState(false);

    // Filter states
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Pagination states
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [pageSize] = useState(10);

    const loadPurchases = React.useCallback(() => {
        setLoading(true);
        PurchaseService.getAll(page, pageSize).then(
            (response) => {
                // If we also had filters on the backend, we would pass them here.
                // For now, let's stick to pagination as requested for performance.
                setPurchases(response.data.content);
                setTotalPages(response.data.totalPages);
                setTotalElements(response.data.totalElements);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching purchases", error);
                setLoading(false);
            }
        );
    }, [page, pageSize]);

    useEffect(() => {
        loadPurchases();
    }, [loadPurchases]);

    const openDetail = (purchase) => {
        setSelectedPurchase(purchase);
        setShowDetail(true);
    };

    const clearFilters = () => {
        setFilterSupplier('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setPage(0);
    };

    // Since backend current version only supports pagination, 
    // we'll do light frontend search on the current page for better UX 
    // OR we could implement full search on backend.
    // Given the user just asked for pagination, I'll focus on that first.
    // If they have thousands of purchases, pagination is the key.

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 className="fw-bold mb-0">Historial de Compras</h2>
                            <p className="text-muted">Gestiona el reabastecimiento de tu inventario</p>
                        </div>
                        <Button variant="primary" className="rounded-pill px-4 shadow-sm" href="/admin/purchases/new">
                            + Nueva Compra
                        </Button>
                    </div>

                    <Row>
                        {/* Filters Sidebar/Column */}
                        <Col lg={3}>
                            <Card className="border-0 shadow-sm rounded-4 mb-4">
                                <Card.Body className="p-4">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="fw-bold mb-0 text-uppercase small text-muted">Filtros de Búsqueda</h6>
                                        {(filterSupplier || filterDateFrom || filterDateTo) && (
                                            <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={clearFilters}>
                                                Limpiar
                                            </Button>
                                        )}
                                    </div>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold">Proveedor</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="text"
                                                placeholder="Nombre del proveedor..."
                                                value={filterSupplier}
                                                onChange={(e) => setFilterSupplier(e.target.value)}
                                                className="rounded-3 border-light bg-light"
                                            />
                                            <FaSearch className="position-absolute text-muted" style={{ top: '12px', right: '12px' }} />
                                        </div>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold">Desde</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={filterDateFrom}
                                            onChange={(e) => setFilterDateFrom(e.target.value)}
                                            className="rounded-3 border-light bg-light"
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-bold">Hasta</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={filterDateTo}
                                            onChange={(e) => setFilterDateTo(e.target.value)}
                                            className="rounded-3 border-light bg-light"
                                        />
                                    </Form.Group>
                                    <Button variant="dark" className="w-100 rounded-pill fw-bold py-2 shadow-sm">
                                        Aplicar Filtros
                                    </Button>
                                </Card.Body>
                            </Card>

                            <Card className="border-0 shadow-sm rounded-4 bg-primary text-white overflow-hidden">
                                <Card.Body className="p-4 position-relative" style={{ zIndex: 1 }}>
                                    <h6 className="text-white-50 small text-uppercase fw-bold mb-4">Monto total periodo</h6>
                                    <h2 className="fw-bold mb-0">${purchases.reduce((acc, p) => acc + (p.total || 0), 0).toLocaleString()}</h2>
                                    <p className="small mb-0">Basado en la página actual</p>
                                    <FaHistory className="position-absolute text-white-50" style={{ fontSize: '100px', bottom: '-20px', right: '-20px', opacity: 0.2 }} />
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Transactions List */}
                        <Col lg={9}>
                            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                                <Card.Body className="p-0">
                                    {loading ? (
                                        <div className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Cargando...</span>
                                            </div>
                                        </div>
                                    ) : purchases.length === 0 ? (
                                        <div className="text-center py-5">
                                            <FaInbox size={50} className="text-muted mb-3 opacity-25" />
                                            <h4 className="fw-bold text-muted">No se encontraron compras</h4>
                                            <p className="text-muted">Ajusta los filtros o registra una nueva compra</p>
                                        </div>
                                    ) : (
                                        <Table hover responsive className="mb-0 align-middle">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="px-4 py-3 border-0 small text-muted text-uppercase fw-bold">Compra</th>
                                                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold">Proveedor</th>
                                                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold text-center">Artículos</th>
                                                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold text-end">Total</th>
                                                    <th className="px-4 py-3 border-0 small text-muted text-uppercase fw-bold text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {purchases.map((purchase) => (
                                                    <tr key={purchase.id}>
                                                        <td className="px-4 py-3">
                                                            <div className="fw-bold text-dark">#{purchase.id}</div>
                                                            <div className="text-muted small">
                                                                {new Date(purchase.date).toLocaleDateString('es-ES', {
                                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                                    hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td className="py-3">
                                                            <div className="d-flex align-items-center">
                                                                <div className="bg-light rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                                    <FaTruck className="text-primary" />
                                                                </div>
                                                                <div>
                                                                    <div className="fw-bold">{purchase.supplier?.name || 'Proveedor Directo'}</div>
                                                                    <div className="text-muted small">ID: {purchase.supplier?.id || 'N/A'}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <Badge bg="soft-primary" className="text-primary rounded-pill px-3 py-2 fw-normal" style={{ backgroundColor: '#e7f1ff' }}>
                                                                {purchase.items?.length || 0} items
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3 text-end fw-bold text-dark">
                                                            ${purchase.total?.toLocaleString() || 0}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Button
                                                                variant="light"
                                                                size="sm"
                                                                className="rounded-circle shadow-sm"
                                                                onClick={() => openDetail(purchase)}
                                                            >
                                                                <FaEye className="text-primary" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}

                                    {!loading && totalPages > 1 && (
                                        <div className="d-flex justify-content-between align-items-center p-4 border-top bg-light-subtle">
                                            <small className="text-muted">Mostrando {purchases.length} de {totalElements} transacciones</small>
                                            <div className="d-flex gap-2">
                                                <Button
                                                    variant="white"
                                                    className="border shadow-sm rounded-pill px-3"
                                                    size="sm"
                                                    disabled={page === 0}
                                                    onClick={() => setPage(prev => prev - 1)}
                                                >
                                                    Anterior
                                                </Button>
                                                <div className="d-flex align-items-center px-2 fw-bold small text-primary">
                                                    Página {page + 1} de {totalPages}
                                                </div>
                                                <Button
                                                    variant="white"
                                                    className="border shadow-sm rounded-pill px-3"
                                                    size="sm"
                                                    disabled={page >= totalPages - 1}
                                                    onClick={() => setPage(prev => prev + 1)}
                                                >
                                                    Siguiente
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>

                {/* Modern Detail Modal */}
                <Modal 
                    show={showDetail} 
                    onHide={() => setShowDetail(false)} 
                    size="lg" 
                    centered 
                    contentClassName="rounded-4 border-0 shadow-lg"
                >
                    <Modal.Header closeButton className="border-0 px-4 pt-4">
                        <Modal.Title>
                            <h4 className="fw-bold mb-0">Detalle de Compra #{selectedPurchase?.id}</h4>
                            <p className="text-muted small mb-0 mt-1">Realizada el {selectedPurchase && new Date(selectedPurchase.date).toLocaleString('es-ES')}</p>
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="px-4 pb-4">
                        {selectedPurchase && (
                            <Row>
                                <Col md={6} className="mb-4">
                                    <div className="bg-light p-3 rounded-4 h-100">
                                        <h6 className="text-uppercase small fw-bold text-muted mb-3">Proveedor</h6>
                                        <div className="d-flex align-items-center">
                                            <div className="bg-white rounded-circle p-2 me-3 shadow-sm">
                                                <FaTruck className="text-primary" />
                                            </div>
                                            <div>
                                                <div className="fw-bold">{selectedPurchase.supplier?.name || 'N/A'}</div>
                                                <div className="text-muted small">{selectedPurchase.supplier?.email || 'Sin correo asignado'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </Col>
                                <Col md={6} className="mb-4">
                                    <div className="bg-primary-subtle p-3 rounded-4 h-100 text-primary">
                                        <h6 className="text-uppercase small fw-bold mb-3 opacity-75">Resumen Financiero</h6>
                                        <div className="h3 fw-bold mb-0">${selectedPurchase.total?.toLocaleString() || 0}</div>
                                        <div className="small opacity-75">Pago registrado exitosamente</div>
                                    </div>
                                </Col>
                                <Col md={12}>
                                    <h6 className="text-uppercase small fw-bold text-muted mb-3">Artículos del Lote</h6>
                                    <ListGroup variant="flush" className="border rounded-4 overflow-hidden shadow-sm">
                                        {selectedPurchase.items?.map((item, idx) => (
                                            <ListGroup.Item key={idx} className="p-3 border-light bg-hover-light transition-all">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div className="d-flex align-items-center">
                                                        <div className="bg-light rounded p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                                                            {item.product?.image ? (
                                                                <img src={item.product.image} alt={item.product?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="rounded" />
                                                            ) : (
                                                                <FaInbox className="text-muted opacity-50" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="fw-bold text-dark">{item.product?.name || 'Producto'}</div>
                                                            <div className="text-muted small">Costo: ${item.unitCost} | Cantidad: {item.quantity}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="fw-bold text-dark">${(item.quantity * (item.unitCost || 0)).toLocaleString()}</div>
                                                        <div className="text-muted small">Subtotal</div>
                                                    </div>
                                                </div>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </Col>
                            </Row>
                        )}
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default PurchaseHistoryPage;
