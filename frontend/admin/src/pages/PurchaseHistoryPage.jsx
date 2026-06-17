import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Table, Card, Badge, Button, Row, Col, Form, Modal, ListGroup, Spinner, Alert, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { FaHistory, FaCalendarAlt, FaTruck, FaEye, FaSearch, FaTimes, FaInbox, FaPlus, FaMinus, FaBan, FaPen, FaUndo } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import PurchaseService from '../services/purchase.service';
import PublicService from '../services/public.service';
import DebitNoteService from '../services/debit-note.service';

const PurchaseHistoryPage = () => {
    const navigate = useNavigate();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    
    // Adjustments
    const [adjustments, setAdjustments] = useState([]);
    const [loadingAdjustments, setLoadingAdjustments] = useState(false);
    const [showAdjModal, setShowAdjModal] = useState(false);
    const [adjType, setAdjType] = useState('DEBIT_NOTE');
    const [adjForm, setAdjForm] = useState({ amount: '', documentNumber: '', reason: '' });
    const [submittingAdj, setSubmittingAdj] = useState(false);
    const [platformConfig, setPlatformConfig] = useState(null);

    // Edit Costs
    const [showEditCostsModal, setShowEditCostsModal] = useState(false);
    const [editCostsItems, setEditCostsItems] = useState([]);
    const [editCostsLoading, setEditCostsLoading] = useState(false);
    const [editCostsError, setEditCostsError] = useState('');
    const [purchaseToEdit, setPurchaseToEdit] = useState(null);

    // Void Purchase
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [voidConfirmCheck, setVoidConfirmCheck] = useState(false);
    const [voidLoading, setVoidLoading] = useState(false);
    const [voidError, setVoidError] = useState('');
    const [purchaseToVoid, setPurchaseToVoid] = useState(null);

    // Refund Modal State (Debit Note)
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundForm, setRefundForm] = useState({ reason: '', items: [] });
    const [refundLoading, setRefundLoading] = useState(false);
    const [refundError, setRefundError] = useState('');
    const [priorRefunds, setPriorRefunds] = useState([]);

    const openRefundModal = (purchase) => {
        setRefundLoading(true);
        setRefundError('');
        DebitNoteService.getDebitNotesByPurchase(purchase.id).then(res => {
            const previousNotes = res.data || [];
            setPriorRefunds(previousNotes);
            
            const returnedCounts = {};
            previousNotes.forEach(note => {
                note.items?.forEach(i => {
                    if (i.product?.id) {
                        returnedCounts[i.product.id] = (returnedCounts[i.product.id] || 0) + i.quantityReturned;
                    }
                });
            });

            const availableItems = purchase.items.map(pi => {
                const alreadyReturned = returnedCounts[pi.product?.id] || 0;
                return {
                    productId: pi.product?.id,
                    productName: pi.product?.name,
                    maxQuantity: pi.quantity - alreadyReturned,
                    quantityToReturn: 0,
                    unitCost: pi.unitCostInBaseCurrency || pi.unitCost
                };
            }).filter(item => item.maxQuantity > 0 && item.productId);

            setRefundForm({
                reason: '',
                items: availableItems
            });
            setSelectedPurchase(purchase);
            setShowRefundModal(true);
            setRefundLoading(false);
        }).catch(err => {
            console.error(err);
            setRefundError('Error cargando devoluciones previas.');
            setRefundLoading(false);
        });
    };

    const handleRefundSubmit = () => {
        const itemsToReturn = refundForm.items
            .filter(i => i.quantityToReturn > 0)
            .map(i => ({ productId: i.productId, quantity: i.quantityToReturn }));

        if (itemsToReturn.length === 0) {
            setRefundError('Debes seleccionar al menos 1 producto para devolver');
            return;
        }

        if (!refundForm.reason.trim()) {
            setRefundError('Por favor ingresa un motivo');
            return;
        }

        setRefundLoading(true);
        setRefundError('');
        const payload = {
            purchaseId: selectedPurchase.id,
            reason: refundForm.reason,
            items: itemsToReturn
        };

        DebitNoteService.createDebitNote(payload).then(() => {
            setShowRefundModal(false);
            setRefundLoading(false);
            if (showDetail) setShowDetail(false);
            loadPurchases();
        }).catch(err => {
            console.error(err);
            setRefundError(err.response?.data?.message || 'Error al procesar la devolución');
            setRefundLoading(false);
        });
    };
 
    const availableCurrencies = useMemo(() => {
        if (!platformConfig) return [];
        try {
            const parsed = JSON.parse(platformConfig.currencies || '[]');
            return parsed.filter(c => c.enabled);
        } catch { return []; }
    }, [platformConfig]);

    const baseCurrencyCode = platformConfig?.baseCurrencyCode || 'USD';
    const baseCurrencySymbol = platformConfig?.baseCurrencySymbol || '$';

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
        setLoadingAdjustments(true);
        PurchaseService.getAdjustments(purchase.id).then(res => {
            setAdjustments(res.data);
            setLoadingAdjustments(false);
        }).catch(() => setLoadingAdjustments(false));
    };

    const handleAddAdjustment = (e) => {
        e.preventDefault();
        setSubmittingAdj(true);
        PurchaseService.createAdjustment(selectedPurchase.id, {
            type: adjType,
            ...adjForm
        }).then(() => {
            PurchaseService.getAdjustments(selectedPurchase.id).then(res => setAdjustments(res.data));
            setShowAdjModal(false);
            setAdjForm({ amount: '', documentNumber: '', reason: '' });
        }).finally(() => setSubmittingAdj(false));
    };

    const openVoidModal = (purchase) => {
        setPurchaseToVoid(purchase);
        setVoidReason('');
        setVoidConfirmCheck(false);
        setVoidError('');
        setShowVoidModal(true);
    };

    const handleVoidPurchase = () => {
        if (voidReason.trim().length < 10) { setVoidError('El motivo debe tener al menos 10 caracteres.'); return; }
        if (!voidConfirmCheck) { setVoidError('Debes confirmar que entiendes el impacto de esta acción.'); return; }
        setVoidLoading(true);
        setVoidError('');
        PurchaseService.voidPurchase(purchaseToVoid.id, voidReason).then(
            () => {
                setVoidLoading(false);
                setShowVoidModal(false);
                loadPurchases(); // Recargar historial
            },
            err => {
                setVoidLoading(false);
                setVoidError(err.response?.data?.message || 'Error al anular compra.');
            }
        );
    };

    const openEditCostsModal = (purchase) => {
        setPurchaseToEdit(purchase);
        setEditCostsItems(purchase.items.map(item => ({
            purchaseItemId: item.id,
            productName: item.product?.name || 'Producto',
            currentCost: item.unitCost || 0,
            newUnitCost: item.unitCost || 0
        })));
        setEditCostsError('');
        setShowEditCostsModal(true);
    };

    const handleEditCostItemChange = (index, value) => {
        const newItems = [...editCostsItems];
        newItems[index].newUnitCost = value;
        setEditCostsItems(newItems);
    };

    const handleEditCostsSubmit = () => {
        setEditCostsLoading(true);
        setEditCostsError('');
        
        const payloadItems = editCostsItems.map(item => ({
            purchaseItemId: item.purchaseItemId,
            newUnitCost: parseFloat(item.newUnitCost) || 0
        }));

        PurchaseService.updateCosts(purchaseToEdit.id, payloadItems).then(
            () => {
                setEditCostsLoading(false);
                setShowEditCostsModal(false);
                // Also update selectedPurchase if it's the one we are viewing
                if (selectedPurchase && selectedPurchase.id === purchaseToEdit.id) {
                    setShowDetail(false);
                }
                loadPurchases(); // Reload history
            },
            err => {
                setEditCostsLoading(false);
                setEditCostsError(err.response?.data?.message || 'Error al corregir costos.');
            }
        );
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
                                                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold text-center">Estado</th>
                                                    <th className="px-4 py-3 border-0 small text-muted text-uppercase fw-bold text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {purchases.map((purchase) => (
                                                    <tr key={purchase.id} onClick={() => openDetail(purchase)} style={{ cursor: 'pointer' }} className="table-row-hover">
                                                        <td className="px-4 py-3">
                                                            <div className="fw-bold text-dark">
                                                                #{purchase.id}
                                                                {purchase.invoiceNumber && <span className="ms-2 badge bg-secondary" style={{fontSize: '0.7rem'}}>Fact: {purchase.invoiceNumber}</span>}
                                                            </div>
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
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={<Tooltip>Monto total en la moneda original de la compra ({purchase.currencyCode || baseCurrencyCode})</Tooltip>}
                                                            >
                                                                <div className="fw-bold text-dark" style={{ cursor: 'help' }}>
                                                                    {Number(purchase.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {purchase.currencyCode || baseCurrencyCode}
                                                                </div>
                                                            </OverlayTrigger>
                                                            {purchase.currencyCode && purchase.currencyCode !== baseCurrencyCode && (
                                                                <OverlayTrigger
                                                                    placement="bottom"
                                                                    overlay={<Tooltip>Equivalente calculado con la tasa de cambio del momento: {purchase.exchangeRate}</Tooltip>}
                                                                >
                                                                    <div className="text-success small" style={{ cursor: 'help' }}>
                                                                        {Number(purchase.total / (purchase.exchangeRate || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}
                                                                    </div>
                                                                </OverlayTrigger>
                                                            )}
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <Badge bg={purchase.status === 'CANCELLED' ? 'danger' : 'success'} className="rounded-pill px-2">
                                                                {purchase.status === 'CANCELLED' ? 'ANULADA' : 'COMPLETADA'}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <div className="d-flex justify-content-center gap-1">
                                                                <Button
                                                                    variant="outline-primary"
                                                                    size="sm"
                                                                    className="rounded-pill px-3"
                                                                    onClick={() => openDetail(purchase)}
                                                                >
                                                                    <FaEye className="me-1" /> Ver
                                                                </Button>
                                                                {purchase.status !== 'CANCELLED' && (
                                                                    <>
                                                                    <Button
                                                                        variant="outline-warning"
                                                                        size="sm"
                                                                        className="rounded-pill px-2 me-1"
                                                                        title="Corregir Costos"
                                                                        onClick={() => openEditCostsModal(purchase)}
                                                                    >
                                                                        <FaPen />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline-danger"
                                                                        size="sm"
                                                                        className="rounded-pill px-2"
                                                                        title="Anular Compra"
                                                                        onClick={() => openVoidModal(purchase)}
                                                                    >
                                                                        <FaBan />
                                                                    </Button>
                                                                    </>
                                                                )}
                                                            </div>
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
                <Modal scrollable show={showDetail} 
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
                                                    {Number(
                                                        Number(selectedPurchase.total || 0) + 
                                                        adjustments.reduce((acc, adj) => acc + (adj.type === 'DEBIT_NOTE' ? adj.amount : -adj.amount), 0)
                                                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedPurchase.currencyCode}
                                                </h3>
                                                {renderPaymentMethod(selectedPurchase.paymentMethod)}
                                            </div>

                                            <div className="small opacity-75 mb-3">
                                                Total Ajustado (Original: {Number(selectedPurchase.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                                {selectedPurchase.globalDiscountAmount > 0 && (
                                                    <span className="text-warning fw-bold ms-2">
                                                        • Descuento Global: -{selectedPurchase.globalDiscountType === 'PERCENTAGE' ? `${selectedPurchase.globalDiscountAmount}%` : `${selectedPurchase.globalDiscountAmount} ${selectedPurchase.currencyCode}`}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="border-top pt-2 border-primary border-opacity-10">
                                                {selectedPurchase.currencyCode !== baseCurrencyCode && (
                                                    <div className="fw-bold small mb-1">
                                                        Equivalente Base: {baseCurrencySymbol}{Number(selectedPurchase.total / (selectedPurchase.exchangeRate || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}
                                                        <span className="ms-2 opacity-75 fw-normal">(Tasa: {Number(selectedPurchase.exchangeRate || 1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                </Col>
                                <Col md={12} className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="text-uppercase small fw-bold text-muted mb-0">Ajustes Financieros</h6>
                                        <div className="d-flex gap-2">
                                            <Button size="sm" variant="outline-danger" className="rounded-pill px-3" onClick={() => { setAdjType('DEBIT_NOTE'); setShowAdjModal(true); }}><FaPlus className="me-1" /> Nota Débito (Sube)</Button>
                                            <Button size="sm" variant="outline-success" className="rounded-pill px-3" onClick={() => { setAdjType('CREDIT_NOTE'); setShowAdjModal(true); }}><FaMinus className="me-1" /> Nota Crédito (Baja)</Button>
                                        </div>
                                    </div>
                                    {loadingAdjustments ? <div className="text-center py-3"><Spinner size="sm"/></div> : (
                                        <ListGroup variant="flush" className="border rounded-4 overflow-hidden shadow-sm">
                                            {adjustments.length === 0 ? (
                                                <ListGroup.Item className="text-center text-muted py-3 small bg-light">Sin notas registradas</ListGroup.Item>
                                            ) : adjustments.map(adj => (
                                                <ListGroup.Item key={adj.id} className="p-3 border-light">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <Badge bg={adj.type === 'DEBIT_NOTE' ? 'danger' : 'success'} className="mb-1 rounded-pill px-2">
                                                                {adj.type === 'DEBIT_NOTE' ? 'NOTA DE DÉBITO' : 'NOTA DE CRÉDITO'}
                                                            </Badge>
                                                            <div className="fw-bold">{adj.reason}</div>
                                                            <div className="text-muted small">Doc: {adj.documentNumber || 'S/N'} • {new Date(adj.date).toLocaleDateString()}</div>
                                                        </div>
                                                        <div className={`fw-bold ${adj.type === 'DEBIT_NOTE' ? 'text-danger' : 'text-success'}`}>
                                                            {adj.type === 'DEBIT_NOTE' ? '+' : '-'}{selectedPurchase.currencyCode} {Number(adj.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    )}
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
                                                                Costo: <span className="fw-bold text-dark">{Number(item.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedPurchase.currencyCode}</span>
                                                                {' '}| Cantidad: {item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="fw-bold text-dark">
                                                            {selectedPurchase.currencyCode} {Number(item.quantity * (item.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                        <div className="text-success small fw-bold">
                                                            {selectedPurchase.currencyCode === baseCurrencyCode ? (
                                                                `= ${Number(item.quantity * item.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${baseCurrencyCode}`
                                                            ) : (
                                                                `= ${Number((item.unitCost / (selectedPurchase.exchangeRate || 1)) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${baseCurrencyCode}`
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
                    <Modal.Footer className="border-0 bg-light rounded-bottom-4">
                        {['COMPLETED', 'PARTIAL_REFUND'].includes(selectedPurchase?.status) && (
                            <Button variant="danger" className="rounded-pill px-4 fw-bold me-auto" onClick={() => openRefundModal(selectedPurchase)}>
                                <FaUndo className="me-2" /> Devolver Mercancía (Nota de Débito)
                            </Button>
                        )}
                        <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowDetail(false)}>Cerrar</Button>
                    </Modal.Footer>
                </Modal>

                {/* Adjustment Modal */}
                <Modal show={showAdjModal} onHide={() => setShowAdjModal(false)} centered>
                    <Form onSubmit={handleAddAdjustment}>
                        <Modal.Header closeButton className={`border-0 bg-${adjType === 'DEBIT_NOTE' ? 'danger' : 'success'} bg-opacity-10`}>
                            <Modal.Title className={`fw-bold fs-6 text-${adjType === 'DEBIT_NOTE' ? 'danger' : 'success'}`}>
                                {adjType === 'DEBIT_NOTE' ? 'Nueva Nota de Débito' : 'Nueva Nota de Crédito'}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <p className="small mb-3 text-muted">
                                {adjType === 'DEBIT_NOTE' 
                                    ? 'Registra un cargo extra que aumenta el costo total (Ej. fletes, ajustes de precio).' 
                                    : 'Registra un saldo a favor que reduce el costo total (Ej. descuentos, devoluciones sin afectar stock).'}
                            </p>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Monto ({selectedPurchase?.currencyCode}) <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="number" step="0.01" required value={adjForm.amount} onChange={e => setAdjForm({...adjForm, amount: e.target.value})} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Nro. Documento Proveedor</Form.Label>
                                <Form.Control type="text" placeholder="Ej: ND-10293" value={adjForm.documentNumber} onChange={e => setAdjForm({...adjForm, documentNumber: e.target.value})} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Motivo <span className="text-danger">*</span></Form.Label>
                                <Form.Control as="textarea" rows={2} required placeholder="Razón del ajuste..." value={adjForm.reason} onChange={e => setAdjForm({...adjForm, reason: e.target.value})} />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer className="border-0">
                            <Button variant="light" size="sm" className="rounded-pill" onClick={() => setShowAdjModal(false)}>Cancelar</Button>
                            <Button variant={adjType === 'DEBIT_NOTE' ? 'danger' : 'success'} size="sm" type="submit" className="rounded-pill" disabled={submittingAdj}>
                                {submittingAdj ? <Spinner size="sm"/> : 'Registrar Ajuste'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

                {/* Void Modal */}
                <Modal show={showVoidModal} onHide={() => setShowVoidModal(false)} centered>
                    <Modal.Header closeButton className="border-0 bg-danger bg-opacity-10">
                        <Modal.Title className="fw-bold fs-6 text-danger"><FaBan className="me-2" />Anular Compra #{purchaseToVoid?.id}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {voidError && <Alert variant="danger" className="small py-2 rounded-3">{voidError}</Alert>}
                        <Alert variant="warning" className="small py-2 rounded-3 mb-3">
                            ⚠️ <strong>Esta acción modifica el inventario.</strong> El stock sumado por esta compra se descontará automáticamente. Esta operación no se puede deshacer.
                        </Alert>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Motivo de la anulación <span className="text-danger">*</span></Form.Label>
                            <Form.Control as="textarea" rows={3} placeholder="Describe el motivo (mínimo 10 caracteres)..." value={voidReason} onChange={e => setVoidReason(e.target.value)} className={`rounded-3 ${voidReason.length > 0 && voidReason.length < 10 ? 'is-invalid' : ''}`} />
                            <small className="text-muted">{voidReason.length}/10 caracteres mínimo</small>
                        </Form.Group>
                        <Form.Check type="checkbox" id="void-confirm-check" checked={voidConfirmCheck} onChange={e => setVoidConfirmCheck(e.target.checked)}
                            label={<span className="small fw-bold">Entiendo que esta acción modifica el inventario y no se puede deshacer</span>}
                        />
                    </Modal.Body>
                    <Modal.Footer className="border-0">
                        <Button variant="light" size="sm" className="rounded-pill" onClick={() => setShowVoidModal(false)}>Cancelar</Button>
                        <Button variant="danger" size="sm" className="rounded-pill" onClick={handleVoidPurchase} disabled={voidLoading || voidReason.length < 10 || !voidConfirmCheck}>
                            {voidLoading ? <Spinner size="sm" /> : <><FaBan className="me-1" />Confirmar Anulación</>}
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Edit Costs Modal */}
                <Modal show={showEditCostsModal} onHide={() => setShowEditCostsModal(false)} centered size="lg">
                    <Modal.Header closeButton className="border-0 bg-warning bg-opacity-10">
                        <Modal.Title className="fw-bold fs-6 text-warning-emphasis"><FaPen className="me-2" />Corregir Costos - Compra #{purchaseToEdit?.id}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {editCostsError && <Alert variant="danger" className="small py-2 rounded-3">{editCostsError}</Alert>}
                        <Alert variant="info" className="small py-2 rounded-3 mb-3">
                            💡 Utiliza esta opción únicamente para corregir errores tipográficos en el costo de los productos. Esto actualizará el valor en el inventario sin afectar las cantidades ni anular la compra.
                        </Alert>
                        <Table hover size="sm" className="align-middle">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Costo Actual ({purchaseToEdit?.currencyCode})</th>
                                    <th>Nuevo Costo ({purchaseToEdit?.currencyCode})</th>
                                </tr>
                            </thead>
                            <tbody>
                                {editCostsItems.map((item, idx) => (
                                    <tr key={item.purchaseItemId}>
                                        <td className="fw-bold">{item.productName}</td>
                                        <td className="text-muted">{Number(item.currentCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                step="0.01"
                                                size="sm"
                                                value={item.newUnitCost}
                                                onChange={e => handleEditCostItemChange(idx, e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Modal.Body>
                    <Modal.Footer className="border-0">
                        <Button variant="light" size="sm" className="rounded-pill" onClick={() => setShowEditCostsModal(false)}>Cancelar</Button>
                        <Button variant="warning" size="sm" className="rounded-pill fw-bold" onClick={handleEditCostsSubmit} disabled={editCostsLoading}>
                            {editCostsLoading ? <Spinner size="sm" /> : <><FaPen className="me-1" />Guardar Corrección</>}
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Refund / Debit Note Modal */}
                <Modal scrollable show={showRefundModal} onHide={() => setShowRefundModal(false)} size="lg" centered>
                    <Modal.Header closeButton>
                        <Modal.Title className="fw-bold text-danger">
                            <FaUndo className="me-2" />
                            Devolver Mercancía a Proveedor - Compra #{selectedPurchase?.id}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        {refundError && <Alert variant="danger" className="small py-2 rounded-3">{refundError}</Alert>}
                        
                        {priorRefunds.length > 0 && (
                            <Alert variant="warning" className="small py-2 rounded-3 mb-4">
                                <strong>Atención:</strong> Esta compra ya tiene {priorRefunds.length} devolución(es) previa(s). Las cantidades mostradas ya excluyen los productos devueltos anteriormente.
                            </Alert>
                        )}
                        
                        <p className="text-muted small mb-3">
                            Selecciona la cantidad de cada producto que devolverás al proveedor.
                            <strong> El inventario se descontará automáticamente.</strong>
                        </p>
                        
                        <div className="table-responsive mb-4 border rounded-3">
                            <Table hover className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="small text-muted">Producto</th>
                                        <th className="small text-muted text-center">Costo Unit.</th>
                                        <th className="small text-muted text-center" style={{ width: '150px' }}>Devolver (Cant)</th>
                                        <th className="small text-muted text-end">Subtotal a Recuperar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {refundForm.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="fw-bold">{item.productName} <br/><small className="text-muted fw-normal">Máx devolvible: {item.maxQuantity}</small></td>
                                            <td className="text-center">{item.unitCost} {baseCurrencyCode}</td>
                                            <td className="text-center">
                                                <Form.Control 
                                                    type="number" 
                                                    min="0" 
                                                    max={item.maxQuantity}
                                                    size="sm"
                                                    value={item.quantityToReturn}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (val !== '') {
                                                            val = Math.min(Math.max(parseInt(val) || 0, 0), item.maxQuantity);
                                                        }
                                                        const newItems = [...refundForm.items];
                                                        newItems[index].quantityToReturn = val;
                                                        setRefundForm({...refundForm, items: newItems});
                                                    }}
                                                />
                                            </td>
                                            <td className="text-end fw-bold text-danger">
                                                {((Number(item.quantityToReturn) || 0) * item.unitCost).toFixed(2)} {baseCurrencyCode}
                                            </td>
                                        </tr>
                                    ))}
                                    {refundForm.items.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center py-4 text-muted">No hay más productos elegibles para devolución en esta compra.</td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-light">
                                    <tr>
                                        <td colSpan="3" className="text-end fw-bold">Total a Recuperar:</td>
                                        <td className="text-end fw-bold text-danger fs-5">
                                            {refundForm.items.reduce((acc, curr) => acc + ((Number(curr.quantityToReturn) || 0) * curr.unitCost), 0).toFixed(2)} {baseCurrencyCode}
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>

                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Motivo de la Devolución <span className="text-danger">*</span></Form.Label>
                                    <Form.Control 
                                        as="textarea" 
                                        rows={2} 
                                        placeholder="Ej: Mercancía en mal estado, error en pedido..."
                                        value={refundForm.reason}
                                        onChange={e => setRefundForm({...refundForm, reason: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="border-0">
                        <Button variant="light" className="rounded-pill" onClick={() => setShowRefundModal(false)}>Cancelar</Button>
                        <Button variant="danger" className="rounded-pill px-4 fw-bold" onClick={handleRefundSubmit} disabled={refundLoading || refundForm.items.length === 0}>
                            {refundLoading ? 'Procesando...' : 'Confirmar Devolución (Generar Ingreso)'}
                        </Button>
                    </Modal.Footer>
                </Modal>

            </div>
        </div>
    );
};

export default PurchaseHistoryPage;
