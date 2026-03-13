import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, ListGroup, InputGroup, Table, Modal, Alert, OverlayTrigger, Tooltip, Spinner, Badge, Toast, ToastContainer } from 'react-bootstrap';
import { FaSearch, FaPlus, FaTrash, FaShoppingCart, FaEdit, FaLock, FaExclamationTriangle, FaExchangeAlt, FaUserPlus, FaUserAlt, FaUserCheck, FaBarcode, FaHome, FaSignOutAlt, FaBell, FaHistory, FaCashRegister, FaTruck, FaBox, FaTags } from 'react-icons/fa';
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
            triggerToast("Error al registrar cliente: " + (err.response?.data?.message || err.message), "error");
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
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="fw-bold mb-0 text-gradient">TPV Tiendario</h2>
                        <p className="text-muted small mb-0">Terminal de Punto de Venta Inteligente</p>
                    </div>
                    <div className="bg-white px-3 py-2 rounded-4 shadow-sm border small">
                        <span className="text-muted">Estado del Sistema:</span> <span className="text-success fw-bold">● Activo</span>
                    </div>
                </div>

                {!canOperate && (
                    <Alert variant={subscriptionStatus === 'PAST_DUE' ? 'warning' : 'danger'} className="shadow-sm mb-4">
                        <FaExclamationTriangle className="me-2" /> Acceso restringido. Por favor, revisa tu suscripción.
                    </Alert>
                )}

                <Row className="g-4" style={{ opacity: canOperate ? 1 : 0.5, pointerEvents: canOperate ? 'auto' : 'none' }}>
                    <Col lg={8}>
                        <div className="mb-4">

                            <OverlayTrigger placement="bottom" overlay={<Tooltip>Busca por nombre, SKU o código de barras. <b>F1</b> para enfocar. <b>Enter</b> para agregar el primero.</Tooltip>}>
                                <div className="pos-search-wrapper mb-3">
                                    <FaSearch className="search-icon" />
                                    <Form.Control
                                        className="pos-search-input shadow-sm border-0"
                                        placeholder="Busca por nombre, SKU o código de barras... (F1)"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={handleBarcodeKeyDown}
                                    />
                                </div>
                            </OverlayTrigger>
                        </div>

                        <Row className="g-3" style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                            {filteredProducts.map(p => (
                                <Col key={p.id} sm={6} md={4} xl={3}>
                                    <div className="pos-card" onClick={() => addProductToCartById(p)} onDoubleClick={() => addProductToCartById(p)}>
                                        <img src={p.imageUrl || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=200&h=150&auto=format&fit=crop"} className="card-img-top" alt={p.name} />
                                        <div className="card-body">
                                            <div className="product-title text-truncate">{p.name}</div>
                                            <div className="product-sku">{p.sku}</div>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div className="product-price">{baseCurrencySymbol}{p.price}</div>
                                                <div className="d-flex align-items-center gap-1">
                                                    <span className={`stock-dot ${p.stock > 50 ? 'stock-high' : p.stock > 10 ? 'stock-medium' : 'stock-low'}`}></span>
                                                    <span className="text-muted small">{p.stock}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Col>
                            ))}
                            {filteredProducts.length === 0 && (
                                <Col className="text-center py-5 opacity-50">
                                    <FaSearch size={40} className="mb-3" />
                                    <p className="fw-bold">
                                        {!searchTerm.trim() ? "Escanea o busca productos para empezar..." : "No se encontró nada con esa búsqueda"}
                                    </p>
                                </Col>
                            )}
                        </Row>
                    </Col>

                    <Col lg={4}>
                        <div className="pos-receipt-container">
                            <div className="pos-receipt-header">
                                <h5 className="fw-bold mb-3">Ticket de Venta <Badge bg="success-subtle" className="text-success ms-2">{cart.length} ítems</Badge></h5>
                                <Card className="bg-light border-0 rounded-4 mb-3 p-2">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <OverlayTrigger placement="left" overlay={<Tooltip><b>F2</b> para buscar clientes registrados o crear uno nuevo.</Tooltip>}>
                                            <div className="d-flex align-items-center gap-2" onClick={() => setCustomerSearch(customerSearch ? "" : " ")} style={{ cursor: 'pointer' }}>
                                                <div className="bg-white rounded-circle p-2 text-primary shadow-sm"><FaUserCheck /></div>
                                                <div>
                                                    <div className="fw-bold small">{selectedCustomer ? selectedCustomer.name : "Cliente General"}</div>
                                                    <div className="text-muted x-small">Click para cambiar</div>
                                                </div>
                                            </div>
                                        </OverlayTrigger>
                                        {selectedCustomer && <Button variant="link" className="text-danger p-0" onClick={() => setSelectedCustomer(null)}><FaTrash size={12} /></Button>}
                                    </div>
                                    <div className="mt-2 position-relative">
                                        <div className="d-flex align-items-center bg-white rounded-3 px-2 shadow-sm">
                                            <FaSearch size={12} className="text-muted me-2" />
                                            <Form.Control 
                                                size="sm" 
                                                className="border-0 shadow-none bg-transparent" 
                                                placeholder="Buscar cliente por nombre, CI o cel... (F2)" 
                                                value={customerSearch} 
                                                onChange={(e) => setCustomerSearch(e.target.value)} 
                                            />
                                        </div>
                                        
                                        {customerSearch.trim().length > 0 && (
                                            <ListGroup className="position-absolute w-100 shadow-lg border-0 rounded-4 mt-1" style={{ zIndex: 1000, maxHeight: '250px', overflowY: 'auto' }}>
                                                <ListGroup.Item action className="text-primary fw-bold border-0" onClick={() => setShowNewCustomerModal(true)}>
                                                    <FaUserPlus className="me-2" /> + Registrar Nuevo Cliente
                                                </ListGroup.Item>
                                                {customers.filter(c => 
                                                    c.name.toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
                                                    (c.cedula && c.cedula.toLowerCase().includes(customerSearch.trim().toLowerCase())) ||
                                                    (c.phone && c.phone.replace(/\D/g,'').includes(customerSearch.trim().replace(/\D/g,'')))
                                                ).slice(0, 8).map(c => (
                                                    <ListGroup.Item key={c.id} action className="border-0 py-2" onClick={() => {setSelectedCustomer(c); setCustomerSearch("");}}>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <div className="fw-bold small">{c.name}</div>
                                                                <div className="text-muted" style={{ fontSize: '0.65rem' }}>{c.cedula || 'Sin Cédula'} • {c.phone || 'Sin Teléfono'}</div>
                                                            </div>
                                                            <FaUserAlt size={12} className="text-muted opacity-50" />
                                                        </div>
                                                    </ListGroup.Item>
                                                ))}
                                            </ListGroup>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            <div className="pos-cart-items px-3">
                                {cart.map(item => (
                                    <div key={item.product.id} className="pos-cart-item border-bottom py-2">
                                        <div className="d-flex justify-content-between align-items-start fw-bold small">
                                            <span className="text-truncate" style={{ width: '45%' }}>{item.product.name}</span>
                                            <span style={{ width: '15%' }}>x{item.quantity}</span>
                                            <span style={{ width: '20%' }}>{baseCurrencySymbol}{item.unitPrice}</span>
                                            <span className="text-end" style={{ width: '20%' }}>{baseCurrencySymbol}{item.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mt-1">
                                            <div className="d-flex gap-2">
                                                <OverlayTrigger overlay={<Tooltip>Disminuir cantidad</Tooltip>}><div className="pos-quick-qty" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}>-</div></OverlayTrigger>
                                                <OverlayTrigger overlay={<Tooltip>Aumentar cantidad</Tooltip>}><div className="pos-quick-qty" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}>+</div></OverlayTrigger>
                                            </div>
                                            <OverlayTrigger overlay={<Tooltip>Quitar producto (ESC)</Tooltip>}>
                                                <Button variant="link" className="text-danger p-0 x-small" onClick={() => removeFromCart(item.product.id)}><FaTrash size={10} /> Eliminar</Button>
                                            </OverlayTrigger>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pos-total-section p-4">
                                <div className="huge-total-label mb-1">TOTAL A COBRAR <span className="kb-shortcut ms-2">F4</span></div>
                                <div className="huge-total-value mb-4">{baseCurrencySymbol}{total.toFixed(2)}</div>
                                
                                <div className="d-flex gap-2 mb-3">
                                    <OverlayTrigger overlay={<Tooltip>Selecciona el método de pago. <b>F3</b> para alternar rápido.</Tooltip>}>
                                        <Form.Select size="sm" className="rounded-pill border-0 shadow-sm" style={{ width: '130px' }} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                            <option value="CASH">💵 Efectivo (F3)</option>
                                            <option value="CARD">💳 Tarjeta (F3)</option>
                                            <option value="TRANSFER">🏦 Transf (F3)</option>
                                        </Form.Select>
                                    </OverlayTrigger>
                                    <OverlayTrigger overlay={<Tooltip>Finalizar la venta y generar ticket. <b>F4</b></Tooltip>}>
                                        <Button variant="primary" size="sm" className="flex-grow-1 rounded-pill px-3" onClick={handleCheckout} disabled={cart.length === 0}>💰 COBRAR (F4)</Button>
                                    </OverlayTrigger>
                                </div>
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
