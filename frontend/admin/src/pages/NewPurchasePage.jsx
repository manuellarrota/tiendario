import React, { useState, useEffect, useRef, useMemo } from "react";
import Decimal from 'decimal.js';
import { Container, Row, Col, Table, Button, Form, Card, Alert, Modal, Badge, InputGroup } from "react-bootstrap";
import Sidebar from "../components/Sidebar";
import Layout from "../components/Layout";
import ProductService from "../services/product.service";
import SupplierService from "../services/supplier.service";
import PurchaseService from "../services/purchase.service";
import CategoryService from "../services/category.service";
import PublicService from "../services/public.service";
import { FaPlus, FaSave, FaTruck, FaBoxOpen, FaImage, FaSearch, FaTimes, FaExchangeAlt, FaTrash, FaBarcode } from "react-icons/fa";

const NewPurchasePage = () => {
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cart, setCart] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [message, setMessage] = useState("");

    // Multi-currency
    const [platformConfig, setPlatformConfig] = useState(null);
    const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
    const [paymentMethod, setPaymentMethod] = useState("CASH");

    // Item Form
    const [selectedProduct, setSelectedProduct] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unitCost, setUnitCost] = useState("");

    // Product Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    // New Supplier Modal
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState("");
    const [newSupplierTaxId, setNewSupplierTaxId] = useState("");
    const [newSupplierEmail, setNewSupplierEmail] = useState("");
    const [newSupplierPhone, setNewSupplierPhone] = useState("");
    const [newSupplierAddress, setNewSupplierAddress] = useState("");

    // New Product Modal State
    const [showProductModal, setShowProductModal] = useState(false);
    const [prodName, setProdName] = useState("");
    const [prodSku, setProdSku] = useState("");
    const [prodPrice, setProdPrice] = useState("");
    const [prodStock, setProdStock] = useState("");
    const [prodCategory, setProdCategory] = useState("");
    const [prodVariant, setProdVariant] = useState("");
    const [prodBrand, setProdBrand] = useState("");
    const [prodCostPrice, setProdCostPrice] = useState("");
    const [prodImageUrl, setProdImageUrl] = useState("");
    const [prodBarcode, setProdBarcode] = useState("");
    const [prodMinStock, setProdMinStock] = useState("5");
    const [isGeneratingSku, setIsGeneratingSku] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Helper to get full image URL
    const getFullImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return (import.meta.env.VITE_API_URL || '') + path;
    };

    // Predefined global categories
    const globalCategories = ["Ropa", "Tecnología", "Alimentos", "Hogar", "Deportes", "Salud y Belleza", "Juguetes", "Libros"];

    // Derived currency data
    const availableCurrencies = useMemo(() => {
        if (!platformConfig) return [];
        try {
            return JSON.parse(platformConfig.currencies || '[]').filter(c => c.enabled);
        } catch { return []; }
    }, [platformConfig]);

    const baseCurrencyCode = platformConfig?.baseCurrencyCode || 'USD';
    const baseCurrencySymbol = platformConfig?.baseCurrencySymbol || '$';

    const selectedCurrencyData = useMemo(() =>
        availableCurrencies.find(c => c.code === purchaseCurrency) || { rate: 1, symbol: baseCurrencySymbol, code: baseCurrencyCode },
        [availableCurrencies, purchaseCurrency, baseCurrencyCode, baseCurrencySymbol]
    );

    const exchangeRate = purchaseCurrency === baseCurrencyCode ? 1 : (selectedCurrencyData?.rate || 1);

    const convertToBase = (amount) => {
        if (purchaseCurrency === baseCurrencyCode) return new Decimal(amount).toDecimalPlaces(2);
        return new Decimal(amount).div(exchangeRate).toDecimalPlaces(2);
    };

    // Returns symbol for a stored item's currency code
    const getItemSymbol = (currencyCode) => {
        if (!currencyCode || currencyCode === baseCurrencyCode) return baseCurrencySymbol;
        const found = availableCurrencies.find(c => c.code === currencyCode);
        return found ? found.symbol : currencyCode;
    };

    const loadData = () => {
        ProductService.getAll().then(res => {
            const data = res.data;
            setProducts(Array.isArray(data) ? data : (data.products || data.content || []));
        });
        SupplierService.getAll().then(res => {
            const data = res.data;
            setSuppliers(Array.isArray(data) ? data : (data.suppliers || data.content || []));
        });
        CategoryService.getAll().then(res => setCategories(Array.isArray(res.data) ? res.data : []));
    };

    useEffect(() => {
        loadData();
        PublicService.getPlatformConfig().then(res => setPlatformConfig(res.data));
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Suggest SKU logic
    useEffect(() => {
        if (prodName.length > 2 && !prodSku && showProductModal) {
            const delayDebounceFn = setTimeout(() => {
                setIsGeneratingSku(true);
                ProductService.getSuggestedSku(prodName, prodCategory, prodVariant, prodBrand).then(
                    (response) => {
                        setProdSku(response.data.suggestedSku);
                        setIsGeneratingSku(false);
                    },
                    () => setIsGeneratingSku(false)
                );
            }, 800);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [prodName, prodCategory, prodVariant, prodBrand, showProductModal, prodSku]);



    const addToCart = () => {
        if (!selectedProduct || !quantity || !unitCost) return;
        const product = products.find(p => p.id === parseInt(selectedProduct));
        const unitCostDec = new Decimal(unitCost);
        const unitCostInBase = convertToBase(unitCostDec);
        const qty = parseInt(quantity);

        const existingItemIndex = cart.findIndex(item => item.product.id === product.id && item.currencyCode === purchaseCurrency);

        if (existingItemIndex > -1) {
            // Unify: Update existing item with new quantity and latest cost
            const newCart = [...cart];
            const existingItem = newCart[existingItemIndex];
            const newQty = existingItem.quantity + qty;
            
            existingItem.quantity = newQty;
            existingItem.unitCost = unitCostDec.toNumber();
            existingItem.unitCostInBaseCurrency = unitCostInBase.toNumber();
            existingItem.total = unitCostDec.times(newQty).toDecimalPlaces(2).toNumber();
            existingItem.subtotalInBaseCurrency = unitCostInBase.times(newQty).toDecimalPlaces(2).toNumber();
            
            setCart(newCart);
        } else {
            const subtotalInBase = unitCostInBase.times(qty).toDecimalPlaces(2);
            const newItem = {
                product: product,
                quantity: qty,
                unitCost: unitCostDec.toNumber(),
                unitCostInBaseCurrency: unitCostInBase.toNumber(),
                subtotalInBaseCurrency: subtotalInBase.toNumber(),
                total: unitCostDec.times(qty).toDecimalPlaces(2).toNumber(),
                currencyCode: purchaseCurrency,
                exchangeRate: exchangeRate
            };
            setCart([...cart, newItem]);
        }

        setSelectedProduct("");
        setSearchTerm("");
        setQuantity(1);
        setUnitCost("");
    };

    const removeFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const updateCartItem = (index, field, value) => {
        if (value < 0) return;
        const newCart = [...cart];
        const item = newCart[index];
        
        if (field === 'quantity') {
            item.quantity = parseInt(value) || 0;
        } else if (field === 'unitCost') {
            item.unitCost = parseFloat(value) || 0;
            // Recalculate base cost using the item's own exchange rate
            const costDec = new Decimal(item.unitCost);
            item.unitCostInBaseCurrency = costDec.div(item.exchangeRate || 1).toDecimalPlaces(2).toNumber();
        }

        // Recalculate totals
        const qtyDec = new Decimal(item.quantity);
        const costDec = new Decimal(item.unitCost);
        const baseCostDec = new Decimal(item.unitCostInBaseCurrency);

        item.total = costDec.times(qtyDec).toDecimalPlaces(2).toNumber();
        item.subtotalInBaseCurrency = baseCostDec.times(qtyDec).toDecimalPlaces(2).toNumber();

        setCart(newCart);
    };


    const handleCreateSupplier = (e) => {
        e.preventDefault();
        SupplierService.create({
            name: newSupplierName,
            taxId: newSupplierTaxId,
            email: newSupplierEmail,
            phone: newSupplierPhone,
            address: newSupplierAddress
        }).then(
            (response) => {
                setMessage("✅ Proveedor creado exitosamente");
                setShowSupplierModal(false);
                setNewSupplierName("");
                setNewSupplierTaxId("");
                setNewSupplierEmail("");
                setNewSupplierPhone("");
                setNewSupplierAddress("");
                loadData();
                setTimeout(() => setMessage(""), 3000);
                if (response.data && response.data.id) {
                    setSelectedSupplier(response.data.id);
                }
            },
            () => {
                setMessage("❌ Error creando proveedor");
                setTimeout(() => setMessage(""), 3000);
            }
        );
    };

    const handleCreateProduct = (e) => {
        e.preventDefault();
        const productData = {
            name: prodName,
            sku: prodSku,
            price: prodPrice,
            stock: prodStock,
            category: prodCategory,
            variant: prodVariant,
            brand: prodBrand,
            costPrice: prodCostPrice,
            imageUrl: prodImageUrl,
            barcode: prodBarcode.trim() || null,
            minStock: prodMinStock === "" ? 5 : parseInt(prodMinStock)
        };

        ProductService.create(productData).then(
            (response) => {
                setMessage("✅ Producto creado exitosamente");
                setShowProductModal(false);
                resetProductForm();
                loadData(); // Reload products
                setTimeout(() => setMessage(""), 3000);

                // Auto-select the new product
                if (response.data && response.data.id) {
                    const newProd = response.data;
                    setSelectedProduct(newProd.id);
                    const brandPart = newProd.brand ? ` [${newProd.brand}]` : '';
                    const variantPart = newProd.variant ? ` - ${newProd.variant}` : '';
                    setSearchTerm(`${newProd.name}${brandPart}${variantPart} (${newProd.sku})`);
                    // If created with cost price, use it as default
                    if (newProd.costPrice) setUnitCost(newProd.costPrice);
                }
            },
            (error) => {
                setMessage("❌ " + (error.translatedMessage || "Error creando producto."));
                setTimeout(() => setMessage(""), 5000);
            }
        );
    };

    const resetProductForm = () => {
        setProdName(""); setProdSku(""); setProdPrice(""); setProdStock(""); setProdCategory(""); setProdVariant(""); setProdBrand(""); setProdCostPrice(""); setProdImageUrl(""); setProdBarcode(""); setProdMinStock("5");
    };

    const handleSavePurchase = () => {
        if (!selectedSupplier) { alert("❌ Por favor, selecciona un proveedor antes de continuar."); return; }
        if (cart.length === 0) { alert("❌ El carrito de compra está vacío. Agrega al menos un producto."); return; }

        const totalInCurrency = cart.reduce((acc, item) => acc.plus(new Decimal(item.total)), new Decimal(0)).toDecimalPlaces(2);
        const totalInBase = cart.reduce((acc, item) => acc.plus(new Decimal(item.subtotalInBaseCurrency || item.total)), new Decimal(0)).toDecimalPlaces(2);

        const purchaseData = {
            supplierId: parseInt(selectedSupplier),
            currencyCode: purchaseCurrency,
            exchangeRate: exchangeRate,
            total: totalInCurrency.toNumber(),
            totalInBaseCurrency: totalInBase.toNumber(),
            paymentMethod: paymentMethod,
            items: cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                unitCost: item.unitCost,
                unitCostInBaseCurrency: item.unitCostInBaseCurrency,
                subtotalInBaseCurrency: item.subtotalInBaseCurrency
            }))
        };

        PurchaseService.create(purchaseData).then(
            () => {
                setMessage("✅ ¡Compra registrada y Stock actualizado!");
                setCart([]); setSelectedSupplier("");
                loadData();
            },
            (error) => {
                console.error("Error registrando compra", error);
                setMessage("❌ " + (error.translatedMessage || "Error registrando compra."));
                setTimeout(() => setMessage(""), 5000);
            }
        );
    };

    // Filter products for search
    const filteredProducts = products.filter(p => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(search) ||
            (p.brand && p.brand.toLowerCase().includes(search)) ||
            (p.variant && p.variant.toLowerCase().includes(search)) ||
            (p.sku && p.sku.toLowerCase().includes(search));
    });

    const selectProductFromList = (product) => {
        setSelectedProduct(product.id);
        const brandLabel = product.brand ? ` [${product.brand}]` : '';
        const variantLabel = product.variant ? ` - ${product.variant}` : '';
        const label = `${product.name}${brandLabel}${variantLabel} (${product.sku || 'No SKU'})`;
        setSearchTerm(label);
        setShowDropdown(false);
        // Pre-fill cost if available
        if (product.costPrice) setUnitCost(product.costPrice);
    };

    const handleUploadImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        ProductService.uploadImage(file).then(
            res => {
                setProdImageUrl(res.data.message); // Should contain path
                setIsUploading(false);
            },
            err => {
                console.error("Upload failed", err);
                setMessage("❌ Lo sentimos, no pudimos procesar la imagen.");
                setIsUploading(false);
                setTimeout(() => setMessage(""), 3500);
            }
        );
    };

    return (
        <Layout>
            <Container fluid className="py-2">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-dark fw-bold mb-0">Registro de Compras</h2>
                    <Button variant="primary" onClick={() => { resetProductForm(); setShowProductModal(true); }}>
                        <FaPlus className="me-2" /> Nuevo Producto
                    </Button>
                </div>

                {message && !showSupplierModal && !showProductModal && <Alert variant={message.includes("✅") ? "success" : message.includes("❌") ? "danger" : "info"} className="mb-4 shadow-sm border-0">{message}</Alert>}

                <Row>
                    <Col md={8}>
                        <Card className="border-0 shadow-sm p-4 mb-4">
                            <h5 className="mb-3">Lista de Productos a Ingresar</h5>
                            <Table responsive>
                                <thead className="bg-light">
                                    <tr>
                                        <th>Producto</th>
                                        <th className="text-center" style={{ width: '90px' }}>Cant.</th>
                                        <th className="text-start" style={{ width: '165px' }}>Costo Unit.</th>
                                        <th className="text-end">Subtotal</th>
                                        <th className="text-end text-success">Base ({baseCurrencyCode})</th>
                                        <th className="text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => {
                                        const itemSymbol = getItemSymbol(item.currencyCode);
                                        const isBase = !item.currencyCode || item.currencyCode === baseCurrencyCode;
                                        return (
                                        <tr key={idx}>
                                            <td>
                                                <div className="fw-bold text-dark">{item.product.name}</div>
                                                <div className="d-flex align-items-center gap-1 mt-1">
                                                    {item.product.variant && <Badge bg="light" text="dark" className="border small fw-normal">{item.product.variant}</Badge>}
                                                    {!isBase && <Badge bg="primary" className="small">{item.currencyCode}</Badge>}
                                                </div>
                                            </td>
                                            <td className="text-center pt-3" style={{ width: '90px' }}>
                                                <span className="fw-bold">{item.quantity}</span>
                                            </td>
                                            <td className="text-start pt-3" style={{ width: '165px' }}>
                                                <span className="fw-bold">{itemSymbol}{item.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </td>
                                            <td className="text-end fw-bold pt-3">{itemSymbol}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="text-end text-success small fw-bold pt-3">
                                                {baseCurrencySymbol}{(item.subtotalInBaseCurrency || item.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="text-center pt-2">
                                                <Button variant="link" className="text-danger p-0" onClick={() => removeFromCart(idx)}>
                                                    <FaTrash size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                            {cart.length === 0 && <p className="text-center text-muted my-3">Agrega productos a la orden</p>}

                            <div className="text-end mt-3">
                                {/* Always sum the base-currency subtotals — safe regardless of mixed currencies */}
                                <div className="text-muted small mb-1">
                                    {cart.length} producto(s) en la orden
                                </div>
                                <h4 className="mb-0 mt-1 text-success">
                                    Total Base: {baseCurrencySymbol}{cart.reduce((acc, item) => acc.plus(new Decimal(item.subtotalInBaseCurrency || item.total)), new Decimal(0)).toNumber().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}
                                </h4>
                            </div>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="border-0 shadow-sm p-4 mb-3">
                            <h5 className="mb-3">1. Datos Proveedor</h5>
                            <Form.Group className="mb-3">
                                <Form.Label>Seleccionar Proveedor</Form.Label>
                                <Form.Select
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                    disabled={cart.length > 0}
                                >
                                    <option value="">-- Elige un Proveedor --</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </Form.Select>
                                {cart.length > 0 && (
                                    <Form.Text className="text-warning fw-bold">
                                        🔒 Bloqueado. Guarda la compra para cambiar de proveedor.
                                    </Form.Text>
                                )}
                            </Form.Group>
                            <Button
                                variant="outline-success"
                                size="sm"
                                className="w-100"
                                disabled={cart.length > 0}
                                onClick={() => setShowSupplierModal(true)}
                            >
                                <FaTruck className="me-2" /> Crear Nuevo Proveedor
                            </Button>
                        </Card>

                        <Card className="border-0 shadow-sm p-4 mb-3">
                            <h5 className="mb-3">2. Moneda y Producto</h5>

                            {/* Currency Selector */}
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold d-flex align-items-center gap-2">
                                    <FaExchangeAlt className="text-primary" /> Moneda de la Factura
                                </Form.Label>
                                <Form.Select
                                    value={purchaseCurrency}
                                    onChange={e => setPurchaseCurrency(e.target.value)}
                                    className="border-primary"
                                    disabled={cart.length > 0}
                                >
                                    <option value={baseCurrencyCode}>{baseCurrencyCode} (Moneda Base)</option>
                                    {availableCurrencies.filter(c => c.code !== baseCurrencyCode).map(c => (
                                        <option key={c.code} value={c.code}>{c.code} – {c.name} (Tasa: {c.rate})</option>
                                    ))}
                                </Form.Select>
                                {cart.length > 0 ? (
                                    <Form.Text className="text-warning fw-bold">
                                        🔒 Bloqueado. Guarda la compra para cambiar la moneda.
                                    </Form.Text>
                                ) : (
                                    purchaseCurrency !== baseCurrencyCode && (
                                        <Form.Text className="text-success fw-bold">
                                            1 {baseCurrencyCode} = {exchangeRate} {purchaseCurrency}
                                        </Form.Text>
                                    )
                                )}
                            </Form.Group>

                            {/* Payment Method Selector */}
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold d-flex align-items-center gap-2">
                                    💳 Medio de Pago
                                </Form.Label>
                                <Form.Select
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    className="border-primary"
                                >
                                    <option value="CASH">💵 Efectivo / Cash</option>
                                    <option value="TRANSFER">🏦 Transferencia / Zelle</option>
                                    <option value="MOBILE_PAYMENT">📱 Pago Móvil</option>
                                    <option value="CARD">💳 Tarjeta (Débito/Crédito)</option>
                                </Form.Select>
                            </Form.Group>

                            {/* Custom Search Selector */}
                            <Form.Group className="mb-2 position-relative" ref={searchRef}>
                                <Form.Label>Buscar Producto</Form.Label>
                                <div className="position-relative">
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por Nombre, Variante o SKU..."
                                        value={searchTerm}
                                        onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); setSelectedProduct(""); }}
                                        onFocus={() => setShowDropdown(true)}
                                    />
                                    <div className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted">
                                        <FaSearch size={14} />
                                    </div>
                                </div>

                                {showDropdown && (
                                    <div className="position-absolute w-100 bg-white border shadow-lg rounded mt-1" style={{ zIndex: 1000, maxHeight: '250px', overflowY: 'auto' }}>
                                        {filteredProducts.length > 0 ? (
                                            filteredProducts.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="p-2 border-bottom cursor-pointer hover-bg-light"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => selectProductFromList(p)}
                                                >
                                                    <div className="fw-bold">{p.name}</div>
                                                    <div className="small text-muted d-flex justify-content-between">
                                                        <span>{p.variant || 'Estándar'}</span>
                                                        <span>SKU: {p.sku || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-muted">
                                                <p className="mb-2">No se encontraron productos</p>
                                                {searchTerm && (
                                                    <Button variant="outline-primary" size="sm" onClick={() => { setProdName(searchTerm); setShowProductModal(true); setShowDropdown(false); }}>
                                                        Crear "{searchTerm}"
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Form.Group>

                            <Row className="align-items-end g-2">
                                <Col xs={12}>
                                    <Form.Group className="mb-2">
                                        <Form.Label>Cantidad</Form.Label>
                                        <Form.Control type="number" onFocus={(e) => e.target.select()} min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                                    </Form.Group>
                                </Col>
                                <Col xs={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Costo por Unidad ({purchaseCurrency})</Form.Label>
                                        <InputGroup>
                                            <InputGroup.Text>{selectedCurrencyData.symbol}</InputGroup.Text>
                                            <Form.Control type="number" onFocus={(e) => e.target.select()} value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="0.00" />
                                        </InputGroup>
                                        {purchaseCurrency !== baseCurrencyCode && unitCost && (
                                            <Form.Text className="text-primary fw-bold">
                                                ≈ {baseCurrencySymbol}{Number(convertToBase(unitCost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {baseCurrencyCode}
                                                <span className="text-muted ms-2">(Tasa: {Number(exchangeRate).toLocaleString()})</span>
                                            </Form.Text>
                                        )}
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Button variant="outline-primary" className="w-100" onClick={addToCart}>
                                <FaPlus className="me-2" /> Agregar producto a Orden de Compra
                            </Button>
                        </Card>

                    </Col>
                </Row>
 
                {/* Floating Save Button - Replicating POS behavior */}
                {cart.length > 0 && (
                     <div className="pos-floating-checkout shadow-lg animate-in">
                        <Button 
                            className="btn-premium-checkout px-5" 
                            onClick={handleSavePurchase}
                        >
                            <FaSave className="me-2" /> 
                            GUARDAR COMPRA: {selectedCurrencyData.symbol}{cart.reduce((acc, item) => acc.plus(new Decimal(item.total)), new Decimal(0)).toNumber().toLocaleString(undefined, { minimumFractionDigits: 2 })} {purchaseCurrency} 
                            ({paymentMethod === 'CASH' ? 'Efectivo' : paymentMethod === 'TRANSFER' ? 'Transferencia' : paymentMethod === 'MOBILE_PAYMENT' ? 'Pago Móvil' : 'Tarjeta'})
                        </Button>
                     </div>
                )}
            </Container>

            {/* New Supplier Modal */}
            <Modal scrollable show={showSupplierModal} onHide={() => setShowSupplierModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold text-dark">
                        <FaTruck className="me-2" />Nuevo Proveedor
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {message && showSupplierModal && <Alert variant={message.includes("✅") ? "success" : message.includes("❌") ? "danger" : "info"} className="mb-4 shadow-sm border-0">{message}</Alert>}
                    <Form onSubmit={handleCreateSupplier}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre Empresa / Razón Social *</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={newSupplierName}
                                onChange={(e) => setNewSupplierName(e.target.value)}
                                placeholder="Ej: Distribuidora XYZ S.A."
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>RIF / ID Fiscal *</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={newSupplierTaxId}
                                onChange={(e) => setNewSupplierTaxId(e.target.value)}
                                placeholder="Ej: J-12345678-9"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                value={newSupplierEmail}
                                onChange={(e) => setNewSupplierEmail(e.target.value)}
                                placeholder="contacto@proveedor.com"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Teléfono / WhatsApp *</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={newSupplierPhone}
                                onChange={(e) => setNewSupplierPhone(e.target.value)}
                                placeholder="+58 412 0000000"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Dirección</Form.Label>
                            <Form.Control
                                type="text"
                                value={newSupplierAddress}
                                onChange={(e) => setNewSupplierAddress(e.target.value)}
                                placeholder="Av. Principal, Local 5, Ciudad"
                            />
                        </Form.Group>
                        <Button variant="success" type="submit" className="w-100 py-2">
                            <FaTruck className="me-2" />Crear y Seleccionar
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* New Product Modal */}
            <Modal scrollable show={showProductModal} onHide={() => { setShowProductModal(false); resetProductForm(); }} centered scrollable size="lg">
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold text-dark">Nuevo Producto</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {message && showProductModal && <Alert variant={message.includes("✅") ? "success" : message.includes("❌") ? "danger" : "info"} className="mb-4 shadow-sm border-0">{message}</Alert>}
                    <Form onSubmit={handleCreateProduct}>
                        <div className="row g-3">
                            {/* Basic Info */}
                            <div className="col-12">
                                <h6 className="text-primary fw-bold mb-3">Información Básica</h6>
                            </div>

                            <div className="col-md-8">
                                <Form.Group className="mb-3">
                                    <Form.Label>Nombre del Producto <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="text"
                                        required
                                        placeholder="Ej: Zapatillas Running"
                                        value={prodName}
                                        onChange={(e) => setProdName(e.target.value)}
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Variante / Presentación <small className="text-muted">(Opcional)</small></Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ej: Manzana, Naranja, XL, 500ml"
                                        value={prodVariant}
                                        onChange={(e) => setProdVariant(e.target.value)}
                                    />
                                    <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        Distingue versiones: <em>Jugo Del Valle → Manzana</em>
                                    </Form.Text>
                                </Form.Group>
                            </div>

                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Marca <small className="text-muted">(Opcional)</small></Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ej: Del Valle, Stanley, Adidas"
                                        value={prodBrand}
                                        onChange={(e) => setProdBrand(e.target.value)}
                                    />
                                    <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        Fabricante o marca del producto.
                                    </Form.Text>
                                </Form.Group>
                            </div>

                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Categoría <span className="text-danger">*</span></Form.Label>
                                    <Form.Select
                                        required
                                        value={prodCategory}
                                        onChange={(e) => setProdCategory(e.target.value)}
                                    >
                                        <option value="">Selecciona una categoría...</option>
                                        <optgroup label="Categorías Globales">
                                            {globalCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </optgroup>
                                        {categories.length > 0 && (
                                            <optgroup label="Tus Categorías">
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                        <option value="Otros">Otros</option>
                                    </Form.Select>
                                </Form.Group>
                            </div>

                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label className="d-flex justify-content-between">
                                        SKU (Código Interno) <span className="text-danger">*</span>
                                        {isGeneratingSku && <span className="spinner-border spinner-border-sm text-primary"></span>}
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        required
                                        value={prodSku}
                                        onChange={(e) => setProdSku(e.target.value)}
                                        placeholder="Generación automática..."
                                    />
                                    <Form.Text className="text-muted">Generado automáticamente por el sistema.</Form.Text>
                                </Form.Group>
                            </div>

                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label className="d-flex align-items-center gap-2">
                                        <FaBarcode className="text-secondary" /> Código de Barras
                                        <small className="text-muted fw-normal">(EAN-13, UPC — Opcional)</small>
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={prodBarcode}
                                        onChange={(e) => setProdBarcode(e.target.value)}
                                        placeholder="Escanear o ingresar código del fabricante"
                                    />
                                    <Form.Text className="text-muted">Se usa para búsqueda rápida en el POS con lector de barras.</Form.Text>
                                </Form.Group>
                            </div>

                            {/* Inventory & Pricing */}
                            <div className="col-12 mt-4">
                                <h6 className="text-primary fw-bold mb-3">Precios e Inventario</h6>
                            </div>

                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Costo de Compra ($) <small className="text-muted">(Privado)</small></Form.Label>
                                    <Form.Control type="number" onFocus={(e) => e.target.select()} step="0.01" value={prodCostPrice} onChange={(e) => setProdCostPrice(e.target.value)} min="0" placeholder="0.00" />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Precio de Venta ($) <span className="text-danger">*</span></Form.Label>
                                    <Form.Control type="number" onFocus={(e) => e.target.select()} step="0.01" required value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} min="0" placeholder="0.00" />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Ganancia Estimada (%)</Form.Label>
                                    <div className="d-flex align-items-center h-100 pb-1">
                                        <Badge bg={(prodPrice - prodCostPrice) > 0 ? "success" : "secondary"} className="p-2 w-100 fs-6 shadow-sm">
                                            ${(prodPrice - prodCostPrice || 0).toFixed(2)}
                                            <small className="ms-2 opacity-75">
                                                ({prodCostPrice > 0 ? (((prodPrice - prodCostPrice) / prodCostPrice) * 100).toFixed(1) : (prodPrice > 0 ? "100.0" : "0.0")}%)
                                            </small>
                                        </Badge>
                                    </div>
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Stock Inicial</Form.Label>
                                    <Form.Control type="number" onFocus={(e) => e.target.select()} required value={prodStock} onChange={(e) => setProdStock(e.target.value)} min="0" placeholder="Cantidad actual" />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Stock Mínimo (Alerta)</Form.Label>
                                    <Form.Control type="number" onFocus={(e) => e.target.select()} required value={prodMinStock} onChange={(e) => setProdMinStock(e.target.value)} min="0" placeholder="Ej: 5" />
                                </Form.Group>
                            </div>

                            {/* Media */}
                            <div className="col-12 mt-4">
                                <h6 className="text-primary fw-bold mb-3">Multimedia</h6>
                            </div>

                            <div className="col-12">
                                <Form.Group className="mb-3">
                                    <Form.Label>Imagen del Producto</Form.Label>
                                    <div className="d-flex flex-column gap-3">
                                        {/* File Upload Option */}
                                        <div className="d-flex align-items-center gap-2">
                                            <label className={`btn ${isUploading ? 'btn-secondary' : 'btn-outline-primary'} mb-0`}>
                                                {isUploading ? <span className="spinner-border spinner-border-sm me-2"></span> : <FaImage className="me-2" />}
                                                {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                                                <input type="file" hidden accept="image/*" onChange={handleUploadImage} disabled={isUploading} />
                                            </label>
                                            <span className="text-muted small">o pega una URL abajo</span>
                                        </div>

                                        {/* URL Input Option */}
                                        <div className="d-flex gap-3">
                                            <Form.Control
                                                type="text"
                                                value={prodImageUrl}
                                                onChange={(e) => setProdImageUrl(e.target.value)}
                                                placeholder="https://ejemplo.com/imagen.jpg o ruta/interna"
                                            />
                                            {prodImageUrl && (
                                                <div className="border rounded d-flex align-items-center justify-content-center bg-light" style={{ width: 80, height: 45, flexShrink: 0, overflow: 'hidden' }}>
                                                    <img src={getFullImageUrl(prodImageUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Form.Text className="text-muted">
                                        Recomendamos usar imágenes cuadradas (1:1) de menos de 2MB.
                                    </Form.Text>
                                </Form.Group>
                            </div>
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                            <Button variant="light" onClick={() => setShowProductModal(false)}>Cancelar</Button>
                            <Button variant="primary" type="submit" className="px-4">
                                Guardar Producto
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Layout>
    );
};

export default NewPurchasePage;
