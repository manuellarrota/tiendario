import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Table, Card, Badge, Button, Row, Col, Form, Modal, ListGroup } from 'react-bootstrap';
import { FaHistory, FaCalendarAlt, FaTruck, FaEye, FaSearch, FaTimes, FaInbox } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import PurchaseService from '../services/purchase.service';

const PurchaseHistoryPage = () => {
    const navigate = useNavigate();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [showDetail, setShowDetail] = useState(false);

    // Filter states (inputs)
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Active filters (sent to backend — only update on Apply click)
    const [activeFilters, setActiveFilters] = useState({});

    // Pagination states
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [pageSize] = useState(10);

    const loadPurchases = React.useCallback(() => {
        setLoading(true);
        PurchaseService.getAll(page, pageSize, activeFilters).then(
            (response) => {
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
    }, [page, pageSize, activeFilters]);

    useEffect(() => {
        loadPurchases();
    }, [loadPurchases]);

    const openDetail = (purchase) => {
        setSelectedPurchase(purchase);
        setShowDetail(true);
    };

    const applyFilters = () => {
        setPage(0);
        setActiveFilters({
            supplier: filterSupplier || undefined,
            dateFrom: filterDateFrom || undefined,
            dateTo: filterDateTo || undefined,
        });
    };

    const clearFilters = () => {
        setFilterSupplier('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setActiveFilters({});
        setPage(0);
    };

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
                        <Button variant="primary" className="rounded-pill px-4 shadow-sm" onClick={() => navigate('/purchases/new')}>
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
                                    <Button
                                        variant="dark"
                                        className="w-100 rounded-pill fw-bold py-2 shadow-sm"
                                        onClick={applyFilters}
                                    >
                                        <FaSearch className="me-2" /> Aplicar Filtros
                                    </Button>
                                    {/* Active filter tags */}
                                    {Object.entries(activeFilters).some(([, v]) => v) && (
                                        <div className="mt-3 d-flex flex-column gap-1">
                                            <small className="text-muted fw-bold text-uppercase" style={{fontSize:'0.65rem'}}>Filtros aplicados:</small>
                                            {activeFilters.supplier && (
                                                <Badge bg="light" text="dark" className="border rounded-pill px-2 py-1 d-flex align-items-center gap-1">
                                                    <FaTruck size={10} className="text-primary" /> {activeFilters.supplier}
                                                </Badge>
                                            )}
                                            {activeFilters.dateFrom && (
                                                <Badge bg="light" text="dark" className="border rounded-pill px-2 py-1 d-flex align-items-center gap-1">
                                                    <FaCalendarAlt size={10} className="text-success" /> Desde: {activeFilters.dateFrom}
                                                </Badge>
                                            )}
                                            {activeFilters.dateTo && (
                                                <Badge bg="light" text="dark" className="border rounded-pill px-2 py-1 d-flex align-items-center gap-1">
                                                    <FaCalendarAlt size={10} className="text-danger" /> Hasta: {activeFilters.dateTo}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>

                            {/* Stats card */}
                            <Card className="border-0 shadow-sm rounded-4 overflow-hidden mt-3">
                                <Card.Body className="p-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <small className="text-muted text-uppercase fw-bold" style={{fontSize:'0.65rem'}}>Esta página</small>
                                        <FaHistory className="text-muted opacity-50" size={12} />
                                    </div>
                                    <div className="d-flex gap-3">
                                        <div>
                                            <div className="fw-bold text-primary fs-5">{purchases.length}</div>
                                            <small className="text-muted">compras</small>
                                        </div>
                                        <div>
                                            <div className="fw-bold text-success fs-5">{purchases.reduce((acc, p) => acc + (p.items?.length || 0), 0)}</div>
                                            <small className="text-muted">artículos</small>
                                        </div>
                                        <div>
                                            <div className="fw-bold text-dark fs-5">{totalElements}</div>
                                            <small className="text-muted">total</small>
                                        </div>
                                    </div>
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
                                                                <div className="bg-light rounded-circle p-2 me-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '38px', height: '38px' }}>
                                                                    <FaTruck className="text-primary" size={13} />
                                                                </div>
                                                                <div>
                                                                    <div className="fw-bold">{purchase.supplier?.name || 'Proveedor Directo'}</div>
                                                                    {purchase.supplier?.phone && <div className="text-muted small">{purchase.supplier.phone}</div>}
                                                                    {!purchase.supplier?.phone && purchase.supplier?.email && <div className="text-muted small">{purchase.supplier.email}</div>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <Badge bg="soft-primary" className="text-primary rounded-pill px-3 py-2 fw-normal" style={{ backgroundColor: '#e7f1ff' }}>
                                                                {purchase.items?.length || 0} productos
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3 text-end">
                                                            <div className="fw-bold text-dark">
                                                                {purchase.currencyCode && purchase.currencyCode !== 'USD' ? (
                                                                    <>
                                                                        <span className="text-muted small me-1">{purchase.currencyCode}</span>
                                                                        {purchase.total?.toLocaleString() || 0}
                                                                    </>
                                                                ) : (
                                                                    `$${purchase.total?.toLocaleString() || 0}`
                                                                )}
                                                            </div>
                                                            {purchase.currencyCode && purchase.currencyCode !== 'USD' && purchase.totalInBaseCurrency && (
                                                                <div className="text-success small">
                                                                    =${purchase.totalInBaseCurrency.toFixed(2)} USD
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="rounded-pill px-3"
                                                                onClick={() => openDetail(purchase)}
                                                            >
                                                                <FaEye className="me-1" /> Ver
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}

                                    {!loading && totalPages > 0 && (
                                        <div className="d-flex justify-content-between align-items-center px-4 py-3 border-top bg-light">
                                            <small className="text-muted">{purchases.length} de {totalElements} compras</small>
                                            <div className="d-flex align-items-center gap-1">
                                                <Button variant="light" size="sm" className="border rounded-pill px-3"
                                                    disabled={page === 0} onClick={() => setPage(0)}>
                                                    «
                                                </Button>
                                                <Button variant="light" size="sm" className="border rounded-pill px-3"
                                                    disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                                                    ‹
                                                </Button>
                                                {/* Page number buttons — show up to 5 around current */}
                                                {Array.from({ length: totalPages }, (_, i) => i)
                                                    .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
                                                    .reduce((acc, i, idx, arr) => {
                                                        if (idx > 0 && i - arr[idx - 1] > 1) acc.push('...');
                                                        acc.push(i);
                                                        return acc;
                                                    }, [])
                                                    .map((item, idx) =>
                                                        item === '...' ? (
                                                            <span key={`e${idx}`} className="px-1 text-muted small">…</span>
                                                        ) : (
                                                            <Button key={item} size="sm"
                                                                variant={item === page ? 'primary' : 'light'}
                                                                className={`border rounded-pill px-3 ${item === page ? 'fw-bold' : ''}`}
                                                                onClick={() => setPage(item)}>
                                                                {item + 1}
                                                            </Button>
                                                        )
                                                    )}
                                                <Button variant="light" size="sm" className="border rounded-pill px-3"
                                                    disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                                                    ›
                                                </Button>
                                                <Button variant="light" size="sm" className="border rounded-pill px-3"
                                                    disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
                                                    »
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
                    scrollable
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
                                        {selectedPurchase.currencyCode && selectedPurchase.currencyCode !== 'USD' ? (
                                            <>
                                                <div className="h3 fw-bold mb-0">
                                                    {selectedPurchase.currencyCode} {selectedPurchase.total?.toLocaleString() || 0}
                                                </div>
                                                <div className="small opacity-75 mb-2">Pagado en moneda local</div>
                                                <div className="fw-bold">
                                                    = ${selectedPurchase.totalInBaseCurrency?.toFixed(2) || '?'} USD
                                                </div>
                                                <div className="small opacity-75">Tasa: {selectedPurchase.exchangeRate} {selectedPurchase.currencyCode}/USD</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="h3 fw-bold mb-0">${selectedPurchase.total?.toLocaleString() || 0}</div>
                                                <div className="small opacity-75">Pago registrado exitosamente</div>
                                            </>
                                        )}
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
                                                            <div className="text-muted small">
                                                                Costo: {selectedPurchase.currencyCode && selectedPurchase.currencyCode !== 'USD' ? selectedPurchase.currencyCode : '$'}{item.unitCost}
                                                                {item.unitCostInBaseCurrency && selectedPurchase.currencyCode !== 'USD' && (
                                                                    <span className="text-success ms-2">(=${item.unitCostInBaseCurrency?.toFixed(4)} USD)</span>
                                                                )}
                                                                {' '}| Cantidad: {item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="fw-bold text-dark">
                                                            {selectedPurchase.currencyCode && selectedPurchase.currencyCode !== 'USD' ? selectedPurchase.currencyCode : '$'}{(item.quantity * (item.unitCost || 0)).toLocaleString()}
                                                        </div>
                                                        {item.subtotalInBaseCurrency && selectedPurchase.currencyCode !== 'USD' && (
                                                            <div className="text-success small">${item.subtotalInBaseCurrency?.toFixed(2)} USD</div>
                                                        )}
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
