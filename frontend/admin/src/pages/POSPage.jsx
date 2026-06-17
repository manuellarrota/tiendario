import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Decimal from 'decimal.js';
import { Container, Row, Col, Card, Form, Button, ListGroup, InputGroup, Table, Modal, Alert, OverlayTrigger, Tooltip, Spinner, Badge, Toast, ToastContainer } from 'react-bootstrap';
import { FaSearch, FaPlus, FaMinus, FaTrash, FaShoppingCart, FaEdit, FaLock, FaExclamationTriangle, FaExchangeAlt, FaUserPlus, FaUserAlt, FaUserCheck, FaBarcode, FaHome, FaSignOutAlt, FaBell, FaHistory, FaCashRegister, FaTruck, FaBox, FaTags } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import ProductService from '../services/product.service';
import SaleService from '../services/sale.service';
import AuthService from '../services/auth.service';
import PublicService from '../services/public.service';
import CustomerService from '../services/customer.service';
import ShiftService from '../services/shift.service';
import CashRegisterService from '../services/cash-register.service';

const POSPage = () => {
    const navigate = useNavigate();
    // 1. STATE
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [message, setMessage] = useState("");
    
    // Discount State
    const [globalDiscountAmount, setGlobalDiscountAmount] = useState("");
    const [globalDiscountType, setGlobalDiscountType] = useState("PERCENTAGE");
    
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
    const [newCustomer, setNewCustomer] = useState({ name: "", cedula: "", phone: "", email: "", address: "" });
    const [showQuantityModal, setShowQuantityModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [inputQuantity, setInputQuantity] = useState('1');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeStatus, setBarcodeStatus] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState("success");

    // Shift Control State
    const [currentShift, setCurrentShift] = useState(null);
    const [showShiftOpeningModal, setShowShiftOpeningModal] = useState(false);
    const [showShiftClosingModal, setShowShiftClosingModal] = useState(false);
    const [cashRegisters, setCashRegisters] = useState([]);
    const [selectedCashRegister, setSelectedCashRegister] = useState("");
    const [openingDeclarations, setOpeningDeclarations] = useState([]);
    const [tempOpeningDeclaration, setTempOpeningDeclaration] = useState({ amount: "", currencyCode: "USD" });
    const [closingData, setClosingData] = useState({
        declarations: [],
        observation: ""
    });
    const [tempDeclaration, setTempDeclaration] = useState({
        amount: "",
        currencyCode: "USD",
        method: "CASH"
    });
    
    // Custom Modals State
    const [showEmptyCartModal, setShowEmptyCartModal] = useState(false);
    const [showCloseZeroModal, setShowCloseZeroModal] = useState(false);

    // Cash Movements State
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [movementType, setMovementType] = useState('INJECTION');
    const [movementAmount, setMovementAmount] = useState('');
    const [movementCurrency, setMovementCurrency] = useState('USD');
    const [movementDesc, setMovementDesc] = useState('');
    const [transferTargetId, setTransferTargetId] = useState('');

    // Parked Sales State
    const [parkedSales, setParkedSales] = useState(() => {
        try {
            const saved = localStorage.getItem('pos_parked_sales');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [showParkedModal, setShowParkedModal] = useState(false);

    useEffect(() => {
        localStorage.setItem('pos_parked_sales', JSON.stringify(parkedSales));
    }, [parkedSales]);

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

    const formatInCurrency = (amount, currencyCode) => {
        const curr = availableCurrencies.find(c => c.code === currencyCode);
        if (!curr) return null;
        const converted = new Decimal(amount).times(curr.rate).toNumber();
        const decimals = currencyCode === 'COP' ? 0 : 2;
        return `${curr.symbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    };

    const formatSecondary = (amount) => formatInCurrency(amount, 'VES');

    const getSelectedCurrency = useCallback(() => availableCurrencies.find(c => c.code === paymentCurrency), [availableCurrencies, paymentCurrency]);

    const convertToPaymentCurrency = useCallback((amount) => {
        if (paymentCurrency === baseCurrencyCode) return amount;
        const curr = getSelectedCurrency();
        return curr ? new Decimal(amount).times(curr.rate).toNumber() : amount;
    }, [paymentCurrency, baseCurrencyCode, getSelectedCurrency]);

    const formatPaymentCurrency = (amount) => {
        const converted = convertToPaymentCurrency(amount);
        const curr = getSelectedCurrency() || { symbol: baseCurrencySymbol };
        return `${curr.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const preGlobalTotal = useMemo(() => {
        return cart.reduce((acc, item) => acc.plus(new Decimal(item.subtotal || 0)), new Decimal(0)).toDecimalPlaces(2);
    }, [cart]);

    const total = useMemo(() => {
        let globalDiscCalc = new Decimal(0);
        const gAmount = parseFloat(globalDiscountAmount);
        if (gAmount > 0) {
            if (globalDiscountType === 'PERCENTAGE') {
                globalDiscCalc = preGlobalTotal.times(gAmount).div(100);
            } else {
                globalDiscCalc = new Decimal(gAmount);
            }
            if (globalDiscCalc.gt(preGlobalTotal)) globalDiscCalc = preGlobalTotal;
        }
        return preGlobalTotal.minus(globalDiscCalc).toDecimalPlaces(2);
    }, [preGlobalTotal, globalDiscountAmount, globalDiscountType]);

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
                const newQty = existing.quantity + qty;
                const totalRaw = new Decimal(newQty).times(foundProduct.price);
                let discVal = new Decimal(0);
                if (existing.discountAmount > 0) {
                    discVal = existing.discountType === 'PERCENTAGE' 
                        ? totalRaw.times(existing.discountAmount).div(100) 
                        : new Decimal(existing.discountAmount);
                }
                if (discVal.gt(totalRaw)) discVal = totalRaw;
                const newSubtotal = totalRaw.minus(discVal).toDecimalPlaces(2).toString();

                return prev.map(item =>
                    item.product.id === foundProduct.id
                        ? { ...item, quantity: newQty, subtotal: newSubtotal }
                        : item
                );
            }
            const subtotal = new Decimal(qty).times(foundProduct.price).toDecimalPlaces(2).toString();
            return [...prev, { product: foundProduct, quantity: qty, unitPrice: foundProduct.price, subtotal, discountAmount: 0, discountType: 'PERCENTAGE' }];
        });
    }, [triggerToast]);

    const totalPaidInBase = useMemo(() => {
        return payments.reduce((acc, p) => acc.plus(new Decimal(p.amountInBaseCurrency || 0)), new Decimal(0)).toDecimalPlaces(2);
    }, [payments]);

    const remainingToPay = useMemo(() => {
        const res = total.minus(totalPaidInBase).toDecimalPlaces(2);
        return res.gt(0) ? res : new Decimal(0);
    }, [total, totalPaidInBase]);

    const handleCheckout = useCallback(() => {
        if (cart.length === 0 || totalPaidInBase.lt(total)) return;
        
        const preGlobalTotalFloat = parseFloat(preGlobalTotal.toString());
        let globalDiscountAmountCalc = 0;
        const globalDiscAmt = parseFloat(globalDiscountAmount);
        if (globalDiscAmt > 0) {
            if (globalDiscountType === 'PERCENTAGE') {
                globalDiscountAmountCalc = preGlobalTotalFloat * (globalDiscAmt / 100);
            } else {
                globalDiscountAmountCalc = globalDiscAmt;
            }
            if (globalDiscountAmountCalc > preGlobalTotalFloat) globalDiscountAmountCalc = preGlobalTotalFloat;
        }

        const saleData = {
            items: cart.map(item => ({
                product: { id: item.product.id },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountAmount: item.discountAmount > 0 ? item.discountAmount : null,
                discountType: item.discountType,
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
            customerEmail: selectedCustomer ? selectedCustomer.email : null,
            customerPhone: selectedCustomer ? selectedCustomer.phone : null,
            customerCedula: selectedCustomer ? selectedCustomer.cedula : null,
            status: 'PAID',
            globalDiscountAmount: globalDiscAmt > 0 ? globalDiscAmt : null,
            globalDiscountType: globalDiscountType,
            totalAmount: total.toNumber()
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

    const handleParkSale = useCallback(() => {
        if (cart.length === 0) return;
        const newParked = {
            id: Date.now(),
            date: new Date().toLocaleTimeString(),
            cart: [...cart],
            customer: selectedCustomer,
            customerSearch: customerSearch,
            payments: [...payments],
            total: total.toNumber()
        };
        setParkedSales(prev => [...prev, newParked]);
        setCart([]);
        setPayments([]);
        setSelectedCustomer(null);
        setCustomerSearch("");
        triggerToast("Venta puesta en espera (aparcada)", "info");
    }, [cart, selectedCustomer, customerSearch, payments, total, triggerToast]);

    const handleRestoreSale = useCallback((parked) => {
        if (cart.length > 0) {
            triggerToast("Por favor vacía o aparca la venta actual primero", "error");
            return;
        }
        setCart(parked.cart);
        setSelectedCustomer(parked.customer);
        setCustomerSearch(parked.customerSearch);
        setPayments(parked.payments || []);
        setParkedSales(prev => prev.filter(p => p.id !== parked.id));
        setShowParkedModal(false);
        triggerToast("Venta recuperada", "success");
    }, [cart, triggerToast]);

    const handleCashMovement = (e) => {
        e.preventDefault();
        if (!movementAmount || movementAmount <= 0) return;
        
        const rate = availableCurrencies.find(c => c.code === movementCurrency)?.rate || 1;
        const payload = {
            type: movementType,
            amount: movementAmount,
            currencyCode: movementCurrency,
            exchangeRate: rate,
            description: movementDesc
        };

        const updateCurrentShift = () => {
            ShiftService.getCurrentShift().then((res) => {
                if (res.status === 200 && res.data) {
                    setCurrentShift(res.data);
                }
            });
        };

        if (movementType === 'TRANSFER') {
            if (!transferTargetId) {
                triggerToast("Selecciona la caja destino", "error");
                return;
            }
            payload.toCashRegisterId = transferTargetId;
            ShiftService.transferCash(currentShift.id, payload).then(() => {
                triggerToast("Transferencia realizada");
                setShowMovementModal(false);
                setMovementAmount('');
                setMovementDesc('');
                updateCurrentShift();
            }).catch(e => triggerToast(e.message || "Error al transferir", "error"));
        } else {
            ShiftService.registerCashMovement(currentShift.id, payload).then(() => {
                triggerToast("Movimiento registrado");
                setShowMovementModal(false);
                setMovementAmount('');
                setMovementDesc('');
                updateCurrentShift();
            }).catch(e => triggerToast(e.message || "Error al registrar movimiento", "error"));
        }
    };

    const addPaymentPart = () => {
        const amount = new Decimal(tempPayment.amount || 0);
        if (amount.isNaN() || amount.lte(0)) return;

        const curr = availableCurrencies.find(c => c.code === tempPayment.currency) || { rate: 1, symbol: "$" };
        const rate = new Decimal(tempPayment.currency === baseCurrencyCode ? 1 : curr.rate);
        const amountInBase = tempPayment.currency === baseCurrencyCode ? amount : amount.div(rate);

        const newP = {
            ...tempPayment,
            amount: amount.toDecimalPlaces(2).toNumber(),
            exchangeRate: rate.toNumber(),
            amountInBaseCurrency: amountInBase.toDecimalPlaces(2).toString(),
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

    const recalculateSubtotal = (quantity, unitPrice, discountAmount, discountType) => {
        if (quantity === "" || quantity < 1) return "0.00";
        const totalRaw = new Decimal(quantity).times(unitPrice);
        let discVal = new Decimal(0);
        if (discountAmount > 0) {
            discVal = discountType === 'PERCENTAGE' 
                ? totalRaw.times(discountAmount).div(100) 
                : new Decimal(discountAmount);
        }
        if (discVal.gt(totalRaw)) discVal = totalRaw;
        return totalRaw.minus(discVal).toDecimalPlaces(2).toString();
    };

    const updateCartQuantity = (productId, newQuantity) => {
        if (newQuantity === "") {
            setCart(cart.map(item =>
                item.product.id === productId
                    ? { ...item, quantity: "", subtotal: "0.00" }
                    : item
            ));
            return;
        }
        if (newQuantity < 1) return;
        const product = products.find(p => p.id === productId);
        if (newQuantity > (product?.stock || 0)) {
            triggerToast(`Stock máximo: ${product?.stock}`, "error");
            return;
        }
        setCart(cart.map(item =>
            item.product.id === productId
                ? { 
                    ...item, 
                    quantity: newQuantity, 
                    subtotal: recalculateSubtotal(newQuantity, item.unitPrice, item.discountAmount, item.discountType)
                  }
                : item
        ));
    };

    const updateCartDiscount = (productId, amount, type) => {
        setCart(cart.map(item =>
            item.product.id === productId
                ? { 
                    ...item, 
                    discountAmount: amount, 
                    discountType: type,
                    subtotal: recalculateSubtotal(item.quantity, item.unitPrice, amount, type)
                  }
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
                setNewCustomer({ name: "", cedula: "", phone: "", email: "", address: "" });
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
        
        // Verifica el turno de caja
        ShiftService.getCurrentShift().then(
            (res) => {
                if (res.status === 200 && res.data) {
                    setCurrentShift(res.data);
                } else {
                    CashRegisterService.getAvailableRegisters().then(r => setCashRegisters(r.data.sort((a,b) => (a.name||'').localeCompare(b.name||'', undefined, {numeric: true}))));
                    setShowShiftOpeningModal(true);
                }
            },
            () => {
                CashRegisterService.getAvailableRegisters().then(r => setCashRegisters(r.data.sort((a,b) => (a.name||'').localeCompare(b.name||'', undefined, {numeric: true}))));
                setShowShiftOpeningModal(true);
            }
        );

        setTimeout(() => document.querySelector('.pos-search-input')?.focus(), 500);
    }, []);

    const handleOpenShift = () => {
        let finalDeclarations = [...openingDeclarations];
        // Autocompletar si el usuario escribió un monto pero olvidó darle al botón '+'
        if (tempOpeningDeclaration.amount && parseFloat(tempOpeningDeclaration.amount) > 0) {
            finalDeclarations.push({ ...tempOpeningDeclaration, id: Date.now() });
        }

        if (!selectedCashRegister) {
            triggerToast("Por favor, selecciona una caja disponible.", "error");
            return;
        }

        if (finalDeclarations.length === 0) {
            triggerToast("Por favor, ingresa al menos un monto para el fondo de caja.", "error");
            return;
        }

        const payload = {
            cashRegisterId: selectedCashRegister,
            openingDeclarations: finalDeclarations.map(d => ({
                method: "CASH",
                currencyCode: d.currencyCode,
                declaredAmount: parseFloat(d.amount),
                exchangeRate: availableCurrencies.find(c => c.code === d.currencyCode)?.rate || 1
            }))
        };

        ShiftService.openShift(0, payload).then(res => {
            setCurrentShift(res.data);
            setShowShiftOpeningModal(false);
            triggerToast("¡Caja abierta exitosamente!");
            setOpeningDeclarations([]);
            setTempOpeningDeclaration({ amount: "", currencyCode: "USD" });
        }).catch(err => {
            const errorMsg = err.response && err.response.data && err.response.data.message ? err.response.data.message : "Error al abrir caja";
            triggerToast(errorMsg, "error");
        });
    };

    const addOpeningDeclaration = () => {
        const amt = parseFloat(tempOpeningDeclaration.amount);
        if (isNaN(amt) || amt <= 0) {
            triggerToast("Monto inválido", "error");
            return;
        }
        setOpeningDeclarations([...openingDeclarations, { ...tempOpeningDeclaration, id: Date.now() }]);
        setTempOpeningDeclaration({ ...tempOpeningDeclaration, amount: "" });
    };

    const removeOpeningDeclaration = (id) => {
        setOpeningDeclarations(openingDeclarations.filter(d => d.id !== id));
    };

    const addDeclaration = () => {
        const amt = parseFloat(tempDeclaration.amount);
        if (isNaN(amt) || amt <= 0) {
            triggerToast("Monto inválido", "error");
            return;
        }
        setClosingData({
            ...closingData,
            declarations: [...closingData.declarations, { ...tempDeclaration, id: Date.now() }]
        });
        setTempDeclaration({ ...tempDeclaration, amount: "" });
    };

    const removeDeclaration = (id) => {
        setClosingData({
            ...closingData,
            declarations: closingData.declarations.filter(d => d.id !== id)
        });
    };

    const executeCloseShift = () => {
        const payload = {
            declarations: closingData.declarations.map(d => ({
                method: d.method,
                currencyCode: d.currencyCode,
                declaredAmount: parseFloat(d.amount),
                exchangeRate: availableCurrencies.find(c => c.code === d.currencyCode)?.rate || 1
            })),
            observation: closingData.observation
        };

        ShiftService.closeShift(currentShift.id, payload).then(() => {
            triggerToast("Caja cerrada. Gracias por tu jornada.");
            setCurrentShift(null);
            setShowShiftClosingModal(false);
            CashRegisterService.getAvailableRegisters().then(r => setCashRegisters(r.data.sort((a,b) => (a.name||'').localeCompare(b.name||'', undefined, {numeric: true}))));
            setShowShiftOpeningModal(true); // Requiere abrir una nueva si quiere seguir
            // Reset form
            setClosingData({ declarations: [], observation: "" });
        }).catch(err => {
            const errorMsg = err.response && err.response.data && err.response.data.message ? err.response.data.message : "Error al cerrar caja";
            triggerToast(errorMsg, "error");
        });
    };

    const handleCloseShift = () => {
        if (closingData.declarations.length === 0) {
            setShowCloseZeroModal(true);
            return;
        }
        executeCloseShift();
    };

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'F1') { e.preventDefault(); document.querySelector('.pos-search-input')?.focus(); }
            else if (e.key === 'F2') { e.preventDefault(); setCustomerSearch(" "); }
            else if (e.key === 'F4') { e.preventDefault(); if (cart.length > 0) setShowPaymentModal(true); }
            else if (e.key === 'Escape') {
                if (showPaymentModal) setShowPaymentModal(false);
                else if (cart.length > 0) setShowEmptyCartModal(true);
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

                {subscriptionStatus === 'PAST_DUE' ? (
                    <Alert variant="warning" className="shadow-sm mb-4">
                        <FaExclamationTriangle className="me-2" /> Tu suscripción ha vencido. Por favor, realiza el pago para reactivar las ventas.
                    </Alert>
                ) : subscriptionStatus === 'SUSPENDED' ? (
                    <Alert variant="danger" className="shadow-sm mb-4">
                        <FaExclamationTriangle className="me-2" /> Cuenta suspendida. Contacta a soporte.
                    </Alert>
                ) : null}

                {currentShift && (
                    <Alert variant="info" className="d-flex justify-content-between align-items-center shadow-sm mb-4 py-2 border-0 bg-primary bg-opacity-10 text-primary flex-wrap gap-2">
                        <span><FaCashRegister className="me-2" /> {currentShift.cashRegister?.name || 'Caja'}, Abierta por: <strong>{user?.username}</strong> - Iniciada a las {new Date(currentShift.startTime).toLocaleTimeString()}</span>
                        <div className="d-flex gap-2">
                            <Button variant="primary" size="sm" onClick={() => {
                                CashRegisterService.getAllRegisters().then(r => setCashRegisters(r.data));
                                setShowMovementModal(true);
                            }}>💵 Movimientos de Caja</Button>
                            <Button variant="outline-primary" size="sm" onClick={() => setShowShiftClosingModal(true)}>Finalizar Turno / Cerrar Caja</Button>
                        </div>
                    </Alert>
                )}

                <Row className="g-4" style={{ opacity: (canOperate && currentShift) ? 1 : 0.5, pointerEvents: (canOperate && currentShift) ? 'auto' : 'none' }}>
                    {/* Column 1: LARGE CART DETAIL (Left) */}
                    <Col lg={8}>
                        <div className="pos-receipt-container bg-white shadow-sm rounded-4 d-flex flex-column" style={{ height: 'calc(100vh - 40px)' }}>
                            <div className="pos-receipt-header border-bottom p-3">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="fw-bold mb-0">Detalle de la Venta</h4>
                                    <div className="d-flex align-items-center gap-2">
                                        {parkedSales.length > 0 && (
                                            <Button variant="warning" size="sm" className="rounded-pill fw-bold" onClick={() => setShowParkedModal(true)}>
                                                ⏸️ Ventas en Espera ({parkedSales.length})
                                            </Button>
                                        )}
                                        {cart.length > 0 && (
                                            <Button variant="outline-secondary" size="sm" className="rounded-pill fw-bold" onClick={handleParkSale}>
                                                ⏸️ Aparcar
                                            </Button>
                                        )}
                                        <Badge bg="primary" className="rounded-pill px-3 py-2">{cart.length} productos</Badge>
                                    </div>
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
                                                        type="number" onFocus={(e) => e.target.select()}
                                                        size="sm"
                                                        className="text-center fw-bold border shadow-sm mx-1 no-spinner"
                                                        style={{ width: '80px', borderRadius: '8px' }}
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            if (e.target.value === "") {
                                                                updateCartQuantity(item.product.id, "");
                                                            } else {
                                                                const val = parseInt(e.target.value, 10);
                                                                if (!isNaN(val)) updateCartQuantity(item.product.id, val);
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            if (item.quantity === "" || item.quantity < 1) {
                                                                updateCartQuantity(item.product.id, 1);
                                                            }
                                                        }}
                                                        min="1"
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ width: '20%' }} className="text-end text-muted d-flex flex-column align-items-end justify-content-center">
                                                <div className="fw-bold">{baseCurrencySymbol}{new Decimal(item.unitPrice || 0).toFixed(2)}</div>
                                                <div className="mt-1 d-flex gap-1" style={{ width: '90px' }}>
                                                    <Form.Select 
                                                        size="sm" 
                                                        className="p-0 text-center" 
                                                        style={{ width: '35px', fontSize: '0.7rem' }}
                                                        value={item.discountType || 'PERCENTAGE'}
                                                        onChange={(e) => updateCartDiscount(item.product.id, item.discountAmount || 0, e.target.value)}
                                                    >
                                                        <option value="PERCENTAGE">%</option>
                                                        <option value="FIXED">$</option>
                                                    </Form.Select>
                                                    <Form.Control 
                                                        size="sm" 
                                                        type="number" 
                                                        placeholder="Desc" 
                                                        style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                                                        value={item.discountAmount || ""}
                                                        onChange={(e) => updateCartDiscount(item.product.id, e.target.value, item.discountType || 'PERCENTAGE')}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ width: '20%' }} className="text-end">
                                                <span className="fw-bold text-primary fs-5">{baseCurrencySymbol}{new Decimal(item.subtotal || 0).toFixed(2)}</span>
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
                            
                                <div className="flex-grow-1 overflow-auto pe-1">
                                    {filteredProducts.map(p => (
                                        <div
                                            key={p.id}
                                            className="d-flex align-items-center justify-content-between border rounded-3 px-3 py-2 mb-2 bg-white hover-shadow"
                                            style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                                            onClick={() => addProductToCartById(p)}
                                        >
                                            <div className="flex-grow-1 pe-3" style={{ minWidth: 0 }}>
                                                <div className="fw-bold small text-truncate">{p.name}</div>
                                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>SKU: {p.sku}</div>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                                <span className="fw-bold text-primary small">{baseCurrencySymbol}{p.price}</span>
                                                <Badge bg={p.stock > 5 ? 'success' : 'danger'} style={{ fontSize: '0.65rem' }}>{p.stock}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {searchTerm && filteredProducts.length === 0 && (
                                        <div className="text-center py-5 text-muted">
                                            <FaBox size={40} className="mb-2 opacity-25" />
                                            <p className="small">No se encontraron productos</p>
                                        </div>
                                    )}
                                </div>

                            {/* Discrete Total Summary */}
                            <div className="mt-4 pt-4 border-top">
                                {cart.length > 0 && (
                                    <Row className="mb-3">
                                        <Col xs={12}>
                                            <Form.Group className="mb-0 d-flex justify-content-between align-items-center">
                                                <Form.Label className="fw-bold text-muted small text-uppercase mb-0">Desc. Global</Form.Label>
                                                <InputGroup size="sm" style={{ width: '150px' }}>
                                                    <Form.Select style={{ maxWidth: '50px', padding: '0 5px' }} value={globalDiscountType} onChange={e => setGlobalDiscountType(e.target.value)}>
                                                        <option value="PERCENTAGE">%</option>
                                                        <option value="FIXED">$</option>
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
                                    </Row>
                                )}
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted fw-bold">TOTAL</span>
                                    <div className="text-end">
                                        <div className="fs-3 fw-black">{baseCurrencySymbol}{total.toFixed(2)}</div>
                                        <div className="text-muted small">{formatSecondary(total)}</div>
                                    </div>
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

                <Modal scrollable show={showQuantityModal} onHide={() => setShowQuantityModal(false)} centered>
                    <Modal.Header closeButton><Modal.Title>Cantidad</Modal.Title></Modal.Header>
                    <Modal.Body>
                        <Form.Control type="number" onFocus={(e) => e.target.select()} value={inputQuantity} onChange={e => setInputQuantity(e.target.value)} autoFocus onKeyPress={e => e.key === 'Enter' && confirmAddToCart()} />
                    </Modal.Body>
                    <Modal.Footer><Button variant="primary" onClick={confirmAddToCart}>Agregar</Button></Modal.Footer>
                </Modal>

                    <Modal scrollable show={showNewCustomerModal} onHide={() => setShowNewCustomerModal(false)} centered>
                    <Modal.Header closeButton><Modal.Title>Nuevo Cliente</Modal.Title></Modal.Header>
                    <Form onSubmit={handleNewCustomerSubmit}>
                        <Modal.Body>
                            <Form.Control className="mb-2" required placeholder="Nombre *" value={newCustomer.name} onChange={e => {
                                if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(e.target.value)) {
                                    setNewCustomer({ ...newCustomer, name: e.target.value });
                                }
                            }} />
                            <Form.Control className="mb-2" required placeholder="Cédula *" value={newCustomer.cedula} onChange={e => setNewCustomer({ ...newCustomer, cedula: e.target.value })} />
                            <Form.Control className="mb-2" required placeholder="Teléfono (solo números) *" value={newCustomer.phone} onChange={e => {
                                if (/^[0-9]*$/.test(e.target.value)) {
                                    setNewCustomer({ ...newCustomer, phone: e.target.value });
                                }
                            }} />
                            <Form.Control className="mb-2" type="email" placeholder="Email" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                            <Form.Control className="mb-2" as="textarea" rows={2} placeholder="Dirección" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                        </Modal.Body>
                        <Modal.Footer><Button variant="primary" type="submit">Guardar</Button></Modal.Footer>
                    </Form>
                </Modal>

                <Modal show={showEmptyCartModal} onHide={() => setShowEmptyCartModal(false)} centered>
                    <Modal.Body className="text-center p-5">
                        <div className="mb-4">
                            <div className="rounded-circle bg-danger bg-opacity-10 d-inline-flex p-4">
                                <FaTrash size={40} className="text-danger" />
                            </div>
                        </div>
                        <h4 className="fw-bold mb-3">¿Vaciar Carrito?</h4>
                        <p className="text-secondary mb-4">
                            Estás a punto de eliminar todos los productos del carrito actual.
                        </p>
                        <div className="d-flex justify-content-center gap-3">
                            <Button variant="outline-secondary" className="px-4 rounded-pill fw-bold" onClick={() => setShowEmptyCartModal(false)}>
                                Cancelar
                            </Button>
                            <Button variant="danger" className="px-4 rounded-pill fw-bold" onClick={() => { setCart([]); setShowEmptyCartModal(false); }}>
                                Sí, Vaciar
                            </Button>
                        </div>
                    </Modal.Body>
                </Modal>

                <Modal show={showCloseZeroModal} onHide={() => setShowCloseZeroModal(false)} centered>
                    <Modal.Body className="text-center p-5">
                        <div className="mb-4">
                            <div className="rounded-circle bg-warning bg-opacity-10 d-inline-flex p-4">
                                <FaExclamationTriangle size={40} className="text-warning" />
                            </div>
                        </div>
                        <h4 className="fw-bold mb-3">¿Cerrar Caja en CERO?</h4>
                        <p className="text-secondary mb-4">
                            No has declarado ningún monto. ¿Seguro que deseas cerrar la caja con saldo CERO?
                        </p>
                        <div className="d-flex justify-content-center gap-3">
                            <Button variant="outline-secondary" className="px-4 rounded-pill fw-bold" onClick={() => setShowCloseZeroModal(false)}>
                                Cancelar
                            </Button>
                            <Button variant="warning" className="px-4 rounded-pill fw-bold text-dark" onClick={() => { setShowCloseZeroModal(false); executeCloseShift(); }}>
                                Sí, Cerrar en Cero
                            </Button>
                        </div>
                    </Modal.Body>
                </Modal>

                {/* Payment Modal Refactored */}
                <Modal scrollable show={showPaymentModal} 
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
                                    <div className="d-flex justify-content-between align-items-end mb-2">
                                        <span className="text-muted small fw-bold">TOTAL A PAGAR</span>
                                        <div className="text-end">
                                            <div className="fs-4 fw-black">{baseCurrencySymbol}{total.toFixed(2)}</div>
                                            {formatSecondary(total) && (
                                                <div className="text-muted small fw-bold">
                                                    {formatSecondary(total)} 
                                                    <span className="ms-1 opacity-75" style={{ fontSize: '0.75rem' }}>(Tasa: {availableCurrencies.find(c => c.code === 'VES')?.rate})</span>
                                                </div>
                                            )}
                                            {formatInCurrency(total, 'COP') && (
                                                <div className="text-muted small fw-bold">
                                                    {formatInCurrency(total, 'COP')} COP
                                                    <span className="ms-1 opacity-75" style={{ fontSize: '0.75rem' }}>(Tasa: {availableCurrencies.find(c => c.code === 'COP')?.rate})</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="progress mb-2" style={{ height: '8px', borderRadius: '10px' }}>
                                        <div 
                                            className="progress-bar bg-success" 
                                            role="progressbar" 
                                            style={{ width: `${(totalPaidInBase.div(total.gt(0) ? total : 1).times(100)).toNumber()}%` }} 
                                        ></div>
                                    </div>
                                    <div className="d-flex justify-content-between small">
                                        <span className="text-success fw-bold">Pagado: {baseCurrencySymbol}{totalPaidInBase.toFixed(2)}</span>
                                        <div className="text-end">
                                            <span className="text-primary fw-bold d-block">Pendiente: {baseCurrencySymbol}{remainingToPay.toFixed(2)}</span>
                                            {remainingToPay.gt(0) && (
                                                <div className="text-muted fw-bold" style={{ fontSize: '0.65rem' }}>
                                                    {formatSecondary(remainingToPay)} VES | {formatInCurrency(remainingToPay, 'COP')} COP
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <h6 className="fw-bold mb-3">Registrar Pago</h6>
                                <div className="currency-input-group mb-1">
                                    <Row className="g-2">
                                        <Col xs={4}>
                                            <Form.Select 
                                                className="border-0 bg-transparent fw-bold"
                                                value={tempPayment.currency}
                                                onChange={e => setTempPayment({...tempPayment, currency: e.target.value})}
                                            >
                                                <option value={baseCurrencyCode}>{baseCurrencyCode}</option>
                                                {availableCurrencies.filter(c => c.code !== baseCurrencyCode).map(c => (
                                                    <option key={c.code} value={c.code}>{c.code}</option>
                                                ))}
                                            </Form.Select>
                                        </Col>
                                        <Col xs={8}>
                                            <Form.Control 
                                                type="number" onFocus={(e) => e.target.select()}
                                                placeholder="Monto"
                                                className="border-0 bg-transparent fw-bold fs-5 text-end"
                                                value={tempPayment.amount}
                                                onChange={e => setTempPayment({...tempPayment, amount: e.target.value})}
                                                onKeyPress={e => e.key === 'Enter' && addPaymentPart()}
                                            />
                                        </Col>
                                    </Row>
                                </div>
                                <div className="text-end mb-3 px-2">
                                    {tempPayment.amount && tempPayment.currency !== baseCurrencyCode && (
                                        <small className="text-primary fw-bold">
                                            ≈ {baseCurrencySymbol}{(parseFloat(tempPayment.amount) / (availableCurrencies.find(c => c.code === tempPayment.currency)?.rate || 1)).toFixed(2)} {baseCurrencyCode}
                                            <span className="text-muted ms-2">(Tasa: {availableCurrencies.find(c => c.code === tempPayment.currency)?.rate || 1})</span>
                                        </small>
                                    )}
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
                                                    <span className="balance-value paid small">{baseCurrencySymbol}{new Decimal(p.amountInBaseCurrency || 0).toFixed(2)}</span>
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
                                        {totalPaidInBase.gt(total) && (
                                            <>
                                                <div className="d-flex justify-content-between text-info mb-2">
                                                    <span className="small fw-bold">VUELTO / CAMBIO</span>
                                                    <span className="fs-4 fw-black text-info">{baseCurrencySymbol}{totalPaidInBase.minus(total).toFixed(2)}</span>
                                                </div>
                                                {cashRegisters.length > 1 && totalPaidInBase.minus(total).gt(new Decimal(currentShift?.initialCash || 0)) && (
                                                    <div className="d-flex align-items-start gap-2 p-3 mb-3 rounded-3 bg-warning text-dark shadow-sm">
                                                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                                        <span className="small fw-bold">
                                                            El vuelto ({baseCurrencySymbol}{totalPaidInBase.minus(total).toFixed(2)}) supera el fondo inicial de la caja ({baseCurrencySymbol}{new Decimal(currentShift?.initialCash || 0).toFixed(2)}). Verifica que tengas sencillo suficiente o solicita un <strong>Abono de Tesorería</strong>.
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <Button 
                                            variant="success" 
                                            size="lg" 
                                            className="w-100 py-3 rounded-pill fw-bold shadow-sm"
                                            disabled={totalPaidInBase.lt(total)}
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

                {/* MODALES DE TURNO */}
                <Modal scrollable show={showShiftOpeningModal} backdrop="static" keyboard={false} centered>
                    <Modal.Header className="border-0 pb-0">
                        <Modal.Title className="fw-black fs-3">Apertura de Caja</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <p className="text-muted">Selecciona la caja y el monto de efectivo inicial (base o sencillo) que tienes en la gaveta.</p>
                        
                        <Row className="mb-4">
                            <Col md={12}>
                                <Form.Label className="small fw-bold">Caja Disponible <span className="text-danger">*</span></Form.Label>
                                <Form.Select value={selectedCashRegister} onChange={e => setSelectedCashRegister(e.target.value)}>
                                    <option value="">-- Selecciona una caja --</option>
                                    {cashRegisters.map(cr => (
                                        <option key={cr.id} value={cr.id}>{cr.name}</option>
                                    ))}
                                </Form.Select>
                                {cashRegisters.length === 0 && (
                                    <Form.Text className="text-danger">No hay cajas disponibles o creadas. Crea una desde Configuración.</Form.Text>
                                )}
                            </Col>
                        </Row>

                        <Row className="g-2 mb-3 align-items-end">
                            <Col md={5}>
                                <Form.Label className="small fw-bold">Moneda</Form.Label>
                                <Form.Select value={tempOpeningDeclaration.currencyCode} onChange={e => setTempOpeningDeclaration({...tempOpeningDeclaration, currencyCode: e.target.value})}>
                                    <option value={baseCurrencyCode}>{baseCurrencyCode} ({baseCurrencySymbol})</option>
                                    {availableCurrencies.filter(c => c.code !== baseCurrencyCode).map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                                </Form.Select>
                            </Col>
                            <Col md={5}>
                                <Form.Label className="small fw-bold">Monto Efectivo</Form.Label>
                                <Form.Control type="number" onFocus={(e) => e.target.select()} min="0" step="0.01" value={tempOpeningDeclaration.amount} onChange={e => setTempOpeningDeclaration({...tempOpeningDeclaration, amount: e.target.value})} placeholder="Ej: 50.00" />
                            </Col>
                            <Col md={2}>
                                <Button variant="primary" className="w-100" onClick={addOpeningDeclaration}><FaPlus /></Button>
                            </Col>
                        </Row>

                        {openingDeclarations.length > 0 && (
                            <ListGroup className="mb-3">
                                {openingDeclarations.map(dec => (
                                    <ListGroup.Item key={dec.id} className="d-flex justify-content-between align-items-center bg-light border-0 mb-1 rounded-3">
                                        <div>
                                            <Badge bg="info" className="me-2">{dec.currencyCode}</Badge>
                                            <span className="fw-bold">{parseFloat(dec.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <Button variant="outline-danger" size="sm" className="border-0" onClick={() => removeOpeningDeclaration(dec.id)}><FaTrash /></Button>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        )}

                        <Button variant="primary" size="lg" className="w-100 py-3 rounded-4 fw-bold shadow mt-2" onClick={handleOpenShift} disabled={!selectedCashRegister || cashRegisters.length === 0}>
                            ABRIR CAJA Y EMPEZAR
                        </Button>
                        <Button variant="link" className="text-muted w-100 mt-2 text-decoration-none small" onClick={() => navigate('/dashboard')}>
                            Cancelar y volver al Dashboard
                        </Button>
                    </Modal.Body>
                </Modal>

                <Modal scrollable show={showShiftClosingModal} onHide={() => setShowShiftClosingModal(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title className="fw-bold">Cierre de Caja (Arqueo)</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <div className="alert alert-warning small">
                            <strong>Atención:</strong> Ingresa el conteo físico de lo que tienes en este momento. Agrega cada monto según su moneda y método.
                        </div>
                        <div className="mb-3 bg-light p-2 rounded border">
                            <span className="fw-bold small text-muted d-block mb-2">Fondo de Caja (Saldo Inicial):</span>
                            {currentShift?.declarations?.filter(d => d.declarationType === 'OPENING').length > 0 ? (
                                currentShift.declarations.filter(d => d.declarationType === 'OPENING').map(d => (
                                    <div key={d.id} className="d-flex justify-content-between align-items-center border-bottom pb-1 mb-1">
                                        <Badge bg="info">{d.currencyCode}</Badge>
                                        <span className="fw-black text-primary">{parseFloat(d.declaredAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="small text-muted">Total (Base):</span>
                                    <span className="fw-black text-primary fs-5">{baseCurrencySymbol}{currentShift?.initialCash?.toFixed(2) || '0.00'}</span>
                                </div>
                            )}
                        </div>
                        <Row className="g-2 mb-3 align-items-end">
                            <Col md={3}>
                                <Form.Label className="small fw-bold">Método</Form.Label>
                                <Form.Select value={tempDeclaration.method} onChange={e => setTempDeclaration({...tempDeclaration, method: e.target.value})}>
                                    <option value="CASH">Efectivo</option>
                                    <option value="CARD">Tarjeta / Punto</option>
                                    <option value="TRANSFER">Transferencia</option>
                                    <option value="MOBILE_PAYMENT">Pago Móvil</option>
                                </Form.Select>
                            </Col>
                            <Col md={3}>
                                <Form.Label className="small fw-bold">Moneda</Form.Label>
                                <Form.Select value={tempDeclaration.currencyCode} onChange={e => setTempDeclaration({...tempDeclaration, currencyCode: e.target.value})}>
                                    <option value={baseCurrencyCode}>{baseCurrencyCode} ({baseCurrencySymbol})</option>
                                    {availableCurrencies.filter(c => c.code !== baseCurrencyCode).map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                                </Form.Select>
                            </Col>
                            <Col md={4}>
                                <Form.Label className="small fw-bold">Monto</Form.Label>
                                <Form.Control type="number" onFocus={(e) => e.target.select()} min="0" step="0.01" value={tempDeclaration.amount} onChange={e => setTempDeclaration({...tempDeclaration, amount: e.target.value})} placeholder="Ej: 150.00" />
                            </Col>
                            <Col md={2}>
                                <Button variant="primary" className="w-100" onClick={addDeclaration}><FaPlus /></Button>
                            </Col>
                        </Row>
                        {closingData.declarations.length > 0 && (
                            <ListGroup className="mb-3">
                                {closingData.declarations.map(dec => (
                                    <ListGroup.Item key={dec.id} className="d-flex justify-content-between align-items-center bg-light border-0 mb-1 rounded-3">
                                        <div>
                                            <Badge bg="secondary" className="me-2">{dec.method}</Badge>
                                            <Badge bg="info" className="me-2">{dec.currencyCode}</Badge>
                                            <span className="fw-bold">{parseFloat(dec.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <Button variant="outline-danger" size="sm" className="border-0" onClick={() => removeDeclaration(dec.id)}><FaTrash /></Button>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        )}
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Observaciones / Novedades</Form.Label>
                                <Form.Control as="textarea" rows={2} value={closingData.observation} onChange={e => setClosingData({...closingData, observation: e.target.value})} placeholder="¿Alguna novedad en el turno?" />
                            </Form.Group>
                        </Col>
                        <div className="mt-4">
                            <Button variant="danger" size="lg" className="w-100 py-3 fw-bold rounded-4 shadow" onClick={handleCloseShift}>
                                FINALIZAR TURNO Y ENVIAR REPORTE
                            </Button>
                        </div>
                    </Modal.Body>
                </Modal>

                {/* Parked Sales Modal */}
                <Modal show={showParkedModal} onHide={() => setShowParkedModal(false)} size="lg" centered>
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold text-dark"><FaHistory className="me-2 text-warning" /> Ventas en Espera</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        {parkedSales.length === 0 ? (
                            <div className="text-center py-4 text-muted">No hay ventas aparcadas en este momento.</div>
                        ) : (
                            <ListGroup variant="flush">
                                {parkedSales.map(ps => (
                                    <ListGroup.Item key={ps.id} className="d-flex justify-content-between align-items-center py-3 border-bottom">
                                        <div>
                                            <div className="fw-bold mb-1">
                                                {ps.customer ? ps.customer.name : (ps.customerSearch || 'Cliente General')}
                                            </div>
                                            <div className="small text-muted mb-1">
                                                {ps.cart.length} productos | Aparcado a las {ps.date}
                                            </div>
                                            <div className="text-primary fw-bold">
                                                Total: {baseCurrencySymbol}{ps.total?.toFixed(2)}
                                            </div>
                                        </div>
                                        <Button variant="success" size="sm" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => handleRestoreSale(ps)}>
                                            Recuperar
                                        </Button>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        )}
                    </Modal.Body>
                </Modal>

                {/* Cash Movements Modal */}
                <Modal show={showMovementModal} onHide={() => setShowMovementModal(false)} centered>
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold text-dark"><FaExchangeAlt className="me-2 text-primary" /> Movimientos de Caja</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <Form onSubmit={handleCashMovement}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Tipo de Movimiento</Form.Label>
                                <Form.Select value={movementType} onChange={e => {setMovementType(e.target.value); setTransferTargetId('');}}>
                                    <option value="INJECTION">💰 Abono de Tesorería (entra dinero a la caja)</option>
                                    <option value="BLEEDING">🏦 Retiro a Tesorería (sale dinero de la caja)</option>
                                    {cashRegisters.filter(cr => cr.status === 'OPEN' && cr.id !== currentShift.cashRegister?.id).length > 0 && <option value="TRANSFER">🔄 Transferencia a otra Caja</option>}
                                </Form.Select>
                            </Form.Group>
                            {movementType === 'INJECTION' && (
                                <div className="small text-muted mb-3 p-2 bg-light rounded-3">
                                    💡 Usa esta opción cuando el supervisor o tesorería te envía dinero para surtir la caja o dar sencillo.
                                </div>
                            )}
                            {movementType === 'BLEEDING' && (
                                <div className="small text-muted mb-3 p-2 bg-light rounded-3">
                                    💡 Usa esta opción cuando retiras el exceso de efectivo de la caja para enviarlo a tesorería o resguardo.
                                </div>
                            )}

                            {movementType === 'TRANSFER' && (
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-danger">Caja Destino <span className="text-muted fw-normal">(debe estar abierta)</span></Form.Label>
                                    <Form.Select required value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)}>
                                        <option value="">-- Seleccionar --</option>
                                        {cashRegisters.filter(cr => cr.status === 'OPEN' && cr.id !== currentShift.cashRegister?.id).map(cr => (
                                            <option key={cr.id} value={cr.id}>{cr.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            )}

                            <Row>
                                <Col md={8}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-bold">Monto *</Form.Label>
                                        <Form.Control type="number" step="0.01" min="0.01" required value={movementAmount} onChange={e => setMovementAmount(e.target.value)} placeholder="0.00" />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-bold">Moneda</Form.Label>
                                        <Form.Select value={movementCurrency} onChange={e => setMovementCurrency(e.target.value)}>
                                            <option value={baseCurrencyCode}>{baseCurrencyCode}</option>
                                            {availableCurrencies.filter(c => c.code !== baseCurrencyCode).map(c => (
                                                <option key={c.code} value={c.code}>{c.code}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold">Descripción / Motivo *</Form.Label>
                                <Form.Control as="textarea" rows={2} required value={movementDesc} onChange={e => setMovementDesc(e.target.value)} placeholder="Ej. Fondo de cambio entregado por supervisor..." />
                            </Form.Group>

                            <Button variant={movementType === 'INJECTION' ? 'success' : 'danger'} type="submit" className="w-100 fw-bold py-2 rounded-pill shadow-sm">
                                {movementType === 'INJECTION' ? '💰 Registrar Abono de Tesorería' : movementType === 'TRANSFER' ? '🔄 Registrar Transferencia' : '🏦 Registrar Retiro a Tesorería'}
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>

                <ToastContainer position="top-center" className="p-3" style={{ zIndex: 9999 }}>
                    <Toast
                        show={showToast}
                        onClose={() => setShowToast(false)}
                        delay={toastType === 'error' ? 4000 : 2500}
                        autohide
                        style={{
                            background: toastType === 'error' ? '#f97316' : '#22c55e',
                            border: 'none',
                            borderRadius: '50px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                            minWidth: '280px'
                        }}
                    >
                        <Toast.Body className="py-2 px-4 text-white fw-bold text-center" style={{ fontSize: '0.9rem', letterSpacing: '0.3px' }}>
                            {toastMessage}
                        </Toast.Body>
                    </Toast>
                </ToastContainer>
            </div>
        </div>
    );
};

export default POSPage;
