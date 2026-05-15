import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Table, Card, Badge, Button, Row, Col, Form, Modal, ListGroup } from 'react-bootstrap';
import { FaHistory, FaCalendarAlt, FaTruck, FaEye, FaSearch, FaTimes, FaInbox } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import PurchaseService from '../services/purchase.service';
import PublicService from '../services/public.service';

const PurchaseHistoryPage = () => {
    const navigate = useNavigate();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [platformConfig, setPlatformConfig] = useState(null);
 
    const availableCurrencies = useMemo(() => {
        if (!platformConfig) return [];
        try {
            const parsed = JSON.parse(platformConfig.currencies || '[]');
            return parsed.filter(c => c.enabled);
        } catch { return []; }
    }, [platformConfig]);

    // Filter states (inputs)
    const [filterSearch, setFilterSearch] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('ALL');

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
        PublicService.getPlatformConfig().then(res => setPlatformConfig(res.data));
    }, [loadPurchases]);

    const openDetail = (purchase) => {
        setSelectedPurchase(purchase);
        setShowDetail(true);
    };

    const applyFilters = () => {
        setPage(0);
        setActiveFilters({
            supplier: filterSearch || undefined,
            dateFrom: filterDateFrom || undefined,
            dateTo: filterDateTo || undefined,
            paymentMethod: filterPaymentMethod !== 'ALL' ? filterPaymentMethod : undefined
        });
    };

    const clearFilters = () => {
        setFilterSearch('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterPaymentMethod('ALL');
        setActiveFilters({});
        setPage(0);
    };

    const renderPaymentMethod = (method) => {
        switch (method) {
            case 'CASH': return <Badge bg="success" className="rounded-pill px-2"><span className="me-1">💵</span> Efectivo</Badge>;
            case 'TRANSFER': return <Badge bg="primary" className="rounded-pill px-2"><span className="me-1">🏦</span> Transf / Zelle</Badge>;
            case 'MOBILE_PAYMENT': return <Badge bg="info" className="rounded-pill px-2"><span className="me-1">📱</span> P. Móvil</Badge>;
            case 'CARD': return <Badge bg="warning" text="dark" className="rounded-pill px-2"><span className="me-1">💳</span> Tarjeta</Badge>;
            default: return <Badge bg="light" text="dark" className="rounded-pill px-2 border">{method || 'N/A'}</Badge>;
        }
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

                    {/* Filter Bar */}
                    <Card className="border-0 shadow-sm rounded-4 mb-4">
                        <Card.Body className="p-4">
                            <Row className="g-3">
                                <Col md={3}>
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Proveedor / Factura</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Nombre o Nro..."
                                        className="rounded-3 border-light bg-light"
                                        value={filterSearch}
                                        onChange={(e) => setFilterSearch(e.target.value)}
                                    />
                                </Col>
                                <Col md={2}>
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Desde</Form.Label>
                                    <Form.Control
                                        type="date"
                                        className="rounded-3 border-light bg-light"
                                        value={filterDateFrom}
                                        onChange={(e) => setFilterDateFrom(e.target.value)}
                                    />
                                </Col>
                                <Col md={2}>
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Hasta</Form.Label>
                                    <Form.Control
                                        type="date"
                                        className="rounded-3 border-light bg-light"
                                        value={filterDateTo}
                                        onChange={(e) => setFilterDateTo(e.target.value)}
                                    />
                                </Col>
                                <Col md={2}>
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Medio de Pago</Form.Label>
                                    <Form.Select
                                        className="rounded-3 border-light bg-light"
                                        value={filterPaymentMethod}
                                        onChange={(e) => setFilterPaymentMethod(e.target.value)}
                                    >
                                        <option value="ALL">Todos</option>
                                        <option value="CASH">Efectivo</option>
                                        <option value="TRANSFER">Transferencia</option>
                                        <option value="MOBILE_PAYMENT">Pago Móvil</option>
                                        <option value="CARD">Tarjeta</option>
                                    </Form.Select>
                                </Col>
                                <Col md={3} className="d-flex align-items-end gap-2">
                                    <Button variant="primary" className="w-100 rounded-3 shadow-sm fw-bold" onClick={applyFilters}>
                                        <FaSearch className="me-2" /> Filtrar
                                    </Button>
                                    <Button variant="light" className="w-100 rounded-3 border shadow-sm" onClick={clearFilters}>
                                        Limpiar
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    <Row>
                        {/* Transactions List */}
                        <Col lg={12}>
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
                                                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold text-center">Pago</th>
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
                                                            {renderPaymentMethod(purchase.paymentMethod)}
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
                                                                        {Number(purchase.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                    </>
                                                                ) : (
                                                                    `$${Number(purchase.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                                                )}
                                                            </div>
                                                            {purchase.currencyCode && purchase.currencyCode !== 'USD' && (
                                                                <div className="text-success small">
                                                                    =${Number(purchase.total / (purchase.exchangeRate || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
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
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <h6 className="text-uppercase small fw-bold opacity-75 mb-0">Resumen Financiero</h6>
                                                <div className="text-end">
                                                    <Badge bg="primary" className="mb-1 d-block">
                                                        Factura: {selectedPurchase.invoiceNumber || 'S/N'}
                                                    </Badge>
                                                    <div className="small opacity-75" style={{ fontSize: '0.7rem' }}>
                                                        {new Date(selectedPurchase.date).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="d-flex align-items-center gap-3 mb-2">
                                                <h3 className="fw-bold mb-0">
                                                    {selectedPurchase.currencyCode} {Number(selectedPurchase.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </h3>
                                                {renderPaymentMethod(selectedPurchase.paymentMethod)}
                                            </div>

                                            <div className="small opacity-75 mb-3">
                                                Monto total de la transacción original
                                            </div>
                                            
                                            <div className="border-top pt-2 border-primary border-opacity-10">
                                                {selectedPurchase.currencyCode !== 'USD' && (
                                                    <div className="fw-bold small mb-1">
                                                        Equivalente Base: ${Number(selectedPurchase.total / (selectedPurchase.exchangeRate || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                                                        <span className="ms-2 opacity-75 fw-normal">(Tasa: {Number(selectedPurchase.exchangeRate || 1).toLocaleString()})</span>
                                                    </div>
                                                )}
                                            </div>
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
                                                                Costo: <span className="fw-bold text-dark">{Number(item.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedPurchase.currencyCode}</span>
                                                                {' '}| Cantidad: {item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="fw-bold text-dark">
                                                            {selectedPurchase.currencyCode} {Number(item.quantity * (item.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </div>
                                                        <div className="text-success small fw-bold">
                                                            {selectedPurchase.currencyCode === 'USD' ? (
                                                                `= $${Number(item.quantity * item.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD`
                                                            ) : (
                                                                `= $${Number((item.unitCost / (selectedPurchase.exchangeRate || 1)) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD`
                                                            )}
                                                        </div>
                                                        <div className="text-muted small">Subtotal Artículos</div>
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
