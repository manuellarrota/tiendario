import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, ListGroup, InputGroup, Table, Modal, Alert, OverlayTrigger, Tooltip, Spinner, Badge, Toast, ToastContainer } from 'react-bootstrap';
import { FaSearch, FaPlus, FaMinus, FaTrash, FaShoppingCart, FaEdit, FaLock, FaExclamationTriangle, FaExchangeAlt, FaUserPlus, FaUserAlt, FaUserCheck, FaBarcode, FaHome, FaSignOutAlt, FaBell, FaHistory, FaCashRegister, FaTruck, FaBox, FaTags } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import ProductService from '../services/product.service';
import SaleService from '../services/sale.service';
import AuthService from '../services/auth.service';
import PublicService from '../services/public.service';
import CustomerService from '../services/customer.service';

const POSPage = () => {
    // 1. STATE
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [message, setMessage] = useState("");
    
    // Payment State
    const [payments, setPayments] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentCurrency, setPaymentCurrency] = useState('USD');
    const [tempPayment, setTempPayment] = useState({ 
        amount: "", 
        currency: "USD", 
        method: "CASH",
        exchangeRate: 1 
    });

    const [platformConfig, setPlatformConfig] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: "", cedula: "", phone: "", email: "" });
    const [showQuantityModal, setShowQuantityModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [inputQuantity, setInputQuantity] = useState('1');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeStatus, setBarcodeStatus] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState("success");

    const barcodeInputRef = useRef(null);
    const barcodeTimerRef = useRef(null);

    // 2. AUTH & CONFIG
    const user = AuthService.getCurrentUser();
    const subscriptionStatus = user?.subscriptionStatus || 'TRIAL';
    const canOperate = subscriptionStatus === 'PAID' || subscriptionStatus === 'TRIAL';

    const availableCurrencies = useMemo(() => {
        if (!platformConfig) return [];
        try {
            const parsed = JSON.parse(platformConfig.currencies || '[]');
            return parsed.filter(c => c.enabled);
        } catch { return []; }
    }, [platformConfig]);

    const baseCurrencyCode = platformConfig?.baseCurrencyCode || 'USD';
    const baseCurrencySymbol = platformConfig?.baseCurrencySymbol || '$';

    // 3. HELPERS
    const triggerToast = useCallback((msg, type = "success") => {
        setToastMessage(msg);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    }, []);

    const formatSecondary = (amount) => {
        if (!platformConfig || !platformConfig.enableSecondaryCurrency) return null;
        const converted = amount * platformConfig.exchangeRate;
        return `${platformConfig.secondaryCurrencySymbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getSelectedCurrency = useCallback(() => availableCurrencies.find(c => c.code === paymentCurrency), [availableCurrencies, paymentCurrency]);

    const convertToPaymentCurrency = useCallback((amount) => {
        if (paymentCurrency === baseCurrencyCode) return amount;
        const curr = getSelectedCurrency();
        return curr ? amount * curr.rate : amount;
    }, [paymentCurrency, baseCurrencyCode, getSelectedCurrency]);

    const formatPaymentCurrency = (amount) => {
        const converted = convertToPaymentCurrency(amount);
        if (paymentCurrency === baseCurrencyCode) {
            return `${baseCurrencySymbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        const curr = getSelectedCurrency();
        return `${curr?.symbol || ''} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const total = useMemo(() => cart.reduce((acc, item) => acc + item.subtotal, 0), [cart]);

    // 4. BUSINESS LOGIC
    const addProductToCartById = useCallback((foundProduct, qty = 1) => {
        if (!foundProduct) return;
        if (foundProduct.stock < 1) {
            triggerToast(`❌ "${foundProduct.name}" no tiene stock.`, "error");
            return;
        }
        setCart(prev => {
            const existing = prev.find(item => item.product.id === foundProduct.id);
            if (existing) {
                if (existing.quantity + qty > foundProduct.stock) {
                    triggerToast(`❌ Stock insuficiente (${foundProduct.stock})`, "error");
                    return prev;
                }
                return prev.map(item =>
                    item.product.id === foundProduct.id
                        ? { ...item, quantity: item.quantity + qty, subtotal: (item.quantity + qty) * foundProduct.price }
                        : item
                );
            }
            return [...prev, { product: foundProduct, quantity: qty, unitPrice: foundProduct.price, subtotal: qty * foundProduct.price }];
        });
    }, [triggerToast]);

    const totalPaidInBase = useMemo(() => {
        return payments.reduce((acc, p) => acc + (p.amountInBaseCurrency || 0), 0);
    }, [payments]);

    const remainingToPay = useMemo(() => {
        return Math.max(0, total - totalPaidInBase);
    }, [total, totalPaidInBase]);

    const handleCheckout = useCallback(() => {
        if (cart.length === 0 || totalPaidInBase < total) return;
        
        const saleData = {
            totalAmount: total,
            items: cart.map(item => ({
                product: { id: item.product.id },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal
            })),
            payments: payments.map(p => ({
                amount: p.amount,
                currencyCode: p.currency,
                exchangeRate: p.exchangeRate,
                amountInBaseCurrency: p.amountInBaseCurrency,
                method: p.method
            })),
            customer: selectedCustomer ? { id: selectedCustomer.id } : null,
            customerName: selectedCustomer ? selectedCustomer.name : (customerSearch.trim() || 'Cliente General'),
            status: 'PAID'
        };

        SaleService.createSale(saleData).then(() => {
            triggerToast("¡Venta realizada con éxito!");
            setCart([]);
            setPayments([]);
            setShowPaymentModal(false);
            setSelectedCustomer(null);
            setCustomerSearch("");
            ProductService.getPOSProducts().then(r => setProducts(r.data.products || r.data));
        }).catch(() => triggerToast("Error al procesar la venta", "error"));
    }, [cart, total, totalPaidInBase, payments, selectedCustomer, customerSearch, triggerToast]);

    const addPaymentPart = () => {
        const amount = parseFloat(tempPayment.amount);
        if (isNaN(amount) || amount <= 0) return;

        const curr = availableCurrencies.find(c => c.code === tempPayment.currency) || { rate: 1, symbol: "$" };
        const rate = tempPayment.currency === baseCurrencyCode ? 1 : curr.rate;
        const amountInBase = tempPayment.currency === baseCurrencyCode ? amount : amount / rate;

        const newP = {
            ...tempPayment,
            amount,
            exchangeRate: rate,
            amountInBaseCurrency: amountInBase,
            symbol: curr.symbol,
            id: Date.now()
        };

        setPayments([...payments, newP]);
        setTempPayment({ ...tempPayment, amount: "" });
    };

    const removePaymentPart = (id) => {
        setPayments(payments.filter(p => p.id !== id));
    };

    const handleBarcodeSearch = useCallback((code) => {
        if (!code || code.trim() === '') return;
        setBarcodeStatus('searching');
        ProductService.findByBarcode(code.trim()).then((response) => {
            const found = response.data;
            setBarcodeStatus('found');
            addProductToCartById(found, 1);
            triggerToast(`Agregado: ${found.name}`);
            ProductService.getPOSProducts().then(r => setProducts(r.data.products || r.data));
            setTimeout(() => setBarcodeStatus(null), 1500);
        }).catch(() => {
            setBarcodeStatus('not_found');
            triggerToast("Código no encontrado", "error");
            setTimeout(() => setBarcodeStatus(null), 2000);
        });
    }, [addProductToCartById, triggerToast]);

    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return products.filter(p => {
            return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
                p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
        });
    }, [products, searchTerm]);


    // 5. EVENT HANDLERS
    const handleBarcodeKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = barcodeInput.trim();
            if (code) {
                setBarcodeInput('');
                handleBarcodeSearch(code);
            } else if (filteredProducts.length >= 1) {
                addProductToCartById(filteredProducts[0]);
                setSearchTerm("");
            }
        }
    };

    const handleBarcodeChange = (e) => {
        const val = e.target.value;
        setBarcodeInput(val);
        if (val.endsWith('\n')) {
            setBarcodeInput('');
            handleBarcodeSearch(val.trim());
        }
    };

    const updateCartQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return;
        const product = products.find(p => p.id === productId);
        if (newQuantity > (product?.stock || 0)) {
            triggerToast(`Stock máximo: ${product?.stock}`, "error");
            return;
        }
        setCart(cart.map(item =>
            item.product.id === productId
                ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unitPrice }
                : item
        ));
    };

    const confirmAddToCart = () => {
        const qty = parseInt(inputQuantity, 10);
        if (!selectedProduct || !qty || qty < 1) return;
        if (qty > selectedProduct.stock) {
            triggerToast(`Stock insuficiente. Disponible: ${selectedProduct.stock}`, "error");
            return;
        }
        addProductToCartById(selectedProduct, qty);
        setShowQuantityModal(false);
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const handleNewCustomerSubmit = (e) => {
        e.preventDefault();
        CustomerService.create(newCustomer).then((response) => {
            const created = response.data;
            if (created && created.id) {
                setCustomers(prev => [...prev, created]);
                setSelectedCustomer(created);
                setShowNewCustomerModal(false);
                setNewCustomer({ name: "", cedula: "", phone: "", email: "" });
                setCustomerSearch("");
                triggerToast("✅ Cliente registrado.");
            } else {
                triggerToast("Error: Datos del cliente incompletos", "error");
            }
        }).catch(err => {
            console.error("Error creating customer:", err);
            triggerToast("Error al registrar cliente: " + (err.translatedMessage || "Verifique los datos."), "error");
        });
    };

    // 6. EFFECTS
    useEffect(() => {
        ProductService.getPOSProducts().then(r => setProducts(r.data.products || r.data));
        PublicService.getPlatformConfig().then(r => setPlatformConfig(r.data));
        CustomerService.getAll().then(r => setCustomers(r.data));
        setTimeout(() => document.querySelector('.pos-search-input')?.focus(), 500);
    }, []);

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'F1') { e.preventDefault(); document.querySelector('.pos-search-input')?.focus(); }
            else if (e.key === 'F2') { e.preventDefault(); setCustomerSearch(" "); }
            else if (e.key === 'F4') { e.preventDefault(); if (cart.length > 0) setShowPaymentModal(true); }
            else if (e.key === 'Escape') {
                if (showPaymentModal) setShowPaymentModal(false);
                else if (cart.length > 0 && window.confirm("¿Vaciar carrito?")) setCart([]);
                setCustomerSearch(""); setSearchTerm("");
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [cart, showPaymentModal]);

    // 7. RENDER
    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4 bg-light bg-opacity-50" style={{ overflowY: 'auto' }}>
                {/* Removed TPV header and Active status to save vertical space */}

                {!canOperate && (
                    <Alert variant={subscriptionStatus === 'PAST_DUE' ? 'warning' : 'danger'} className="shadow-sm mb-4">
                        <FaExclamationTriangle className="me-2" /> Acceso restringido. Por favor, revisa tu suscripción.
                    </Alert>
                )}

                <Row className="g-4" style={{ opacity: canOperate ? 1 : 0.5, pointerEvents: canOperate ? 'auto' : 'none' }}>
                    {/* Column 1: LARGE CART DETAIL (Left) */}
                    <Col lg={8}>
                        <div className="pos-receipt-container bg-white shadow-sm rounded-4 d-flex flex-column" style={{ height: 'calc(100vh - 40px)' }}>
                            <div className="pos-receipt-header border-bottom p-3">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="fw-bold mb-0">Detalle de la Venta</h4>
                                    <Badge bg="primary" className="rounded-pill px-3 py-2">{cart.length} productos</Badge>
                                </div>
                                <Card className="bg-light border-0 rounded-4 p-3">
                                    <Row className="align-items-center">
                                        <Col md={6}>
                                            <OverlayTrigger placement="right" overlay={<Tooltip>F2 para buscar clientes</Tooltip>}>
                                                <div className="d-flex align-items-center gap-3" onClick={() => setCustomerSearch(customerSearch ? "" : " ")} style={{ cursor: 'pointer' }}>
                                                    <div className="bg-white rounded-circle p-2 text-primary shadow-sm"><FaUserCheck size={20} /></div>
                                                    <div>
                                                        <div className="fw-bold mb-0">{selectedCustomer ? selectedCustomer.name : "Cliente General"}</div>
                                                        <div className="text-muted small">Cédula: {selectedCustomer ? selectedCustomer.cedula : '---'}</div>
                                                    </div>
                                                </div>
                                            </OverlayTrigger>
                                        </Col>
                                        <Col md={6}>
                                            <div className="position-relative">
                                                <InputGroup className="bg-white rounded-pill shadow-sm overflow-hidden">
                                                    <InputGroup.Text className="bg-white border-0 ps-3">
                                                        <FaSearch size={14} className="text-muted" />
                                                    </InputGroup.Text>
                                                    <OverlayTrigger overlay={<Tooltip>F2 para buscar o registrar un cliente</Tooltip>}>
                                                        <Form.Control 
                                                            className="border-0 shadow-none py-2" 
                                                            placeholder="Buscar o Registrar Cliente (F2)..." 
                                                            value={customerSearch} 
                                                            onChange={(e) => setCustomerSearch(e.target.value)} 
                                                        />
                                                    </OverlayTrigger>
                                                </InputGroup>
                                                {customerSearch.trim().length > 0 && (
                                                    <ListGroup className="position-absolute w-100 shadow-lg border-0 rounded-4 mt-2" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                                        <ListGroup.Item action className="text-primary fw-bold border-0" onClick={() => setShowNewCustomerModal(true)}>
                                                            <FaUserPlus className="me-2" /> + Nuevo Cliente
                                                        </ListGroup.Item>
                                                        {customers.filter(c => 
                                                            c.name.toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
                                                            (c.cedula && c.cedula.toLowerCase().includes(customerSearch.trim().toLowerCase()))
                                                        ).slice(0, 5).map(c => (
                                                            <ListGroup.Item key={c.id} action className="border-0" onClick={() => {setSelectedCustomer(c); setCustomerSearch("");}}>
                                                                <div className="fw-bold small">{c.name}</div>
                                                                <div className="text-muted x-small">{c.cedula || 'N/A'} • {c.phone || 'N/A'}</div>
                                                            </ListGroup.Item>
                                                        ))}
                                                    </ListGroup>
                                                )}
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>
                            </div>

                            {/* Cart Items Header */}
                            <div className="px-4 py-2 bg-light border-bottom text-muted small fw-bold d-none d-md-flex">
                                <div style={{ width: '45%' }}>PRODUCTO</div>
                                <div style={{ width: '15%' }} className="text-center">CANT</div>
                                <div style={{ width: '20%' }} className="text-end">P. UNIT</div>
                                <div style={{ width: '20%' }} className="text-end">TOTAL</div>
                            </div>

                            <div className="pos-cart-items px-3 flex-grow-1 overflow-auto">
                                {[...cart].reverse().map(item => (
                                    <div key={item.product.id} className="pos-cart-item border-bottom py-3 flex-shrink-0">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div style={{ width: '45%' }} className="pe-2">
                                                <div className="fw-bold text-dark text-truncate">{item.product.name}</div>
                                                <div className="text-muted x-small">SKU: {item.product.sku}</div>
                                            </div>
                                            <div style={{ width: '15%' }} className="d-flex flex-column align-items-center">
                                                <div className="d-flex gap-2 align-items-center">
                                                    <Form.Control
                                                        type="number"
                                                        size="sm"
                                                        className="text-center fw-bold border shadow-sm mx-1 no-spinner"
                                                        style={{ width: '80px', borderRadius: '8px' }}
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            if (!isNaN(val)) updateCartQuantity(item.product.id, val);
                                                        }}
                                                        min="1"
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ width: '20%' }} className="text-end fw-bold text-muted">
                                                {baseCurrencySymbol}{item.unitPrice.toFixed(2)}
                                            </div>
                                            <div style={{ width: '20%' }} className="text-end">
                                                <span className="fw-bold text-primary fs-5">{baseCurrencySymbol}{item.subtotal.toFixed(2)}</span>
                                                <br/>
                                                <OverlayTrigger overlay={<Tooltip>Eliminar producto del carrito</Tooltip>}>
                                                    <Button variant="link" className="text-danger p-0 x-small text-decoration-none" onClick={() => removeFromCart(item.product.id)}>
                                                        <FaTrash size={10} /> Quitar
                                                    </Button>
                                                </OverlayTrigger>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {cart.length === 0 && (
                                    <div className="text-center py-5 opacity-25 mt-5">
                                        <FaShoppingCart size={80} className="mb-3" />
                                        <p className="fs-4 fw-bold">Esperando productos...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Col>

                    {/* Column 2: SEARCH (Right) */}
                    <Col lg={4} className="d-flex flex-column" style={{ height: 'calc(100vh - 40px)' }}>
                        <div className="bg-white rounded-4 shadow-sm p-4 d-flex flex-column h-100">
                             <div className="d-flex align-items-center justify-content-between mb-4">
                                <h5 className="fw-bold mb-0">Catálogo</h5>
                                <Badge bg="light" className="text-muted border">F1 Buscar</Badge>
                             </div>

                            <div className="pos-search-wrapper mb-4">
                                <FaSearch className="search-icon" />
                                <OverlayTrigger placement="left" overlay={<Tooltip>F1 buscar por nombre o SKU</Tooltip>}>
                                    <Form.Control
                                        className="pos-search-input shadow-sm border-0 bg-light"
                                        placeholder="Buscar producto..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={handleBarcodeKeyDown}
                                    />
                                </OverlayTrigger>
                            </div>
                            
                            <div className="flex-grow-1 overflow-auto pe-2">
                                <Row className="g-3">
                                    {filteredProducts.map(p => (
                                        <Col key={p.id} xs={6}>
                                            <div className="pos-card-compact border rounded-4 p-3 bg-white hover-shadow transition-all" onClick={() => addProductToCartById(p)} style={{ cursor: 'pointer' }}>
                                                <div className="fw-bold small text-truncate mb-1">{p.name}</div>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-primary fw-bold">{baseCurrencySymbol}{p.price}</span>
                                                    <Badge bg={p.stock > 5 ? "success-subtle" : "danger-subtle"} className={p.stock > 5 ? "text-success" : "text-danger"}>{p.stock}</Badge>
                                                </div>
                                            </div>
                                        </Col>
                                    ))}
                                    {searchTerm && filteredProducts.length === 0 && (
                                        <div className="text-center py-5 text-muted">
                                            <FaBox size={40} className="mb-2 opacity-25" />
                                            <p className="small">No se encontraron productos</p>
                                        </div>
                                    )}
                                </Row>
                            </div>

                            {/* Discrete Total Summary */}
                            <div className="mt-4 pt-4 border-top">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted fw-bold">TOTAL</span>
                                    <span className="fs-3 fw-black">{baseCurrencySymbol}{total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Floating Checkout Button */}
                {cart.length > 0 && (
                     <div className="pos-floating-checkout shadow-lg animate-in">
                        <Button 
                            className="btn-premium-checkout" 
                            onClick={() => setShowPaymentModal(true)}
                        >
                            <FaCashRegister /> COBRAR (F4)
                        </Button>
                     </div>
                )}

                <Modal show={showQuantityModal} onHide={() => setShowQuantityModal(false)} centered>
                    <Modal.Header closeButton><Modal.Title>Cantidad</Modal.Title></Modal.Header>
                    <Modal.Body>
                        <Form.Control type="number" value={inputQuantity} onChange={e => setInputQuantity(e.target.value)} autoFocus onKeyPress={e => e.key === 'Enter' && confirmAddToCart()} />
                    </Modal.Body>
                    <Modal.Footer><Button variant="primary" onClick={confirmAddToCart}>Agregar</Button></Modal.Footer>
                </Modal>

                <Modal show={showNewCustomerModal} onHide={() => setShowNewCustomerModal(false)} centered>
                    <Modal.Header closeButton><Modal.Title>Nuevo Cliente</Modal.Title></Modal.Header>
                    <Form onSubmit={handleNewCustomerSubmit}>
                        <Modal.Body>
                            <Form.Control className="mb-2" required placeholder="Nombre" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                            <Form.Control className="mb-2" placeholder="Cédula" value={newCustomer.cedula} onChange={e => setNewCustomer({ ...newCustomer, cedula: e.target.value })} />
                            <Form.Control className="mb-2" placeholder="Teléfono" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                        </Modal.Body>
                        <Modal.Footer><Button variant="primary" type="submit">Guardar</Button></Modal.Footer>
                    </Form>
                </Modal>

                {/* Payment Modal Refactored */}
                <Modal 
                    show={showPaymentModal} 
                    onHide={() => setShowPaymentModal(false)} 
                    centered 
                    size="lg"
                    contentClassName="payment-modal-content"
                >
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-black fs-2">Finalizar Venta</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <Row className="g-4">
                            <Col md={7}>
                                <div className="payment-summary-card mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="text-muted small fw-bold">TOTAL A PAGAR</span>
                                        <span className="fs-4 fw-black">{baseCurrencySymbol}{total.toFixed(2)}</span>
                                    </div>
                                    <div className="progress mb-2" style={{ height: '8px', borderRadius: '10px' }}>
                                        <div 
                                            className="progress-bar bg-success" 
                                            role="progressbar" 
                                            style={{ width: `${(totalPaidInBase / total) * 100}%` }} 
                                        ></div>
                                    </div>
                                    <div className="d-flex justify-content-between small">
                                        <span className="text-success fw-bold">Pagado: {baseCurrencySymbol}{totalPaidInBase.toFixed(2)}</span>
                                        <span className="text-primary fw-bold">Pendiente: {baseCurrencySymbol}{remainingToPay.toFixed(2)}</span>
                                    </div>
                                </div>

                                <h6 className="fw-bold mb-3">Registrar Pago</h6>
                                <div className="currency-input-group mb-3">
                                    <Row className="g-2">
                                        <Col xs={4}>
                                            <Form.Select 
                                                className="border-0 bg-transparent fw-bold"
                                                value={tempPayment.currency}
                                                onChange={e => setTempPayment({...tempPayment, currency: e.target.value})}
                                            >
                                                <option value="USD">USD</option>
                                                <option value="VES">VES</option>
                                                <option value="COP">COP</option>
                                            </Form.Select>
                                        </Col>
                                        <Col xs={8}>
                                            <Form.Control 
                                                type="number"
                                                placeholder="Monto"
                                                className="border-0 bg-transparent fw-bold fs-5 text-end"
                                                value={tempPayment.amount}
                                                onChange={e => setTempPayment({...tempPayment, amount: e.target.value})}
                                                onKeyPress={e => e.key === 'Enter' && addPaymentPart()}
                                            />
                                        </Col>
                                    </Row>
                                </div>

                                <div className="d-flex gap-2 flex-wrap mb-4">
                                    {['CASH', 'CARD', 'TRANSFER', 'MOBILE_PAYMENT'].map(m => (
                                        <Button 
                                            key={m}
                                            variant={tempPayment.method === m ? "primary" : "outline-light"}
                                            className={`border-0 rounded-3 flex-grow-1 ${tempPayment.method === m ? "" : "text-muted bg-light"}`}
                                            onClick={() => setTempPayment({...tempPayment, method: m})}
                                        >
                                            {m === 'CASH' ? '💵' : m === 'CARD' ? '💳' : m === 'TRANSFER' ? '🏦' : '📱'}
                                            <span className="ms-2 small fw-bold">
                                                {m === 'CASH' ? 'Efectivo' : m === 'CARD' ? 'Punto' : m === 'TRANSFER' ? 'Transf' : 'Móvil'}
                                            </span>
                                        </Button>
                                    ))}
                                </div>

                                <Button 
                                    variant="dark" 
                                    className="w-100 py-3 rounded-4 fw-bold"
                                    onClick={addPaymentPart}
                                    disabled={!tempPayment.amount}
                                >
                                    <FaPlus className="me-2" /> Agregar Pago
                                </Button>
                            </Col>

                            <Col md={5}>
                                <div className="balance-card h-100 flex-column d-flex">
                                    <h6 className="text-white-50 fw-bold mb-4">Resumen de Pagos</h6>
                                    <div className="flex-grow-1 overflow-auto pe-2" style={{ maxHeight: '250px' }}>
                                        {payments.length === 0 && <div className="text-center text-white-50 py-4 small">Sin pagos registrados</div>}
                                        {payments.map(p => (
                                            <div key={p.id} className="balance-item animate-in">
                                                <div>
                                                    <div className="fw-bold small">{p.method === 'CASH' ? '💵 Efectivo' : p.method === 'CARD' ? '💳 Punto' : '🏦 Transf'}</div>
                                                    <div className="text-white-50 x-small">{p.amount} {p.currency}</div>
                                                </div>
                                                <div className="d-flex align-items-center gap-3">
                                                    <span className="balance-value paid small">{baseCurrencySymbol}{p.amountInBaseCurrency.toFixed(2)}</span>
                                                    <FaTrash 
                                                        size={12} 
                                                        className="text-danger cursor-pointer" 
                                                        onClick={() => removePaymentPart(p.id)} 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-top border-secondary">
                                        <div className="d-flex justify-content-between mb-3">
                                            <span className="text-white-50 small">Total Pagado</span>
                                            <span className="fw-bold">{baseCurrencySymbol}{totalPaidInBase.toFixed(2)}</span>
                                        </div>
                                        {totalPaidInBase > total && (
                                            <div className="d-flex justify-content-between text-info mb-4">
                                                <span className="small fw-bold">VUELTO / CAMBIO</span>
                                                <span className="fs-4 fw-black text-info">{baseCurrencySymbol}{(totalPaidInBase - total).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <Button 
                                            variant="success" 
                                            size="lg" 
                                            className="w-100 py-3 rounded-pill fw-bold shadow-sm"
                                            disabled={totalPaidInBase < total}
                                            onClick={handleCheckout}
                                        >
                                            COMPLETAR VENTA
                                        </Button>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Modal.Body>
                </Modal>

                <ToastContainer position="top-center" className="p-3">
                    <Toast show={showToast} onClose={() => setShowToast(false)} delay={2000} autohide className={`bg-${toastType} text-white rounded-pill border-0 shadow-lg px-3`}>
                        <Toast.Body className="py-2 small fw-bold">{toastMessage}</Toast.Body>
                    </Toast>
                </ToastContainer>
            </div>
        </div>
    );
};

export default POSPage;
