import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, ListGroup, InputGroup, Table, Modal, Alert, OverlayTrigger, Tooltip, Spinner } from 'react-bootstrap';
import { FaSearch, FaPlus, FaTrash, FaShoppingCart, FaEdit, FaLock, FaExclamationTriangle, FaExchangeAlt, FaUserPlus, FaUserAlt, FaUserCheck, FaBarcode } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import ProductService from '../services/product.service';
import SaleService from '../services/sale.service';
import AuthService from '../services/auth.service';
import PublicService from '../services/public.service';
import CustomerService from '../services/customer.service';

const POSPage = () => {
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

    // Customer Selection State
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null); // null = "Cliente General"
    const [customerSearch, setCustomerSearch] = useState("");
    const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: "", cedula: "", phone: "", email: "" });

    // Subscription status check
    const user = AuthService.getCurrentUser();
    const subscriptionStatus = user?.subscriptionStatus || 'FREE';
    const canOperate = subscriptionStatus === 'PAID' || subscriptionStatus === 'TRIAL';

    // Quantity modal
    const [showQuantityModal, setShowQuantityModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [inputQuantity, setInputQuantity] = useState('1');

    // Barcode scanner
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeStatus, setBarcodeStatus] = useState(null); // null | 'searching' | 'found' | 'not_found'
    const barcodeInputRef = useRef(null);
    const barcodeTimerRef = useRef(null);

    useEffect(() => {
        ProductService.getPOSProducts().then(
            (response) => {
                // Backend now returns paginated object { products: [], ... }
                setProducts(response.data.products || response.data);
            },
            (error) => console.error("Error fetching products", error)
        );

        PublicService.getPlatformConfig().then(
            (response) => setPlatformConfig(response.data),
            (error) => console.error("Error fetching platform config", error)
        );

        CustomerService.getAll().then(
            (response) => setCustomers(response.data),
            (error) => console.error("Error fetching customers", error)
        );

        // Auto-focus the barcode input so the scanner works immediately on page load
        setTimeout(() => { if (barcodeInputRef.current) barcodeInputRef.current.focus(); }, 300);
    }, []);

    // Parse currencies from platform config
    const availableCurrencies = useMemo(() => {
        if (!platformConfig) return [];
        try {
            const parsed = JSON.parse(platformConfig.currencies || '[]');
            return parsed.filter(c => c.enabled);
        } catch {
            return [];
        }
    }, [platformConfig]);

    const baseCurrencyCode = platformConfig?.baseCurrencyCode || 'USD';
    const baseCurrencySymbol = platformConfig?.baseCurrencySymbol || '$';

    const formatSecondary = (amount) => {
        if (!platformConfig || !platformConfig.enableSecondaryCurrency) return null;
        const converted = amount * platformConfig.exchangeRate;
        return `${platformConfig.secondaryCurrencySymbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Convert amount to selected payment currency
    const getSelectedCurrency = () => availableCurrencies.find(c => c.code === paymentCurrency);
    const convertToPaymentCurrency = (amount) => {
        if (paymentCurrency === baseCurrencyCode) return amount;
        const curr = getSelectedCurrency();
        return curr ? amount * curr.rate : amount;
    };
    const formatPaymentCurrency = (amount) => {
        const converted = convertToPaymentCurrency(amount);
        if (paymentCurrency === baseCurrencyCode) {
            return `${baseCurrencySymbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        const curr = getSelectedCurrency();
        return `${curr?.symbol || ''} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // --- BARCODE SCANNER LOGIC ---
    const addProductToCartById = useCallback((foundProduct, qty = 1) => {
        if (!foundProduct) return;
        if (foundProduct.stock < 1) {
            setMessage(`❌ "${foundProduct.name}" no tiene stock disponible.`);
            setTimeout(() => setMessage(''), 3500);
            return;
        }
        setCart(prev => {
            const existing = prev.find(item => item.product.id === foundProduct.id);
            if (existing) {
                if (existing.quantity + qty > foundProduct.stock) {
                    setMessage(`❌ Stock insuficiente. Solo quedan ${foundProduct.stock} unidades.`);
                    setTimeout(() => setMessage(''), 3500);
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
    }, []);

    const handleBarcodeSearch = useCallback((code) => {
        if (!code || code.trim() === '') return;
        setBarcodeStatus('searching');
        ProductService.findByBarcode(code.trim()).then(
            (response) => {
                const found = response.data;
                setBarcodeStatus('found');
                addProductToCartById(found, 1);
                // Refresh local products list to show updated stock
                ProductService.getPOSProducts().then(r => setProducts(r.data.products || r.data));
                setTimeout(() => setBarcodeStatus(null), 1500);
            },
            () => {
                setBarcodeStatus('not_found');
                setTimeout(() => setBarcodeStatus(null), 2000);
            }
        );
    }, [addProductToCartById]);

    const handleBarcodeKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = barcodeInput.trim();
            setBarcodeInput('');
            handleBarcodeSearch(code);
        }
    };

    // Detect rapid input typical of hardware barcode scanners (fires Enter after ~50ms)
    const handleBarcodeChange = (e) => {
        const val = e.target.value;
        setBarcodeInput(val);
        // Clear previous timer
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        // If the value already ends with '\n' (some scanners), process immediately
        if (val.endsWith('\n')) {
            setBarcodeInput('');
            handleBarcodeSearch(val.trim());
        }
    };

    const openQuantityModal = (product) => {
        setSelectedProduct(product);
        setInputQuantity('1');
        setShowQuantityModal(true);
    };

    const confirmAddToCart = () => {
        const qty = parseInt(inputQuantity, 10);
        if (!selectedProduct || !qty || qty < 1) return;

        const existing = cart.find(item => item.product.id === selectedProduct.id);
        if (existing) {
            if (existing.quantity + qty > selectedProduct.stock) {
                setMessage(`❌ Stock insuficiente. Solo quedan ${selectedProduct.stock} unidades de ${selectedProduct.name}.`);
                setTimeout(() => setMessage(""), 3500);
                return;
            }
            setCart(cart.map(item =>
                item.product.id === selectedProduct.id
                    ? { ...item, quantity: item.quantity + qty, subtotal: (item.quantity + qty) * selectedProduct.price }
                    : item
            ));
        } else {
            if (qty > selectedProduct.stock) {
                setMessage(`❌ Stock insuficiente para ${selectedProduct.name}. Disponible: ${selectedProduct.stock}`);
                setTimeout(() => setMessage(""), 3500);
                return;
            }
            setCart([...cart, {
                product: selectedProduct,
                quantity: qty,
                unitPrice: selectedProduct.price,
                subtotal: qty * selectedProduct.price
            }]);
        }

        setShowQuantityModal(false);
        setSelectedProduct(null);
        setInputQuantity('1');
    };

    const updateCartQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return;

        const product = products.find(p => p.id === productId);
        if (newQuantity > product.stock) {
            setMessage(`❌ No puedes agregar más. Stock máximo: ${product.stock}`);
            setTimeout(() => setMessage(""), 3500);
            return;
        }

        setCart(cart.map(item =>
            item.product.id === productId
                ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unitPrice }
                : item
        ));
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product.id !== productId));
    };

    const total = cart.reduce((acc, item) => acc + item.subtotal, 0);

    const handleCheckout = () => {
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
            customerName: selectedCustomer ? selectedCustomer.name : (customerName.trim() || customerSearch.trim() || 'Cliente General'),
            customerPhone: selectedCustomer ? selectedCustomer.phone : customerPhone.trim(),
            status: 'PAID'
        };

        SaleService.createSale(saleData).then(
            () => {
                setMessage("¡Venta realizada con éxito!");
                setCart([]);
                setPaymentMethod("CASH");
                setPaymentCurrency(baseCurrencyCode);
                setCustomerName("");
                setCustomerCedula("");
                setCustomerPhone("");
                setSelectedCustomer(null);
                setCustomerSearch("");
                // Refresh product stock
                ProductService.getPOSProducts().then(r => setProducts(r.data.products || r.data));
                setTimeout(() => setMessage(""), 3000);
            },
            (error) => {
                setMessage("Error al procesar la venta: " + error.response?.data?.message);
                setTimeout(() => setMessage(""), 3000);
            }
        );
    };

    const handleNewCustomerSubmit = (e) => {
        e.preventDefault();
        CustomerService.create(newCustomer).then(
            (response) => {
                const created = response.data;
                setCustomers([...customers, created]);
                setSelectedCustomer(created);
                setShowNewCustomerModal(false);
                setNewCustomer({ name: "", cedula: "", phone: "", email: "" });
                setMessage("✅ Cliente registrado y seleccionado.");
                setTimeout(() => setMessage(""), 3000);
            },
            (error) => {
                alert("Error al registrar cliente: " + (error.response?.data?.message || error.message));
            }
        );
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                <h2 className="mb-4">Control de Ventas (Carrito de compras)</h2>

                {message && <div className={`alert ${message.includes('éxito') ? 'alert-success' : 'alert-danger'}`}>{message}</div>}

                {/* Subscription Status Block */}
                {!canOperate && (
                    <Alert variant={subscriptionStatus === 'PAST_DUE' ? 'warning' : subscriptionStatus === 'SUSPENDED' ? 'danger' : 'info'}
                        className="d-flex align-items-center shadow-sm mb-4">
                        <div className="me-3">
                            {subscriptionStatus === 'SUSPENDED'
                                ? <FaLock size={32} className="text-danger" />
                                : <FaExclamationTriangle size={32} className={subscriptionStatus === 'PAST_DUE' ? 'text-warning' : 'text-info'} />
                            }
                        </div>
                        <div>
                            <h5 className="mb-1">
                                {subscriptionStatus === 'FREE' && 'Funcionalidad Premium'}
                                {subscriptionStatus === 'PAST_DUE' && 'Suscripción Vencida'}
                                {subscriptionStatus === 'SUSPENDED' && 'Cuenta Suspendida'}
                            </h5>
                            <p className="mb-0">
                                {subscriptionStatus === 'FREE' && 'El sistema de ventas está disponible solo para cuentas Premium. Mejora tu plan para acceder.'}
                                {subscriptionStatus === 'PAST_DUE' && 'Tu suscripción ha vencido. Renueva tu plan para continuar registrando ventas.'}
                                {subscriptionStatus === 'SUSPENDED' && 'Tu cuenta ha sido suspendida. Contacta al administrador para más información.'}
                            </p>
                        </div>
                    </Alert>
                )}

                <Row className="g-4" style={{ opacity: canOperate ? 1 : 0.5, pointerEvents: canOperate ? 'auto' : 'none' }}>
                    <Col md={7}>
                        <Card className="shadow-sm border-0 mb-4">
                            <Card.Body>
                                {/* === BARCODE SCANNER INPUT === */}
                                <div className={`mb-3 p-3 rounded-3 border-2 ${
                                    barcodeStatus === 'found' ? 'border border-success bg-success bg-opacity-10' :
                                    barcodeStatus === 'not_found' ? 'border border-danger bg-danger bg-opacity-10' :
                                    barcodeStatus === 'searching' ? 'border border-primary bg-primary bg-opacity-10' :
                                    'border border-secondary bg-light'
                                }`} style={{ transition: 'all 0.2s ease' }}>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <FaBarcode className={`
                                            ${barcodeStatus === 'found' ? 'text-success' :
                                              barcodeStatus === 'not_found' ? 'text-danger' :
                                              barcodeStatus === 'searching' ? 'text-primary' :
                                              'text-secondary'}
                                        `} size={20} />
                                        <span className="fw-bold small text-uppercase text-secondary">Lector de Código de Barras</span>
                                        {barcodeStatus === 'searching' && <Spinner animation="border" size="sm" variant="primary" />}
                                        {barcodeStatus === 'found' && <span className="badge bg-success ms-auto">✓ Producto agregado</span>}
                                        {barcodeStatus === 'not_found' && <span className="badge bg-danger ms-auto">✗ Código no encontrado</span>}
                                    </div>
                                    <InputGroup>
                                        <InputGroup.Text className={`border-end-0 ${
                                            barcodeStatus === 'found' ? 'bg-success text-white border-success' :
                                            barcodeStatus === 'not_found' ? 'bg-danger text-white border-danger' :
                                            'bg-white'
                                        }`}>
                                            <FaBarcode />
                                        </InputGroup.Text>
                                        <Form.Control
                                            ref={barcodeInputRef}
                                            placeholder="Escanear código de barras o ingresar y presionar Enter..."
                                            value={barcodeInput}
                                            onChange={handleBarcodeChange}
                                            onKeyDown={handleBarcodeKeyDown}
                                            className={`border-start-0 ${
                                                barcodeStatus === 'found' ? 'border-success' :
                                                barcodeStatus === 'not_found' ? 'border-danger' : ''
                                            }`}
                                            style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.05em' }}
                                        />
                                    </InputGroup>
                                    <small className="text-muted mt-1 d-block">
                                        Apunta el lector al código de barras del producto — se agrega automáticamente al carrito.
                                    </small>
                                </div>

                                {/* Regular text search */}
                                <InputGroup className="mb-3">
                                    <InputGroup.Text className="bg-white"><FaSearch /></InputGroup.Text>
                                    <Form.Control
                                        placeholder="Buscar por nombre o SKU..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>

                                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                    <Table hover responsive>
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Producto</th>
                                                <th>SKU</th>
                                                <th>Precio al Público</th>
                                                <th>Stock</th>
                                                <th>Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProducts.map(p => (
                                                <tr key={p.id}>
                                                    <td>{p.name}</td>
                                                    <td><small className="text-muted">{p.sku}</small></td>
                                                    <td>
                                                        <div>{baseCurrencySymbol}{p.price}</div>
                                                        {platformConfig?.enableSecondaryCurrency && (
                                                            <small className="text-success fw-bold">{formatSecondary(p.price)}</small>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${p.stock < 5 ? 'bg-danger' : 'bg-success'}`}>
                                                            {p.stock}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <OverlayTrigger
                                                            placement="left"
                                                            overlay={(props) => (
                                                                <Tooltip id={`tooltip-add-${p.id}`} {...props}>
                                                                    {p.stock < 1 ? "Producto sin stock disponible" : "Agregar este producto al carrito"}
                                                                </Tooltip>
                                                            )}
                                                        >
                                                            <span className="d-inline-block">
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    onClick={() => openQuantityModal(p)}
                                                                    disabled={p.stock < 1}
                                                                >
                                                                    <FaPlus /> Agregar
                                                                </Button>
                                                            </span>
                                                        </OverlayTrigger>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={5}>
                        <Card className="shadow-sm border-0 h-100">
                            <Card.Header className="bg-primary text-white py-3">
                                <h5 className="mb-0"><FaShoppingCart className="me-2" /> Registro de Salida</h5>
                            </Card.Header>
                            <Card.Body className="d-flex flex-column">
                                <ListGroup variant="flush" className="flex-grow-1 mb-3" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                                    {cart.map(item => (
                                        <ListGroup.Item key={item.product.id} className="border-0 px-0">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div className="flex-grow-1">
                                                    <h6 className="mb-1">{item.product.name}</h6>
                                                    <small className="text-muted">
                                                        {baseCurrencySymbol}{item.unitPrice} c/u
                                                        {platformConfig?.enableSecondaryCurrency && (
                                                            <span className="ms-2 text-success">({formatSecondary(item.unitPrice)})</span>
                                                        )}
                                                    </small>
                                                </div>
                                                <OverlayTrigger overlay={<Tooltip>Quitar del Carrito</Tooltip>}>
                                                    <Button variant="outline-danger" size="sm" onClick={() => removeFromCart(item.product.id)}>
                                                        <FaTrash />
                                                    </Button>
                                                </OverlayTrigger>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center">
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                                    >
                                                        -
                                                    </Button>
                                                    <Form.Control
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const v = parseInt(e.target.value, 10);
                                                            if (!isNaN(v)) updateCartQuantity(item.product.id, v);
                                                        }}
                                                        className="mx-2 text-center"
                                                        style={{ width: '70px' }}
                                                    />
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                                <div className="text-end">
                                                    <div className="fw-bold text-primary">${item.subtotal.toFixed(2)}</div>
                                                    {platformConfig?.enableSecondaryCurrency && (
                                                        <small className="text-success">{formatSecondary(item.subtotal)}</small>
                                                    )}
                                                </div>
                                            </div>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>

                                {cart.length === 0 && (
                                    <div className="text-center text-muted py-5">
                                        <FaShoppingCart size={50} className="opacity-25 mb-3" />
                                        <p>El carrito está vacío</p>
                                    </div>
                                )}

                                <div className="border-top pt-3">
                                    <div className="d-flex justify-content-between mb-3 align-items-end">
                                        <h4 className="mb-0">Total:</h4>
                                        <div className="text-end">
                                            {platformConfig?.enableSecondaryCurrency && (
                                                <h5 className="text-success mb-0">{formatSecondary(total)}</h5>
                                            )}
                                            <h4 className="text-primary mb-0">${total.toFixed(2)}</h4>
                                        </div>
                                    </div>

                                    <Form.Group className="mb-3">
                                        <Form.Label className="d-flex justify-content-between align-items-center">
                                            <span>Cliente</span>
                                            <Button variant="link" className="p-0 text-decoration-none small" onClick={() => setShowNewCustomerModal(true)}>
                                                <FaUserPlus className="me-1" /> Nuevo Cliente
                                            </Button>
                                        </Form.Label>

                                        <div className="position-relative">
                                            <InputGroup className="mb-2 shadow-sm">
                                                <InputGroup.Text className="bg-white border-end-0">
                                                    <FaSearch className="text-muted" />
                                                </InputGroup.Text>
                                                <Form.Control
                                                    placeholder="Buscar por cédula o nombre..."
                                                    className="border-start-0 ps-0"
                                                    value={customerSearch}
                                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                                />
                                            </InputGroup>

                                            {customerSearch.length > 0 && (
                                                <ListGroup className="position-absolute w-100 shadow-lg" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                                    <ListGroup.Item
                                                        action
                                                        className="text-primary fw-bold"
                                                        onClick={() => {
                                                            setSelectedCustomer(null);
                                                            setCustomerName("Cliente General");
                                                            setCustomerSearch("");
                                                        }}
                                                    >
                                                        <FaUserAlt className="me-2" /> Cliente General (Público)
                                                    </ListGroup.Item>
                                                    {customers
                                                        .filter(c =>
                                                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                                            (c.cedula && c.cedula.includes(customerSearch))
                                                        )
                                                        .map(c => (
                                                            <ListGroup.Item
                                                                key={c.id}
                                                                action
                                                                onClick={() => {
                                                                    setSelectedCustomer(c);
                                                                    setCustomerSearch("");
                                                                }}
                                                            >
                                                                <div className="fw-bold">{c.name}</div>
                                                                <small className="text-muted">{c.cedula ? `C.I: ${c.cedula}` : 'Sin ID'} | {c.phone || 'Sin telf.'}</small>
                                                            </ListGroup.Item>
                                                        ))
                                                    }
                                                </ListGroup>
                                            )}
                                        </div>

                                        <Card className="bg-light border-0 rounded-3 mb-2 shadow-sm">
                                            <Card.Body className="p-2 d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center">
                                                    <div className="bg-white rounded-circle p-2 me-2 shadow-sm text-primary">
                                                        {selectedCustomer ? <FaUserCheck /> : <FaUserAlt />}
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold" style={{ fontSize: '0.9rem' }}>
                                                            {selectedCustomer ? selectedCustomer.name : (customerName || "Cliente General")}
                                                        </div>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                                            {selectedCustomer
                                                                ? `${selectedCustomer.cedula || 'Sin ID'} | ${selectedCustomer.phone || '-'}`
                                                                : "Venta a público general"}
                                                        </small>
                                                    </div>
                                                </div>
                                                {(selectedCustomer || customerName) && (
                                                    <Button
                                                        variant="link"
                                                        className="text-danger p-0 ms-2"
                                                        onClick={() => {
                                                            setSelectedCustomer(null);
                                                            setCustomerName("");
                                                        }}
                                                    >
                                                        <FaTrash size={12} />
                                                    </Button>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Método de Pago</Form.Label>
                                        <Form.Select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="mb-2"
                                        >
                                            <option value="CASH">Efectivo 💵</option>
                                            <option value="CARD">Tarjeta 💳</option>
                                            <option value="TRANSFER">Transferencia 🏦</option>
                                        </Form.Select>
                                    </Form.Group>

                                    {availableCurrencies.length > 0 && (
                                        <Form.Group className="mb-3">
                                            <Form.Label className="d-flex align-items-center">
                                                <FaExchangeAlt className="me-2 text-info" /> Moneda de Cobro
                                            </Form.Label>
                                            <div className="d-flex gap-2 flex-wrap">
                                                <Button
                                                    variant={paymentCurrency === baseCurrencyCode ? 'primary' : 'outline-primary'}
                                                    size="sm"
                                                    onClick={() => setPaymentCurrency(baseCurrencyCode)}
                                                    className="rounded-pill px-3"
                                                >
                                                    {baseCurrencySymbol} {baseCurrencyCode}
                                                </Button>
                                                {availableCurrencies.map(c => (
                                                    <Button
                                                        key={c.code}
                                                        variant={paymentCurrency === c.code ? 'primary' : 'outline-primary'}
                                                        size="sm"
                                                        onClick={() => setPaymentCurrency(c.code)}
                                                        className="rounded-pill px-3"
                                                    >
                                                        {c.symbol} {c.code}
                                                    </Button>
                                                ))}
                                            </div>
                                            {paymentCurrency !== baseCurrencyCode && cart.length > 0 && (
                                                <div className="mt-2 p-2 bg-info bg-opacity-10 rounded-3 text-center">
                                                    <small className="text-muted">Cobrar al cliente:</small>
                                                    <div className="fw-bold fs-5 text-info">
                                                        {formatPaymentCurrency(total)}
                                                    </div>
                                                    <small className="text-muted">
                                                        Tasa: 1 {baseCurrencyCode} = {getSelectedCurrency()?.rate?.toLocaleString()} {paymentCurrency}
                                                    </small>
                                                </div>
                                            )}
                                        </Form.Group>
                                    )}

                                    <Button
                                        variant="success"
                                        size="lg"
                                        className="w-100"
                                        onClick={handleCheckout}
                                        disabled={cart.length === 0}
                                    >
                                        Realizar Venta {paymentCurrency !== baseCurrencyCode && cart.length > 0
                                            ? `(${formatPaymentCurrency(total)})`
                                            : ''}
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Quantity Modal */}
                <Modal show={showQuantityModal} onHide={() => setShowQuantityModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Cantidad a Agregar</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedProduct && (
                            <>
                                <h5>{selectedProduct.name}</h5>
                                <p className="text-muted">Precio al Público: {baseCurrencySymbol}{selectedProduct.price} | Stock disponible: {selectedProduct.stock}</p>
                                <Form.Group>
                                    <Form.Label>Cantidad</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max={selectedProduct.stock}
                                        value={inputQuantity}
                                        onChange={(e) => setInputQuantity(e.target.value)}
                                        autoFocus
                                        onKeyPress={(e) => e.key === 'Enter' && confirmAddToCart()}
                                    />
                                </Form.Group>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowQuantityModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={confirmAddToCart}>
                            Agregar al Carrito
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* New Customer Modal */}
                <Modal show={showNewCustomerModal} onHide={() => setShowNewCustomerModal(false)} centered>
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold"><FaUserPlus className="me-2 text-primary" />Registrar Nuevo Cliente</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleNewCustomerSubmit}>
                        <Modal.Body className="p-4">
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre Completo *</Form.Label>
                                <Form.Control
                                    required
                                    value={newCustomer.name}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                    placeholder="Ej: Juan Pérez"
                                />
                            </Form.Group>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Cédula / RIF</Form.Label>
                                        <Form.Control
                                            value={newCustomer.cedula}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, cedula: e.target.value })}
                                            placeholder="V-12345678"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Teléfono</Form.Label>
                                        <Form.Control
                                            value={newCustomer.phone}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                            placeholder="0412..."
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Correo Electrónico</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={newCustomer.email}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                    placeholder="correo@ejemplo.com"
                                />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer className="border-0">
                            <Button variant="light" onClick={() => setShowNewCustomerModal(false)}>
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit" className="px-4">
                                Guardar y Seleccionar
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </div>
        </div>
    );
};

export default POSPage;
