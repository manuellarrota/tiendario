import React, { useState, useEffect, useRef, useMemo } from "react";
import Decimal from 'decimal.js';
import { Container, Row, Col, Table, Button, Form, Card, Alert, Modal, Badge, InputGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Layout from "../components/Layout";
import ProductService from "../services/product.service";
import SupplierService from "../services/supplier.service";
import PurchaseService from "../services/purchase.service";
import CategoryService from "../services/category.service";
import PublicService from "../services/public.service";
import { useToast } from "../components/ToastContext";
import { FaPlus, FaSave, FaTruck, FaBoxOpen, FaImage, FaSearch, FaTimes, FaExchangeAlt, FaTrash, FaBarcode } from "react-icons/fa";

const NewPurchasePage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cart, setCart] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [message, setMessage] = useState("");
    const toast = useToast();

    const [step, setStep] = useState(1);
    const [invoiceNumber, setInvoiceNumber] = useState("");

    // Multi-currency
    const [platformConfig, setPlatformConfig] = useState(null);
    const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
    const [paymentMethod, setPaymentMethod] = useState("CASH");

    // Item Form
    const [selectedProduct, setSelectedProduct] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unitCost, setUnitCost] = useState("");
    const [itemDiscountAmount, setItemDiscountAmount] = useState("");
    const [itemDiscountType, setItemDiscountType] = useState("PERCENTAGE");
    
    const [globalDiscountAmount, setGlobalDiscountAmount] = useState("");
    const [globalDiscountType, setGlobalDiscountType] = useState("PERCENTAGE");

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
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Price Alert Modal
    const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
    const [pendingCartItem, setPendingCartItem] = useState(null);

    // Success Summary Modal
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastPurchaseSummary, setLastPurchaseSummary] = useState(null);

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
        if (!selectedSupplier) {
            toast.showError("Por favor, selecciona un proveedor antes de agregar productos.");
            return;
        }
        if (!selectedProduct || !quantity || !unitCost) return;
        const product = products.find(p => p.id === parseInt(selectedProduct));
        const unitCostDec = new Decimal(unitCost);
        const qty = parseInt(quantity);
        const totalRaw = unitCostDec.times(qty).toNumber();
        
        let discountVal = 0;
        const discAmt = parseFloat(itemDiscountAmount);
        if (discAmt > 0) {
            if (itemDiscountType === 'PERCENTAGE') {
                discountVal = totalRaw * (discAmt / 100);
            } else {
                discountVal = discAmt;
            }
        }
        
        if (discountVal > totalRaw) discountVal = totalRaw;
        const totalAfterLineDiscount = totalRaw - discountVal;

        const unitCostInBase = convertToBase(totalAfterLineDiscount / qty);
        const subtotalInBase = convertToBase(totalAfterLineDiscount);

        const newItemData = {
            product: product,
            quantity: qty,
            unitCost: unitCostDec.toNumber(),
            discountAmount: discAmt > 0 ? discAmt : null,
            discountType: itemDiscountType,
            unitCostInBaseCurrency: Number(unitCostInBase),
            subtotalInBaseCurrency: Number(subtotalInBase),
            total: totalAfterLineDiscount,
            currencyCode: purchaseCurrency,
            exchangeRate: exchangeRate
        };

        // Price Alert Logic
        if (product.costPrice && product.costPrice > 0) {
            // Check if new cost is greater than recorded cost
            if (unitCostInBase.toNumber() > product.costPrice) {
                setPendingCartItem(newItemData);
                setShowPriceAlertModal(true);
                return; // Stop execution, wait for modal confirmation
            }
        }

        executeAddToCart(newItemData);
    };

    const confirmAddToCart = () => {
        if (pendingCartItem) {
            executeAddToCart(pendingCartItem);
        }
        setShowPriceAlertModal(false);
        setPendingCartItem(null);
    };

    const executeAddToCart = (newItemData) => {
        const existingItemIndex = cart.findIndex(item => item.product.id === newItemData.product.id && item.currencyCode === newItemData.currencyCode);

        if (existingItemIndex > -1) {
            // Unify: Update existing item with new quantity and latest cost
            const newCart = [...cart];
            const existingItem = newCart.splice(existingItemIndex, 1)[0];
            const newQty = existingItem.quantity + newItemData.quantity;
            
            const unitCostDec = new Decimal(newItemData.unitCost);
            const unitCostInBase = new Decimal(newItemData.unitCostInBaseCurrency);

            existingItem.quantity = newQty;
            existingItem.unitCost = unitCostDec.toNumber();
            existingItem.unitCostInBaseCurrency = unitCostInBase.toNumber();
            existingItem.total = unitCostDec.times(newQty).toDecimalPlaces(2).toNumber();
            existingItem.subtotalInBaseCurrency = unitCostInBase.times(newQty).toDecimalPlaces(2).toNumber();
            
            setCart([existingItem, ...newCart]);
        } else {
            setCart([newItemData, ...cart]);
        }

        setSelectedProduct("");
        setSearchTerm("");
        setQuantity(1);
        setUnitCost("");
        setItemDiscountAmount("");
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
                toast.showSuccess("Proveedor creado exitosamente");
                setShowSupplierModal(false);
                setNewSupplierName("");
                setNewSupplierTaxId("");
                setNewSupplierEmail("");
                setNewSupplierPhone("");
                setNewSupplierAddress("");
                loadData();
                if (response.data && response.data.id) {
                    setSelectedSupplier(response.data.id);
                }
            },
            () => {
                toast.showError("Error creando proveedor");
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
                toast.showSuccess("Producto creado exitosamente");
                setShowProductModal(false);
                resetProductForm();
                loadData(); // Reload products

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
                toast.showError(error.translatedMessage || "Error creando producto.");
            }
        );
    };

    const resetProductForm = () => {
        setProdName(""); setProdSku(""); setProdPrice(""); setProdStock(""); setProdCategory(""); setProdVariant(""); setProdBrand(""); setProdCostPrice(""); setProdImageUrl(""); setProdBarcode(""); setProdMinStock("5");
    };

    const startPurchaseProcess = () => {
        if (!selectedSupplier) { toast.showError("Por favor, selecciona un proveedor antes de continuar."); return; }
        if (cart.length === 0) { toast.showError("El carrito de compra está vacío. Agrega al menos un producto."); return; }
        setShowPaymentModal(true);
    };

    const handleSavePurchase = () => {
        if (!selectedSupplier || cart.length === 0) return;

        const preGlobalTotal = cart.reduce((acc, item) => acc + item.total, 0);
        let globalDiscountAmountCalc = 0;
        const globalDiscAmt = parseFloat(globalDiscountAmount);
        if (globalDiscAmt > 0) {
            if (globalDiscountType === 'PERCENTAGE') {
                globalDiscountAmountCalc = preGlobalTotal * (globalDiscAmt / 100);
            } else {
                globalDiscountAmountCalc = globalDiscAmt;
            }
            if (globalDiscountAmountCalc > preGlobalTotal) globalDiscountAmountCalc = preGlobalTotal;
        }
        
        const finalTotal = preGlobalTotal - globalDiscountAmountCalc;
        const discountRatio = preGlobalTotal > 0 ? finalTotal / preGlobalTotal : 1;

        const purchaseData = {
            supplierId: selectedSupplier,
            invoiceNumber: invoiceNumber.trim() || null,
            total: finalTotal,
            totalInBaseCurrency: Number(convertToBase(finalTotal)),
            currencyCode: purchaseCurrency,
            exchangeRate: exchangeRate,
            paymentMethod: paymentMethod,
            globalDiscountAmount: globalDiscAmt > 0 ? globalDiscAmt : null,
            globalDiscountType: globalDiscountType,
            items: cart.map(item => {
                const itemFinalTotal = item.total * discountRatio;
                const finalUnitCostInBase = Number(convertToBase(itemFinalTotal / item.quantity));
                
                return {
                    productId: item.product.id,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    discountAmount: item.discountAmount,
                    discountType: item.discountType,
                    unitCostInBaseCurrency: finalUnitCostInBase,
                    subtotalInBaseCurrency: Number(convertToBase(itemFinalTotal))
                };
            })
        };

        PurchaseService.create(purchaseData).then(
            () => {
                setLastPurchaseSummary({
                    invoiceNumber: purchaseData.invoiceNumber,
                    total: purchaseData.total,
                    totalInBaseCurrency: purchaseData.totalInBaseCurrency,
                    currencyCode: purchaseData.currencyCode,
                    paymentMethod: purchaseData.paymentMethod,
                    itemsCount: purchaseData.items.length,
                    supplierName: getSupplierName(),
                    globalDiscountAmountCalc: globalDiscountAmountCalc
                });
                setShowSuccessModal(true);

                setCart([]); setSelectedSupplier(""); setInvoiceNumber(""); setStep(1);
                setGlobalDiscountAmount("");
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

    const getSupplierName = () => {
        const s = suppliers.find(s => s.id === parseInt(selectedSupplier));
        return s ? s.name : '';
    };

    // Calculate totals for render
    const preGlobalTotal = cart.reduce((acc, item) => acc + item.total, 0);
    const globalDiscAmtNum = parseFloat(globalDiscountAmount) || 0;
    let globalDiscountCalcRender = 0;
    if (globalDiscAmtNum > 0) {
        if (globalDiscountType === 'PERCENTAGE') {
            globalDiscountCalcRender = preGlobalTotal * (globalDiscAmtNum / 100);
        } else {
            globalDiscountCalcRender = globalDiscAmtNum;
        }
        if (globalDiscountCalcRender > preGlobalTotal) globalDiscountCalcRender = preGlobalTotal;
    }
    const finalTotalRender = preGlobalTotal - globalDiscountCalcRender;
    const finalTotalBaseRender = Number(convertToBase(finalTotalRender));

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="display-6 fw-bold mb-0 text-gradient">Ingresar Mercancía</h2>
                    {step === 2 && (
                        <Button variant="primary" className="rounded-pill shadow-sm px-4 fw-bold" onClick={() => { resetProductForm(); setShowProductModal(true); }}>
                            <FaPlus className="me-2" /> Nuevo Producto
                        </Button>
                    )}
                </div>

                {message && !showSupplierModal && !showProductModal && <Alert variant={message.includes("✅") ? "success" : message.includes("❌") ? "danger" : "info"} className="mb-4 shadow-sm border-0">{message}</Alert>}

                <Modal 
                    show={step === 1} 
                    backdrop="static" 
                    keyboard={false} 
                    centered 
                    contentClassName="glass-card-admin border-0 shadow-lg rounded-4"
                >
                    <Modal.Header className="border-0 pb-0 pt-4 px-4">
                        <Modal.Title className="fw-black fs-3 text-primary">Iniciar Compra</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <p className="text-muted mb-4">Selecciona el proveedor, la moneda y el método de pago para comenzar a ingresar los productos.</p>
                        
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">1. Seleccionar Proveedor <span className="text-danger">*</span></Form.Label>
                            <div className="d-flex gap-2">
                                <Form.Select
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                    className="flex-grow-1"
                                >
                                    <option value="">-- Elige un Proveedor --</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </Form.Select>
                                <Button variant="outline-success" onClick={() => setShowSupplierModal(true)}>
                                    <FaPlus />
                                </Button>
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">2. Moneda de la Factura</Form.Label>
                            <Form.Select
                                value={purchaseCurrency}
                                onChange={e => setPurchaseCurrency(e.target.value)}
                            >
                                <option value={baseCurrencyCode}>{baseCurrencyCode} (Moneda Base)</option>
                                {availableCurrencies.filter(c => c.code !== baseCurrencyCode).map(c => (
                                    <option key={c.code} value={c.code}>{c.code} – {c.name} (Tasa: {Number(c.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-bold">3. Medio de Pago</Form.Label>
                            <Form.Select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                            >
                                <option value="CASH">💵 Efectivo / Cash</option>
                                <option value="TRANSFER">🏦 Transferencia / Zelle</option>
                                <option value="MOBILE_PAYMENT">📱 Pago Móvil</option>
                                <option value="CARD">💳 Tarjeta (Débito/Crédito)</option>
                            </Form.Select>
                        </Form.Group>

                        <div className="d-flex gap-2 mt-4">
                            <Button 
                                variant="outline-secondary" 
                                size="lg" 
                                className="w-50 fw-bold rounded-pill shadow-sm"
                                onClick={() => navigate('/admin/inventory')}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                variant="primary" 
                                size="lg" 
                                className="w-50 fw-bold rounded-pill shadow-sm"
                                disabled={!selectedSupplier}
                                onClick={() => setStep(2)}
                            >
                                COMENZAR ➔
                            </Button>
                        </div>
                        {!selectedSupplier && (
                            <div className="text-center text-danger small mt-2">
                                Debes seleccionar un proveedor para continuar.
                            </div>
                        )}
                    </Modal.Body>
                </Modal>

                <div style={{ opacity: step === 1 ? 0.3 : 1, pointerEvents: step === 1 ? 'none' : 'auto', filter: step === 1 ? 'blur(4px)' : 'none', transition: 'all 0.3s ease' }}>
                    <Card className="glass-card-admin border-0 shadow-sm p-4 mb-4 rounded-4 bg-primary bg-opacity-10">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <span className="me-4"><strong className="text-primary">Proveedor:</strong> {getSupplierName() || '---'}</span>
                                <span className="me-4"><strong className="text-primary">Moneda:</strong> {purchaseCurrency}</span>
                                <span><strong className="text-primary">Pago:</strong> {paymentMethod === 'CASH' ? 'Efectivo' : paymentMethod === 'TRANSFER' ? 'Transferencia' : paymentMethod === 'MOBILE_PAYMENT' ? 'Pago Móvil' : 'Tarjeta'}</span>
                            </div>
                            <Button variant="outline-primary" size="sm" className="rounded-pill px-3" onClick={() => setStep(1)}>
                                <FaExchangeAlt className="me-2" /> Editar Datos Base
                            </Button>
                        </div>
                    </Card>

                    <Row className="g-4">
                            <Col lg={8}>
                                <Card className="glass-card-admin border-0 shadow-sm p-4 mb-4 rounded-4 h-100">
                                    <h5 className="mb-4 fw-bold text-dark">Lista de Productos a Ingresar</h5>
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
                                                        <span className="fw-bold">{itemSymbol}{item.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </td>
                                                    <td className="text-end pt-3">
                                                        <div className="fw-bold">{itemSymbol}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        {item.discountAmount > 0 && (
                                                            <div className="text-warning small fw-bold" style={{ fontSize: '0.7rem' }}>
                                                                Desc: -{item.discountType === 'PERCENTAGE' ? `${item.discountAmount}%` : `${itemSymbol}${item.discountAmount}`}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="text-end text-success small fw-bold pt-3">
                                                        {baseCurrencySymbol}{(item.subtotalInBaseCurrency || item.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                                    <div className="text-end mt-3 border-top pt-3">
                                        <div className="text-muted small mb-2">
                                            {cart.length} producto(s) en la orden
                                        </div>
                                        <div className="d-flex justify-content-end mb-1">
                                            <span className="me-3 text-muted">Subtotal:</span>
                                            <span className="fw-bold">{selectedCurrencyData?.symbol}{preGlobalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        {globalDiscountCalcRender > 0 && (
                                            <div className="d-flex justify-content-end mb-1 text-warning">
                                                <span className="me-3 fw-bold">Descuento Global:</span>
                                                <span className="fw-bold">-{selectedCurrencyData?.symbol}{globalDiscountCalcRender.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <h4 className="mb-0 mt-2 text-success fw-black">
                                            Total a Pagar: {selectedCurrencyData?.symbol}{finalTotalRender.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {purchaseCurrency}
                                        </h4>
                                        {purchaseCurrency !== baseCurrencyCode && (
                                            <div className="text-muted small mt-1 fw-bold">
                                                Equivalente Base: {baseCurrencySymbol}{finalTotalBaseRender.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}
                                            </div>
                                        )}
                                    </div>

                                    {cart.length > 0 && (
                                        <>
                                            <hr className="my-4" />
                                            <Row className="justify-content-end g-3">
                                                <Col md={4}>
                                                    <Form.Group className="mb-0">
                                                        <Form.Label className="fw-bold text-muted small text-uppercase">Descuento Global</Form.Label>
                                                        <InputGroup>
                                                            <Form.Select style={{ flex: '0 0 95px' }} value={globalDiscountType} onChange={e => setGlobalDiscountType(e.target.value)}>
                                                                <option value="PERCENTAGE">%</option>
                                                                <option value="FIXED">{purchaseCurrency}</option>
                                                            </Form.Select>
                                                            <Form.Control
                                                                type="number"
                                                                placeholder="0"
                                                                value={globalDiscountAmount}
                                                                onChange={e => setGlobalDiscountAmount(e.target.value)}
                                                                className="border-primary bg-light"
                                                                onFocus={(e) => e.target.select()}
                                                            />
                                                        </InputGroup>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={5}>
                                                    <Form.Group className="mb-0">
                                                        <Form.Label className="fw-bold text-muted small text-uppercase">Nro de Factura <span className="fw-normal text-lowercase">(opcional)</span></Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            placeholder="Ej: FAC-00123"
                                                            value={invoiceNumber}
                                                            onChange={e => setInvoiceNumber(e.target.value)}
                                                            className="border-primary bg-light"
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                        </>
                                    )}
                                </Card>
                            </Col>

                            <Col lg={4}>
                                <Card className="glass-card-admin border-0 shadow-sm p-4 mb-3 rounded-4">
                                    <h5 className="mb-4 fw-bold text-dark">Agregar Producto</h5>

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
                                        <Col xs={6}>
                                            <Form.Group className="mb-2">
                                                <Form.Label className="small fw-bold">Cantidad</Form.Label>
                                                <Form.Control type="number" onFocus={(e) => e.target.select()} min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                                            </Form.Group>
                                        </Col>
                                        <Col xs={6}>
                                            <Form.Group className="mb-2">
                                                <Form.Label className="small fw-bold">Descuento <span className="text-muted fw-normal">(opcional)</span></Form.Label>
                                                <InputGroup size="sm">
                                                    <Form.Select style={{ flex: '0 0 95px' }} value={itemDiscountType} onChange={e => setItemDiscountType(e.target.value)}>
                                                        <option value="PERCENTAGE">%</option>
                                                        <option value="FIXED">{purchaseCurrency}</option>
                                                    </Form.Select>
                                                    <Form.Control type="number" onFocus={(e) => e.target.select()} placeholder="0" value={itemDiscountAmount} onChange={e => setItemDiscountAmount(e.target.value)} />
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                        <Col xs={12}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Costo Unitario ({purchaseCurrency})</Form.Label>
                                                <InputGroup>
                                                    <InputGroup.Text>{selectedCurrencyData.symbol}</InputGroup.Text>
                                                    <Form.Control type="number" onFocus={(e) => e.target.select()} value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="0.00" />
                                                </InputGroup>
                                                {purchaseCurrency !== baseCurrencyCode && unitCost && (
                                                    <Form.Text className="text-primary fw-bold">
                                                        ≈ {baseCurrencySymbol}{Number(convertToBase(unitCost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {baseCurrencyCode}
                                                        <span className="text-muted ms-2">(Tasa: {Number(exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                                    </Form.Text>
                                                )}
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Button variant="primary" className="w-100 py-2 rounded-pill fw-bold shadow-sm mt-3" onClick={addToCart} disabled={!selectedProduct || !quantity || !unitCost}>
                                        <FaPlus className="me-2" /> Agregar a la Orden
                                    </Button>
                                </Card>
                            </Col>
                    </Row>
                </div>
                {/* Floating Save Button - Replicating POS behavior */}
                {cart.length > 0 && (
                     <div className="pos-floating-checkout shadow-lg animate-in">
                        <Button 
                            className="btn-premium-checkout px-5" 
                            onClick={handleSavePurchase}
                        >
                            <FaSave className="me-2" /> 
                            GUARDAR COMPRA: {selectedCurrencyData.symbol}{finalTotalRender.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {purchaseCurrency} 
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
            <Modal scrollable show={showProductModal} onHide={() => { setShowProductModal(false); resetProductForm(); }} centered size="lg">
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

            {/* Price Alert Modal */}
            <Modal show={showPriceAlertModal} onHide={() => { setShowPriceAlertModal(false); setPendingCartItem(null); }} centered backdrop="static">
                <Modal.Header closeButton className="border-0 bg-warning bg-opacity-25">
                    <Modal.Title className="fw-bold text-dark d-flex align-items-center">
                        ⚠️ Alerta de Sobreprecio
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="mb-4">
                        El costo ingresado es <strong>mayor</strong> al último costo de adquisición registrado para este producto.
                    </p>
                    {pendingCartItem && (
                        <div className="bg-light p-3 rounded border mb-4">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Producto:</span>
                                <span className="fw-bold">{pendingCartItem.product.name}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Costo Anterior:</span>
                                <span className="fw-bold text-success">
                                    {baseCurrencySymbol}{pendingCartItem.product.costPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span className="text-muted">Nuevo Costo:</span>
                                <span className="fw-bold text-danger">
                                    {baseCurrencySymbol}{pendingCartItem.unitCostInBaseCurrency?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}
                                </span>
                            </div>
                        </div>
                    )}
                    <p className="text-muted small mb-0">
                        Si esto es un error tipográfico, por favor cancela. Si es un aumento real por parte del proveedor, confirma para continuar.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0 bg-light">
                    <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => { setShowPriceAlertModal(false); setPendingCartItem(null); }}>
                        Cancelar
                    </Button>
                    <Button variant="warning" className="rounded-pill px-4 fw-bold shadow-sm" onClick={confirmAddToCart}>
                        Sí, agregar de todas formas
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Success Modal */}
            <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered backdrop="static" className="modal-premium">
                <Modal.Body className="p-5 text-center">
                    <div className="mb-4 d-inline-block p-4 rounded-circle bg-success bg-opacity-10 text-success">
                        <FaBoxOpen size={50} />
                    </div>
                    <h2 className="fw-black mb-3 text-success">¡Compra Exitosa!</h2>
                    <p className="text-muted mb-4 lead">
                        La mercancía ha sido ingresada al inventario correctamente.
                    </p>

                    {lastPurchaseSummary && (
                        <Card className="border-0 bg-light rounded-4 p-4 text-start mb-4 shadow-sm">
                            <Row className="g-3">
                                <Col xs={6}>
                                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Proveedor</small>
                                    <div className="fw-bold text-dark">{lastPurchaseSummary.supplierName}</div>
                                </Col>
                                <Col xs={6}>
                                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Método de Pago</small>
                                    <div className="fw-bold text-dark">
                                        {lastPurchaseSummary.paymentMethod === 'CASH' ? 'Efectivo' : 
                                         lastPurchaseSummary.paymentMethod === 'TRANSFER' ? 'Transferencia' : 
                                         lastPurchaseSummary.paymentMethod === 'MOBILE_PAYMENT' ? 'Pago Móvil' : 'Tarjeta'}
                                    </div>
                                </Col>
                                {lastPurchaseSummary.invoiceNumber && (
                                    <Col xs={12}>
                                        <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Nro. Factura</small>
                                        <div className="fw-bold text-dark">{lastPurchaseSummary.invoiceNumber}</div>
                                    </Col>
                                )}
                                <Col xs={12}>
                                    <hr className="my-2 border-secondary opacity-25" />
                                </Col>
                                <Col xs={6}>
                                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Cant. Productos</small>
                                    <div className="fw-bold text-dark">{lastPurchaseSummary.itemsCount}</div>
                                </Col>
                                <Col xs={6} className="text-end">
                                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Total a Pagar</small>
                                    <h4 className="fw-bold text-success mb-0">
                                        {lastPurchaseSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {lastPurchaseSummary.currencyCode}
                                    </h4>
                                    {lastPurchaseSummary.currencyCode !== baseCurrencyCode && (
                                        <small className="text-muted fw-bold">
                                            Equiv: {baseCurrencySymbol}{lastPurchaseSummary.totalInBaseCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}
                                        </small>
                                    )}
                                </Col>
                            </Row>
                        </Card>
                    )}
                    <Button variant="primary" size="lg" className="rounded-pill px-5 fw-bold shadow-sm" onClick={() => setShowSuccessModal(false)}>
                        Continuar
                    </Button>
                </Modal.Body>
            </Modal>
        </Layout>
    );
};

export default NewPurchasePage;
