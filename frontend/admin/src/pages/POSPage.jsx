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
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [paymentCurrency, setPaymentCurrency] = useState("USD");
    const [customerName, setCustomerName] = useState("");
    const [customerCedula, setCustomerCedula] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
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
    const subscriptionStatus = user?.subscriptionStatus || 'FREE';
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

    const handleCheckout = useCallback(() => {
        if (cart.length === 0) return;
        const selectedCurr = getSelectedCurrency();
        const saleData = {
            totalAmount: total,
            paymentMethod: paymentMethod,
            paymentCurrency: paymentCurrency,
            paymentAmountInCurrency: paymentCurrency === baseCurrencyCode ? total : convertToPaymentCurrency(total),
            exchangeRateUsed: paymentCurrency === baseCurrencyCode ? 1 : (selectedCurr?.rate || 1),
            items: cart.map(item => ({
                product: { id: item.product.id },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal
            })),
            customer: selectedCustomer ? { id: selectedCustomer.id } : null,
            customerName: selectedCustomer ? selectedCustomer.name : (customerSearch.trim() || 'Cliente General'),
            status: 'PAID'
        };

        SaleService.createSale(saleData).then(() => {
            triggerToast("¡Venta realizada con éxito!");
            setCart([]);
            setPaymentMethod("CASH");
            setPaymentCurrency(baseCurrencyCode);
            setSelectedCustomer(null);
            setCustomerSearch("");
            ProductService.getPOSProducts().then(r => setProducts(r.data.products || r.data));
        }).catch(() => triggerToast("Error al procesar la venta", "error"));
    }, [cart, total, paymentMethod, paymentCurrency, selectedCustomer, customerSearch, baseCurrencyCode, triggerToast, getSelectedCurrency, convertToPaymentCurrency]);

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
            else if (e.key === 'F3') { e.preventDefault(); setPaymentMethod(p => p === "CASH" ? "CARD" : p === "CARD" ? "TRANSFER" : "CASH"); }
            else if (e.key === 'F4') { e.preventDefault(); if (cart.length > 0) handleCheckout(); }
            else if (e.key === 'Escape') {
                if (cart.length > 0 && window.confirm("¿Vaciar carrito?")) setCart([]);
                setCustomerSearch(""); setSearchTerm("");
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [cart, handleCheckout]);

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
                                                    <OverlayTrigger overlay={<Tooltip>Disminuir cantidad</Tooltip>}>
                                                        <Button variant="light" size="sm" className="pos-btn-qty shadow-sm border" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}>
                                                            <FaMinus size={10} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <Form.Control
                                                        type="number"
                                                        size="sm"
                                                        className="text-center fw-bold border shadow-sm mx-1"
                                                        style={{ width: '70px', borderRadius: '8px' }}
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            if (!isNaN(val)) updateCartQuantity(item.product.id, val);
                                                        }}
                                                        min="1"
                                                    />
                                                    <OverlayTrigger overlay={<Tooltip>Aumentar cantidad</Tooltip>}>
                                                        <Button variant="light" size="sm" className="pos-btn-qty shadow-sm border" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}>
                                                            <FaPlus size={10} />
                                                        </Button>
                                                    </OverlayTrigger>
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

                    {/* Column 2: SEARCH & PAYMENT (Right) */}
                    <Col lg={4} className="d-flex flex-column" style={{ height: 'calc(100vh - 40px)' }}>
                        {/* Search and Quick Selection */}
                        <div className="bg-white rounded-4 shadow-sm p-3 mb-3 d-flex flex-column" style={{ flex: '1 1 auto', minHeight: 0 }}>
                            <div className="pos-search-wrapper mb-3">
                                <FaSearch className="search-icon" />
                                <OverlayTrigger placement="left" overlay={<Tooltip>F1 para enfocar búsqueda. Escribe nombre o SKU y pulsa Enter.</Tooltip>}>
                                    <Form.Control
                                        className="pos-search-input shadow-sm"
                                        placeholder="Buscar producto... (F1)"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={handleBarcodeKeyDown}
                                    />
                                </OverlayTrigger>
                            </div>
                            
                            <div className="flex-grow-1 overflow-auto pe-2">
                                <Row className="g-2">
                                    {filteredProducts.map(p => (
                                        <Col key={p.id} xs={6}>
                                            <OverlayTrigger overlay={<Tooltip>Clic para añadir 1 unidad al carrito</Tooltip>}>
                                                <div className="pos-card-compact border rounded-3 p-2 bg-light h-100" onClick={() => addProductToCartById(p)} style={{ cursor: 'pointer' }}>
                                                    <div className="fw-bold small text-truncate mb-0">{p.name}</div>
                                                    <div className="text-muted x-small text-truncate mb-1">{p.brand || 'Genérico'}</div>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="text-primary fw-bold small">{baseCurrencySymbol}{p.price}</span>
                                                        <Badge bg={p.stock > 10 ? "success" : "warning"} style={{ fontSize: '0.6rem' }}>{p.stock}</Badge>
                                                    </div>
                                                </div>
                                            </OverlayTrigger>
                                        </Col>
                                    ))}
                                    {searchTerm && filteredProducts.length === 0 && (
                                        <div className="text-center small py-3 text-muted">No hay resultados</div>
                                    )}
                                </Row>
                        </div>
                        
                        {/* FINAL PAYMENT SECTION - Pin to bottom right */}
                        <div className="pos-total-section bg-dark text-white rounded-4 shadow-lg p-4 mt-auto">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <div className="huge-total-label text-info opacity-75">PENDIENTE POR COBRAR</div>
                                <div className="currency-selector">
                                    <Form.Select 
                                        size="sm" 
                                        className="bg-dark text-info border-info rounded-pill px-3"
                                        value={paymentCurrency}
                                        onChange={(e) => setPaymentCurrency(e.target.value)}
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="VES">VES (Bs.)</option>
                                        <option value="COP">COP ($)</option>
                                    </Form.Select>
                                </div>
                            </div>
                            
                            <div className="huge-total-value text-white my-2">
                                {formatPaymentCurrency(total)}
                            </div>
                            
                            {paymentCurrency !== baseCurrencyCode && (
                                <div className="small text-info mb-4 opacity-75">
                                    Equivalente a {baseCurrencySymbol}{total.toFixed(2)} {baseCurrencyCode}
                                </div>
                            )}
                            
                            <Form.Group className="mb-4">
                                <Form.Label className="small text-white-50 d-block mb-2">Método de Pago</Form.Label>
                                <div className="d-flex flex-wrap gap-2">
                                    <OverlayTrigger overlay={<Tooltip>Efectivo</Tooltip>}>
                                        <Button 
                                            variant={paymentMethod === 'CASH' ? 'primary' : 'outline-light'} 
                                            className="flex-grow-1 rounded-3 py-2 border-0"
                                            onClick={() => setPaymentMethod('CASH')}
                                        >
                                            💵 <span className="d-none d-md-inline">Efectivo</span>
                                        </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger overlay={<Tooltip>Débito/Tarjeta</Tooltip>}>
                                        <Button 
                                            variant={paymentMethod === 'CARD' ? 'primary' : 'outline-light'} 
                                            className="flex-grow-1 rounded-3 py-2 border-0"
                                            onClick={() => setPaymentMethod('CARD')}
                                        >
                                            💳 <span className="d-none d-md-inline">Débito</span>
                                        </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger overlay={<Tooltip>Transferencia Bancaria</Tooltip>}>
                                        <Button 
                                            variant={paymentMethod === 'TRANSFER' ? 'primary' : 'outline-light'} 
                                            className="flex-grow-1 rounded-3 py-2 border-0"
                                            onClick={() => setPaymentMethod('TRANSFER')}
                                        >
                                            🏦 <span className="d-none d-md-inline">Transf.</span>
                                        </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger overlay={<Tooltip>Pago Móvil</Tooltip>}>
                                        <Button 
                                            variant={paymentMethod === 'MOBILE_PAYMENT' ? 'primary' : 'outline-light'} 
                                            className="flex-grow-1 rounded-3 py-2 border-0"
                                            onClick={() => setPaymentMethod('MOBILE_PAYMENT')}
                                        >
                                            📱 <span className="d-none d-md-inline">P. Móvil</span>
                                        </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger overlay={<Tooltip>Otro Método de Pago</Tooltip>}>
                                        <Button 
                                            variant={paymentMethod === 'OTHER' ? 'primary' : 'outline-light'} 
                                            className="flex-grow-1 rounded-3 py-2 border-0"
                                            onClick={() => setPaymentMethod('OTHER')}
                                        >
                                            ❓ <span className="d-none d-md-inline">Otro</span>
                                        </Button>
                                    </OverlayTrigger>
                                </div>
                            </Form.Group>
                            
                            <OverlayTrigger placement="top" overlay={<Tooltip>Finalizar venta y generar ticket (F4)</Tooltip>}>
                                <Button 
                                    variant="info" 
                                    size="lg" 
                                    className="w-100 rounded-pill py-3 fw-bold fs-4 shadow-blue animate-pulse" 
                                    onClick={handleCheckout} 
                                    disabled={cart.length === 0}
                                >
                                    <FaCashRegister className="me-2" /> COBRAR (F4)
                                </Button>
                            </OverlayTrigger>
                        </div>
                    </div>
                    </Col>
                </Row>

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
