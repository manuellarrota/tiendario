import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, ListGroup, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaHistory, FaEye, FaCheckCircle, FaClock, FaUser, FaPhoneAlt, FaMapMarkerAlt, FaSearch, FaUndo, FaCashRegister } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import SaleService from '../services/sale.service';
import PublicService from '../services/public.service';
import CashRegisterService from '../services/cash-register.service';
import CreditNoteService from '../services/credit-note.service';
import { useToast } from '../components/ToastContext';

const SalesHistoryPage = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [platformConfig, setPlatformConfig] = useState(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [pageSize] = useState(10);
    const toast = useToast();

    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('ALL');
    const [filterCashRegister, setFilterCashRegister] = useState('ALL');
    const [cashRegisters, setCashRegisters] = useState([]);
    const [activeFilters, setActiveFilters] = useState({});

    const formatSecondary = (amount) => {
        if (!platformConfig || !platformConfig.enableSecondaryCurrency) return null;
        const converted = amount * platformConfig.exchangeRate;
        return `${platformConfig.secondaryCurrencySymbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const loadSales = React.useCallback((silent = false) => {
        if (!silent) setLoading(true);
        
        // Convert local dates to ISO if present
        const dFrom = activeFilters.dateFrom ? `${activeFilters.dateFrom}T00:00:00` : null;
        const dTo = activeFilters.dateTo ? `${activeFilters.dateTo}T23:59:59` : null;

        SaleService.getSales(
            page, 
            pageSize, 
            activeFilters.status || 'ALL', 
            activeFilters.customer || '', 
            dFrom, 
            dTo,
            activeFilters.paymentMethod || 'ALL',
            activeFilters.cashRegisterId || 'ALL'
        ).then(
            (response) => {
                setSales(response.data.content);
                setTotalPages(response.data.totalPages);
                setTotalElements(response.data.totalElements);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading sales", error);
                setLoading(false);
            }
        );
    }, [page, pageSize, activeFilters]);

    useEffect(() => {
        loadSales();
        PublicService.getPlatformConfig().then(
            (res) => setPlatformConfig(res.data),
            (err) => console.error('Error loading config', err)
        );
        CashRegisterService.getAllRegisters().then(
            (res) => setCashRegisters(res.data),
            (err) => console.error('Error loading registers', err)
        );
    }, [loadSales]);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [saleToPay, setSaleToPay] = useState(null);

    // Refund Modal State
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundForm, setRefundForm] = useState({ reason: '', type: 'REFUND_TO_CASH', items: [] });
    const [refundLoading, setRefundLoading] = useState(false);
    const [priorRefunds, setPriorRefunds] = useState([]);

    const openRefundModal = (sale) => {
        setRefundLoading(true);
        CreditNoteService.getCreditNotesBySale(sale.id).then(res => {
            const previousNotes = res.data || [];
            setPriorRefunds(previousNotes);
            
            // Calculate how many of each item have already been returned
            const returnedCounts = {};
            previousNotes.forEach(note => {
                note.items?.forEach(i => {
                    if (i.product?.id) {
                        returnedCounts[i.product.id] = (returnedCounts[i.product.id] || 0) + i.quantityReturned;
                    }
                });
            });

            // Pre-fill form items with available quantities
            const availableItems = sale.items.map(si => {
                const alreadyReturned = returnedCounts[si.product?.id] || 0;
                return {
                    productId: si.product?.id,
                    productName: si.product?.name,
                    maxQuantity: si.quantity - alreadyReturned,
                    quantityToReturn: 0,
                    unitPrice: si.unitPrice
                };
            }).filter(item => item.maxQuantity > 0 && item.productId);

            setRefundForm({
                reason: '',
                type: 'REFUND_TO_CASH',
                items: availableItems
            });
            setSelectedSale(sale);
            setShowRefundModal(true);
            setRefundLoading(false);
        }).catch(err => {
            console.error(err);
            toast.showError('Error cargando notas de crédito previas');
            setRefundLoading(false);
        });
    };

    const handleRefundSubmit = () => {
        const itemsToReturn = refundForm.items
            .filter(i => i.quantityToReturn > 0)
            .map(i => ({ productId: i.productId, quantity: i.quantityToReturn }));

        if (itemsToReturn.length === 0) {
            toast.showError('Debes seleccionar al menos 1 producto para devolver');
            return;
        }

        if (!refundForm.reason.trim()) {
            toast.showError('Por favor ingresa un motivo');
            return;
        }

        setRefundLoading(true);
        const payload = {
            saleId: selectedSale.id,
            reason: refundForm.reason,
            type: refundForm.type,
            items: itemsToReturn
        };

        CreditNoteService.createCreditNote(payload).then(() => {
            toast.showSuccess('Devolución procesada correctamente');
            setShowRefundModal(false);
            setRefundLoading(false);
            if (showDetail) setShowDetail(false);
            loadSales(true);
        }).catch(err => {
            console.error(err);
            toast.showError(err.response?.data?.message || 'Error al procesar la devolución');
            setRefundLoading(false);
        });
    };

    const handleStatusUpdate = (id, status) => {
        if (status === 'PAID') {
            setSaleToPay(id);
            setPaymentMethod('CASH'); // Default
            setShowPaymentModal(true);
            return;
        }

        performStatusUpdate(id, status);
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
            () => toast.showError("Hubo un error al intentar actualizar el estado de la venta.")
        );
    };

    const openDetail = (sale) => {
        setSelectedSale(sale);
        setShowDetail(true);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAID': return <Badge bg="success" className="rounded-pill px-3">COMPRA FINALIZADA</Badge>;
            case 'PREPARING': return <Badge bg="primary" className="rounded-pill px-3">EN PREPARACIÓN</Badge>;
            case 'READY_FOR_PICKUP': return <Badge bg="info" text="white" className="rounded-pill px-3">LISTO PARA RECOGER</Badge>;
            case 'PENDING': return <Badge bg="warning" text="dark" className="rounded-pill px-3">PENDIENTE</Badge>;
            case 'CANCELLED': return <Badge bg="danger" className="rounded-pill px-3">CANCELADO</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const formatPaymentMethod = (method) => {
        switch (method) {
            case 'CASH': return 'Efectivo 💵';
            case 'CARD': return 'Tarjeta 💳';
            case 'TRANSFER': return 'Transferencia 🏦';
            case 'MOBILE_PAYMENT': return 'Pago Móvil 📱';
            case 'MIXED': return 'Mixto 🔀';
            default: return method || 'Pendiente';
        }
    };

    const renderPaymentMethods = (sale) => {
        if (sale.payments && sale.payments.length > 0) {
            if (sale.payments.length === 1) {
                return formatPaymentMethod(sale.payments[0].method);
            }
            return 'Pago Mixto';
        }
        return formatPaymentMethod(sale.paymentMethod);
    };

    const applyFilters = () => {
        setPage(0);
        setActiveFilters({
            customer: filterCustomer || undefined,
            dateFrom: filterDateFrom || undefined,
            dateTo: filterDateTo || undefined,
            status: filterStatus !== 'ALL' ? filterStatus : undefined,
            paymentMethod: filterPaymentMethod !== 'ALL' ? filterPaymentMethod : undefined,
            cashRegisterId: filterCashRegister !== 'ALL' ? filterCashRegister : undefined
        });
    };

    const clearFilters = () => {
        setFilterCustomer('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterStatus('ALL');
        setFilterPaymentMethod('ALL');
        setFilterCashRegister('ALL');
        setActiveFilters({});
        setPage(0);
    };

    const filteredSales = sales;

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="fw-bold mb-0">Historial de Ventas</h2>
                        <p className="text-muted">Administra tus ventas del local y pedidos del Marketplace</p>
                    </div>
                </div>

                {/* Filter Bar */}
                <Card className="border-0 shadow-sm rounded-4 mb-4">
                    <Card.Body className="p-4">
                        <Row className="g-3">
                            <Col md={3}>
                                <Form.Label className="small fw-bold text-muted text-uppercase">Cliente</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Nombre o Cédula..."
                                    className="rounded-3 border-light bg-light"
                                    value={filterCustomer}
                                    onChange={(e) => setFilterCustomer(e.target.value)}
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
                                <Form.Label className="small fw-bold text-muted text-uppercase">Estado</Form.Label>
                                <Form.Select
                                    className="rounded-3 border-light bg-light"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="ALL">Todos</option>
                                    <option value="PENDING">Pendientes</option>
                                    <option value="PAID">Pagados</option>
                                    <option value="CANCELLED">Cancelados</option>
                                </Form.Select>
                            </Col>
                            <Col md={3} className="d-flex align-items-end gap-2">
                                <Button variant="primary" className="w-100 rounded-3 shadow-sm fw-bold" onClick={applyFilters}>
                                    <FaSearch className="me-2" /> Filtrar
                                </Button>
                                <Button variant="light" className="w-100 rounded-3 border shadow-sm fw-bold text-muted" onClick={clearFilters}>
                                    <FaUndo className="me-2" /> Limpiar
                                </Button>
                            </Col>
                            <Col md={3} className="mt-2">
                                <Form.Label className="small fw-bold text-muted text-uppercase">Medio de Pago</Form.Label>
                                <Form.Select
                                    className="rounded-3 border-light bg-light"
                                    value={filterPaymentMethod}
                                    onChange={(e) => setFilterPaymentMethod(e.target.value)}
                                >
                                    <option value="ALL">Cualquiera</option>
                                    <option value="CASH">Efectivo</option>
                                    <option value="TRANSFER">Transferencia</option>
                                    <option value="MOBILE_PAYMENT">Pago Móvil</option>
                                    <option value="CARD">Tarjeta</option>
                                    <option value="MIXED">Mixto</option>
                                </Form.Select>
                            </Col>
                            <Col md={3} className="mt-2">
                                <Form.Label className="small fw-bold text-muted text-uppercase">Caja Registradora</Form.Label>
                                <Form.Select
                                    className="rounded-3 border-light bg-light"
                                    value={filterCashRegister}
                                    onChange={(e) => setFilterCashRegister(e.target.value)}
                                >
                                    <option value="ALL">Todas las Cajas</option>
                                    {cashRegisters.map(cr => (
                                        <option key={cr.id} value={cr.id}>{cr.name}</option>
                                    ))}
                                </Form.Select>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th className="px-4 py-3">ID / Fecha</th>
                                    <th className="py-3">Cliente</th>
                                    <th className="py-3 text-center">Estado</th>
                                    <th className="py-3 text-center">Método</th>
                                    <th className="py-3 text-end">Total</th>
                                    <th className="py-3 text-center px-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td className="px-4">
                                            <div className="fw-bold text-primary">#{sale.id}</div>
                                            <small className="text-muted d-block">{sale.date ? new Date(sale.date).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</small>
                                            {sale.cashRegister && (
                                                <Badge bg="light" text="dark" className="border fw-normal mt-1" style={{ fontSize: '0.7rem' }}>
                                                    <FaCashRegister className="me-1 text-secondary" /> {sale.cashRegister.name}
                                                </Badge>
                                            )}
                                        </td>
                                        <td>
                                            <div className="fw-bold">{sale.customerName || sale.customer?.name || 'Venta Mostrador'}</div>
                                            <small className="text-muted">{sale.customer?.email || 'Presencial'}</small>
                                        </td>
                                        <td className="text-center">{getStatusBadge(sale.status)}</td>
                                        <td className="text-center small">
                                            {renderPaymentMethods(sale)}
                                        </td>
                                        <td className="text-end fw-bold text-success">
                                            ${sale.totalAmount ? sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
                                            {platformConfig?.enableSecondaryCurrency && sale.totalAmount > 0 && (
                                                <div className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>{formatSecondary(sale.totalAmount)}</div>
                                            )}
                                        </td>
                                        <td className="text-center px-4">
                                            <OverlayTrigger overlay={<Tooltip>Ver Detalle</Tooltip>}>
                                                <Button variant="light" size="sm" className="rounded-circle me-1" onClick={() => openDetail(sale)}>
                                                    <FaEye className="text-primary" />
                                                </Button>
                                            </OverlayTrigger>
                                            {sale.status === 'PENDING' && (
                                                <OverlayTrigger overlay={<Tooltip>Marcar Listo para Recoger</Tooltip>}>
                                                    <Button variant="light" size="sm" className="rounded-circle" onClick={() => handleStatusUpdate(sale.id, 'READY_FOR_PICKUP')}>
                                                        <FaClock className="text-info" />
                                                    </Button>
                                                </OverlayTrigger>
                                            )}
                                            {sale.status === 'READY_FOR_PICKUP' && (
                                                <OverlayTrigger overlay={<Tooltip>Registrar Pago</Tooltip>}>
                                                    <Button variant="light" size="sm" className="rounded-circle" onClick={() => handleStatusUpdate(sale.id, 'PAID')}>
                                                        <FaCheckCircle className="text-success" />
                                                    </Button>
                                                </OverlayTrigger>
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
                        {totalPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center p-4 border-top">
                                <small className="text-muted">Mostrando {sales.length} de {totalElements} ventas</small>
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        disabled={page === 0}
                                        onClick={() => setPage(prev => prev - 1)}
                                    >
                                        Anterior
                                    </Button>
                                    <div className="d-flex align-items-center px-3 fw-bold text-primary">
                                        Página {page + 1} de {totalPages}
                                    </div>
                                    <Button
                                        variant="outline-primary"
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

                {/* Modal de Detalle */}
                <Modal scrollable show={showDetail} onHide={() => setShowDetail(false)} size="lg" centered className="rounded-4 overflow-hidden">
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
                                        <p className="mb-2"><FaPhoneAlt className="me-2 text-primary" /> <strong>Teléfono:</strong> {selectedSale.customerPhone || selectedSale.customer?.phone || 'N/A'}</p>
                                        <p className="mb-0"><FaMapMarkerAlt className="me-2 text-primary" /> <strong>Dirección:</strong> {selectedSale.customer?.address || 'Retiro en Local'}</p>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <h6 className="text-uppercase fw-bold text-muted small mb-3">Resumen de Pago</h6>
                                    <div className="bg-light p-3 rounded-4 mb-4">
                                        <p className="mb-2"><strong>Estado:</strong> {getStatusBadge(selectedSale.status)}</p>
                                        <p className="mb-2"><strong>Fecha:</strong> {selectedSale.date ? new Date(selectedSale.date).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</p>
                                        <p className="mb-2"><strong>Caja:</strong> {selectedSale.cashRegister?.name || 'Venta Web / Sin Caja'}</p>
                                        {selectedSale.payments && selectedSale.payments.length > 0 ? (
                                            <>
                                                <p className="mb-1"><strong>Métodos de Pago:</strong></p>
                                                <ul className="mb-2 ps-3 small text-muted">
                                                    {selectedSale.payments.map((p, idx) => (
                                                        <li key={idx}>
                                                            {formatPaymentMethod(p.method)} {p.amount < 0 ? '(Vuelto)' : ''}: {p.currencyCode ? `${p.amount} ${p.currencyCode}` : `$${p.amount}`}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        ) : (
                                            <p className="mb-2"><strong>Método:</strong> {formatPaymentMethod(selectedSale.paymentMethod)}</p>
                                        )}
                                        <h4 className="fw-bold text-success mb-0 mt-3">Total: ${selectedSale.totalAmount ? selectedSale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}</h4>
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
                                <FaCheckCircle className="me-2" /> Marcar como Compra Finalizada
                            </Button>
                        )}
                        {['PAID', 'PARTIAL_REFUND'].includes(selectedSale?.status) && (
                            <Button variant="danger" className="rounded-pill px-4 fw-bold text-white me-auto" onClick={() => openRefundModal(selectedSale)}>
                                <FaUndo className="me-2" /> Devolución / Reembolso
                            </Button>
                        )}
                        <Button variant="light" className="rounded-pill px-4" onClick={() => setShowDetail(false)}>
                            Cerrar
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Confirm Payment Modal */}
                <Modal scrollable show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
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
                            <option value="TRANSFER">Transferencia Bancaria 🏦</option>
                            <option value="MOBILE_PAYMENT">Pago Móvil 📱</option>
                        </Form.Select>
                        <div className="d-grid gap-2">
                            <Button variant="primary" size="lg" className="rounded-pill fw-bold" onClick={confirmPayment}>
                                Confirmar Pago
                            </Button>
                        </div>
                    </Modal.Body>
                </Modal>

                {/* Refund / Credit Note Modal */}
                <Modal scrollable show={showRefundModal} onHide={() => setShowRefundModal(false)} size="lg" centered>
                    <Modal.Header closeButton>
                        <Modal.Title className="fw-bold text-danger">
                            <FaUndo className="me-2" />
                            Procesar Devolución - Venta #{selectedSale?.id}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        {priorRefunds.length > 0 && (
                            <div className="alert alert-warning small py-2 mb-4">
                                <strong>Atención:</strong> Esta venta ya tiene {priorRefunds.length} nota(s) de crédito previas. Las cantidades mostradas ya excluyen los productos devueltos anteriormente.
                            </div>
                        )}
                        
                        <p className="text-muted small mb-3">Selecciona la cantidad a devolver de cada producto. El inventario se restaurará automáticamente.</p>
                        
                        <div className="table-responsive mb-4 border rounded-3">
                            <Table hover className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="small text-muted">Producto</th>
                                        <th className="small text-muted text-center">Precio Unit.</th>
                                        <th className="small text-muted text-center" style={{ width: '150px' }}>Devolver (Cant)</th>
                                        <th className="small text-muted text-end">Subtotal a Reembolsar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {refundForm.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="fw-bold">{item.productName} <br/><small className="text-muted fw-normal">Máx: {item.maxQuantity}</small></td>
                                            <td className="text-center">${item.unitPrice}</td>
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
                                                ${((Number(item.quantityToReturn) || 0) * item.unitPrice).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {refundForm.items.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center py-4 text-muted">No hay más productos elegibles para devolución en esta venta.</td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-light">
                                    <tr>
                                        <td colSpan="3" className="text-end fw-bold">Total a Reembolsar:</td>
                                        <td className="text-end fw-bold text-danger fs-5">
                                            ${refundForm.items.reduce((acc, curr) => acc + ((Number(curr.quantityToReturn) || 0) * curr.unitPrice), 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Motivo de la Devolución</Form.Label>
                                    <Form.Control 
                                        as="textarea" 
                                        rows={2} 
                                        placeholder="Ej: Producto defectuoso, cambio de talla..."
                                        value={refundForm.reason}
                                        onChange={e => setRefundForm({...refundForm, reason: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Método de Reembolso</Form.Label>
                                    <Form.Select 
                                        value={refundForm.type}
                                        onChange={e => setRefundForm({...refundForm, type: e.target.value})}
                                    >
                                        <option value="REFUND_TO_CASH">Reembolso en Efectivo 💵</option>
                                        <option value="REFUND_TO_CARD">Reembolso a Tarjeta 💳</option>
                                        <option value="REFUND_TO_TRANSFER">Reembolso por Transferencia 🏦</option>
                                        <option value="REFUND_TO_MOBILE">Reembolso por Pago Móvil 📱</option>
                                        <option value="STORE_CREDIT">Saldo a Favor del Cliente 💰</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="border-0">
                        <Button variant="light" className="rounded-pill" onClick={() => setShowRefundModal(false)}>Cancelar</Button>
                        <Button variant="danger" className="rounded-pill px-4 fw-bold" onClick={handleRefundSubmit} disabled={refundLoading || refundForm.items.length === 0}>
                            {refundLoading ? 'Procesando...' : 'Confirmar Devolución'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </div>
    );
};

export default SalesHistoryPage;
