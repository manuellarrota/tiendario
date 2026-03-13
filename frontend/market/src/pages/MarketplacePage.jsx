import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, InputGroup, Button, Badge, Spinner, Modal, Alert, Nav, Toast, ToastContainer } from 'react-bootstrap';
import { FaSearch, FaShoppingCart, FaLock, FaStore, FaInfoCircle, FaStar, FaGem } from 'react-icons/fa';
import SearchService from '../services/search.service';
import AuthService from '../services/auth.service';
import MarketplaceNavbar from '../components/Navbar';
import ProductDetailModal from '../components/ProductDetailModal';
import CartModal from '../components/CartModal';
import CheckoutModal from '../components/CheckoutModal';
import { LoginModal, RegisterModal } from '../components/AuthModals';
import { getCategoryEmoji, getCategoryPlaceholder } from '../utils/categoryEmoji';

const MarketplacePage = () => {
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [customerData, setCustomerData] = useState({
        name: '', email: '', phone: '', address: '', quantity: 1, paymentMethod: 'credit_card'
    });
    const [orderStatus, setOrderStatus] = useState({ loading: false, success: false, error: '' });
    const [userPoints, setUserPoints] = useState(0);
    const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem('tiendario_cart');
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem('tiendario_cart', JSON.stringify(cart));
    }, [cart]);

    const [showCartModal, setShowCartModal] = useState(false);
    const [platformConfig, setPlatformConfig] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [sellerSortOrder, setSellerSortOrder] = useState('asc');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [selectedStores, setSelectedStores] = useState([]);
    const [sortBy, setSortBy] = useState('relevant');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showExhibitionModal, setShowExhibitionModal] = useState(false);
    const [exhibitionStore, setExhibitionStore] = useState('');
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);
    const [confirmedOrder, setConfirmedOrder] = useState(null);
    const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); // 'success' or 'error'
    const user = AuthService.getCurrentUser();

    useEffect(() => {
        if (user && user.email) {
            SearchService.getCustomerPoints(user.email).then(
                res => setUserPoints(res.data.points || 0),
                err => { if (process.env.NODE_ENV === 'development') console.error("Error loading points", err); }
            );

            // AUTO-CONTINUE CHECKOUT: If user just logged in and had a pending checkout
            if (sessionStorage.getItem('pending_checkout') === 'true' && cart.length > 0) {
                sessionStorage.removeItem('pending_checkout');
                // Small delay to ensure everything is loaded
                setTimeout(() => {
                    handleCheckout();
                }, 500);
            }
        }
    }, [user]);


    useEffect(() => {
        loadProducts(0, true);
        loadConfig();
        loadCategories();
    }, []);

    // SEO: Dynamic Titles and Descriptions
    useEffect(() => {
        let title = "Tiendario - Encuentre y compre productos locales";
        let description = "Localice y compre productos en tiendas de su zona. Tiendario conecta inventarios locales para que encuentre lo que necesita cerca de ti.";

        if (selectedCategory !== 'all') {
            title = `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} cerca de mí - Tiendario`;
            description = `Busque y compre ${selectedCategory} en tiendas locales. Encuentre los mejores precios y stock disponible cerca de su ubicación.`;
        } else if (searchQuery) {
            title = `Buscando "${searchQuery}" en tiendas locales - Tiendario`;
            description = `Resultados para "${searchQuery}" en su zona. Encuentre dónde comprarlo al mejor precio cerca de usted.`;
        }

        document.title = title;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', description);
    }, [selectedCategory, searchQuery]);

    const loadCategories = () => {
        SearchService.getCategories().then(
            (response) => setCategories(response.data),
            (error) => { if (process.env.NODE_ENV === 'development') console.error("Error loading categories", error); }
        );
    };

    const loadConfig = () => {
        SearchService.getPlatformConfig().then(
            (response) => setPlatformConfig(response.data),
            (error) => { if (process.env.NODE_ENV === 'development') console.error("Error loading config", error); }
        );
    };

    const formatSecondary = (amount) => {
        if (!platformConfig || !platformConfig.enableSecondaryCurrency) return null;
        const converted = amount * platformConfig.exchangeRate;
        return `${platformConfig.secondaryCurrencySymbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    useEffect(() => {
        setPage(0);
        loadProducts(0, true);
    }, [searchQuery, selectedCategory, sortBy, priceRange]);

    const loadProducts = (pageNum, reset = false) => {
        setLoading(true);
        const params = {
            page: pageNum,
            size: 12,
            category: selectedCategory === 'all' ? null : selectedCategory,
            q: searchQuery || null,
            minPrice: priceRange.min || null,
            maxPrice: priceRange.max || null
        };

        SearchService.getAllProducts(params).then(
            (response) => {
                const newProducts = response.data.products || [];
                if (reset) {
                    setProducts(newProducts);
                    setFilteredProducts(newProducts);
                } else {
                    setProducts(prev => [...prev, ...newProducts]);
                    setFilteredProducts(prev => [...prev, ...newProducts]);
                }
                setTotalPages(response.data.totalPages);
                setTotalItems(response.data.totalItems);
                setLoading(false);
            },
            (error) => {
                console.error('Error loading products', error);
                if (reset) {
                    setProducts([]);
                    setFilteredProducts([]);
                }
                setLoading(false);
            }
        );
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadProducts(nextPage);
    };

    const handleSearch = () => {
        setPage(0);
        loadProducts(0, true);
    };

    const handleDetailClick = (product) => {
        setSelectedProduct(product);
        setShowDetailModal(true);
        SearchService.getSellersByName(product.name, product.sku).then(
            (response) => {
                const sortedSellers = [...response.data].sort((a, b) => a.price - b.price);
                setSellers(sortedSellers);
                setSellerSortOrder('asc');
            },
            (error) => console.error("Error loading sellers", error)
        );
    };

    const handleStoreClick = (seller) => {
        setSelectedStore(seller);
        setShowStoreModal(true);
    };

    const handleSortSellers = () => {
        const newOrder = sellerSortOrder === 'asc' ? 'desc' : 'asc';
        const sorted = [...sellers].sort((a, b) => {
            return newOrder === 'asc' ? a.price - b.price : b.price - a.price;
        });
        setSellers(sorted);
        setSellerSortOrder(newOrder);
    };

    const handleBuyFromSeller = (seller) => {
        if (!['PAID', 'TRIAL'].includes(seller.subscriptionStatus)) {
            setExhibitionStore(seller.companyName);
            setShowExhibitionModal(true);
            return;
        }

        // We set the selected product to the specific seller offer
        const productOffer = {
            ...selectedProduct,
            id: seller.productId,
            companyId: seller.companyId,
            companyName: seller.companyName,
            price: seller.price,
            stock: seller.stock,
            subscriptionStatus: seller.subscriptionStatus
        };
        handleAddToCart(productOffer);
    };

    const handleAddToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id || item.productId === product.id);
        if (existingItem) {
            setCart(cart.map(item =>
                (item.id === product.id || item.productId === product.id) ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
        
        // Notification logic
        setShowToast(false);
        setToastMessage(product.name);
        setToastType('success');
        setTimeout(() => {
            setShowToast(true);
        }, 100);
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, delta) => {
        setCart(cart.map(item => {
            if (item.id === productId) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    const handleCheckout = () => {
        if (!user) {
            // Guardar intención para después del login
            sessionStorage.setItem('pending_checkout', 'true');
            setShowCartModal(false);
            setShowLoginModal(true);
            return;
        }

        // Prefill customer data
        setCustomerData({
            name: user.username || '',
            email: user.email || user.username || '', // Adjusted based on auth service
            phone: '',
            address: '',
            quantity: 1, // Not used in bulk order but kept for structure
            paymentMethod: 'credit_card'
        });
        setShowBuyModal(true);
        setShowCartModal(false);
        setOrderStatus({ loading: false, success: false, error: '' });
    };

    const handleOrderSubmit = async (e) => {
        e.preventDefault();
        setOrderStatus({ loading: true, success: false, error: '' });

        // Group cart items by store (companyId)
        const storeGroups = {};
        cart.forEach(item => {
            const storeId = item.companyId;
            if (!storeGroups[storeId]) {
                storeGroups[storeId] = {
                    companyId: storeId,
                    companyName: item.companyName,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    items: []
                };
            }
            storeGroups[storeId].items.push(item);
        });

        try {
            // Process each item in the cart as a separate order
            const orderPromises = cart.map(item =>
                SearchService.createOrder({
                    productId: item.id,
                    quantity: item.quantity,
                    customerName: customerData.name,
                    customerEmail: customerData.email,
                    customerPhone: customerData.phone || '',
                    customerAddress: customerData.address
                })
            );

            const results = await Promise.allSettled(orderPromises);

            // Check for any failures
            const failures = results.filter(r => r.status === 'rejected' || (r.value && r.value.data && r.value.data.message && r.value.data.message.includes('Error')));
            const failedResponses = results.filter(r => r.status === 'fulfilled' && r.value?.response?.status >= 400);

            if (failures.length > 0 || failedResponses.length > 0) {
                const errorMessages = results
                    .filter(r => r.status === 'rejected')
                    .map(r => r.reason?.response?.data?.message || r.reason?.message || 'Error desconocido');

                if (errorMessages.length > 0) {
                    setOrderStatus({
                        loading: false,
                        success: false,
                        error: `Error en algunos productos: ${errorMessages.join(', ')}`
                    });
                    return;
                }
            }

            const orderNumber = 'ORD-' + Date.now().toString().slice(-8);
            const orderData = {
                orderNumber,
                customerName: customerData.name,
                customerPhone: customerData.phone,
                stores: Object.values(storeGroups),
                total: cartTotal,
                createdAt: new Date().toLocaleString()
            };

            setConfirmedOrder(orderData);
            setOrderStatus({ loading: false, success: true, error: '' });

            // Update points locally for immediate feedback
            setUserPoints(prev => prev + Math.floor(cartTotal));

            setShowBuyModal(false);
            setShowOrderConfirmation(true);
            setCart([]);
        } catch (error) {
            console.error('Order submission error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error al procesar la orden';
            setOrderStatus({ loading: false, success: false, error: errorMessage });
        }
    };

    const featuredStores = [...new Set(products.map(p => p.companyName))];

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });
    const [registerMessage, setRegisterMessage] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState(false);

    if (platformConfig?.maintenanceMode) {
        return (
            <div className="bg-dark vh-100 d-flex flex-column align-items-center justify-content-center text-white px-4 text-center">
                <div className="display-1 mb-4">🛠️</div>
                <h1 className="fw-bold display-4 mb-3">En Mantenimiento</h1>
                <p className="lead opacity-75 mb-5" style={{ maxWidth: '600px' }}>
                    Estamos realizando mejoras para brindarte una mejor experiencia.
                    Por favor, vuelve en unos minutos.
                </p>
                {platformConfig.contactEmail && (
                    <div className="small opacity-50">Contacto: {platformConfig.contactEmail}</div>
                )}
            </div>
        );
    }

    const handleLogin = (e) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);
        AuthService.login(loginData.email, loginData.password).then(
            () => {
                setShowLoginModal(false);
                window.location.reload();
            },
            (error) => {
                setLoginError("Credenciales inválidas. Por favor intente de nuevo.");
                setLoginLoading(false);
            }
        );
    };

    const handleRegister = (e) => {
        e.preventDefault();
        setRegisterMessage("");
        setRegisterSuccess(false);

        AuthService.register(registerData.name, registerData.email, registerData.password).then(
            (response) => {
                setRegisterSuccess(true);
                setRegisterMessage("¡Registro exitoso! Ya puedes iniciar sesión.");
                // clear form
                setRegisterData({ name: '', email: '', password: '' });
                // Optional: switch to login modal after delay
                // setShowRegisterModal(false);
                // setShowLoginModal(true);
            },
            (error) => {
                const resMessage = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
                setRegisterMessage(resMessage);
                setRegisterSuccess(false);
            }
        );
    };

    const openRegister = () => {
        setShowLoginModal(false);
        setShowRegisterModal(true);
    };

    const openLogin = () => {
        setShowRegisterModal(false);
        setShowLoginModal(true);
    };

    // Helper for full image URL with category placeholders
    const getFullImageUrl = (path, category, name) => {
        if (!path) return getCategoryPlaceholder(category, name);
        if (path.startsWith('http')) return path;
        return (import.meta.env.VITE_API_URL || '') + path;
    };

    return (
        <div className="marketplace-page position-relative">
            {/* Background Mesh */}
            <div className="bg-mesh"></div>

            <MarketplaceNavbar onLoginClick={() => setShowLoginModal(true)} onRegisterClick={() => setShowRegisterModal(true)} />
            
            {platformConfig?.announcementMessage && (
                <div className="bg-primary text-white py-2 text-center small fw-bold shadow-sm announce-bar" style={{ fontSize: '0.8rem', position: 'relative', zIndex: 100 }}>
                    <FaInfoCircle className="me-2" /> {platformConfig.announcementMessage}
                </div>
            )}

            {/* Ultra-Compact Premium Hero */}
            <div className="market-hero-premium py-3 mb-3 position-relative overflow-hidden">
                <Container className="py-1 text-center">
                    <div className="mx-auto animate-fade-in" style={{ maxWidth: '850px' }}>
                        <h2 className="display-6 mb-2 fw-800" style={{ color: '#1e293b', letterSpacing: '-1.5px' }}>
                            Todo lo que necesitas, <span className="text-gradient">cerca de ti.</span>
                        </h2>
                        
                        {/* Ultra-Compact Glass Search */}
                        <div className="glass-panel p-1 shadow-lg d-flex align-items-center mb-3 mx-auto" style={{ borderRadius: '100px', maxWidth: '600px' }}>
                            <FaSearch className="text-muted ms-3 mr-2" size={16} />
                            <Form.Control
                                className="border-0 bg-transparent py-2"
                                style={{ boxShadow: 'none', fontSize: '0.95rem' }}
                                placeholder="Busca en el mercado local..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Button onClick={handleSearch} className="btn btn-primary rounded-pill px-4 py-2 shadow-md fw-bold btn-sm">
                                Buscar
                            </Button>
                        </div>

                        <div className="d-flex justify-content-center gap-4 align-items-center opacity-75">
                            <div className="stat-item-compact">
                                <span className="fw-bold text-dark small">{totalItems}+</span> <small className="text-muted" style={{ fontSize: '0.7rem' }}>Productos</small>
                            </div>
                            <div className="stat-item-compact border-start ps-4">
                                <span className="fw-bold text-dark small">{featuredStores.length}</span> <small className="text-muted" style={{ fontSize: '0.7rem' }}>Tiendas</small>
                            </div>
                            <div className="stat-item-compact border-start ps-4">
                                <span className="fw-bold text-dark small">{categories.length}</span> <small className="text-muted" style={{ fontSize: '0.7rem' }}>Categorías</small>
                            </div>
                        </div>
                    </div>
                </Container>
            </div>

            {/* Mobile Categories - Only visible on small screens */}
            <div className="d-lg-none sticky-top bg-white bg-opacity-90 backdrop-blur border-bottom py-2 shadow-sm" style={{ zIndex: 100, top: '0' }}>
                <Container>
                    <div className="categories-wrapper d-flex align-items-center py-1">
                        <div 
                            className={`mobile-cat-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('all')}
                        >
                            📦 Todo
                        </div>
                        {categories.sort((a, b) => a.name.localeCompare(b.name)).map((cat, idx) => (
                            <div
                                key={idx}
                                className={`mobile-cat-chip ${selectedCategory === cat.name ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat.name)}
                            >
                                {cat.name}
                            </div>
                        ))}
                    </div>
                </Container>
            </div>

            <Container className="mb-5 pb-5 mt-4 mt-lg-0">
                <Row className="g-4">
                    {/* Sidebar: Restored as requested (Desktop only) */}
                    <Col lg={3} className="d-none d-lg-block">
                        <div className="glass-panel p-4 sticky-top" style={{ top: '100px', zIndex: 10 }}>
                            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                                <FaStore className="text-primary" size={18} />
                                Categorías
                            </h5>
                            <div className="d-flex flex-column gap-1">
                                <div 
                                    className={`sidebar-cat-item ${selectedCategory === 'all' ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory('all')}
                                >
                                    <span>📦 Todo el Mercado</span>
                                </div>
                                {categories.sort((a, b) => a.name.localeCompare(b.name)).map((cat, idx) => (
                                    <div
                                        key={idx}
                                        className={`sidebar-cat-item ${selectedCategory === cat.name ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(cat.name)}
                                    >
                                        <span>{getCategoryEmoji(cat.name)} {cat.name}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 pt-4 border-top">
                                <div className="p-3 rounded-4 bg-primary bg-opacity-10">
                                    <h6 className="fw-bold text-primary mb-2">¿Eres Vendedor?</h6>
                                    <p className="small text-muted mb-3">Únete a la red más grande de San Cristóbal y vende más.</p>
                                    <Button 
                                        variant="primary" 
                                        size="sm" 
                                        className="w-100 rounded-pill fw-bold"
                                        onClick={() => window.open(import.meta.env.VITE_ADMIN_URL || 'http://localhost:8081', '_blank')}
                                    >
                                        Empezar Ahora
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Col>

                    {/* Main Content: Products */}
                    <Col lg={9}>
                        {/* Title and Sort Info */}
                        <div className="glass-panel p-4 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div>
                                <h4 className="fw-bold mb-1 text-dark">
                                    {selectedCategory === 'all' ? 'Novedades de Hoy' : selectedCategory}
                                </h4>
                                <p className="text-muted small mb-0 fw-500">
                                    Mostrando {filteredProducts.length} de {totalItems} resultados en tu área
                                </p>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-center">
                                <Form.Select 
                                    className="border-0 shadow-sm rounded-pill px-4 bg-light fw-bold"
                                    style={{ width: 'auto', minWidth: '180px', fontSize: '0.9rem' }}
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="relevant">Más Relevantes</option>
                                    <option value="price_low">Precio: Menor a Mayor</option>
                                    <option value="price_high">Precio: Mayor a Menor</option>
                                    <option value="newest">Lo más Nuevo</option>
                                </Form.Select>
                            </div>
                        </div>

                        {loading && page === 0 ? (
                            <Row className="g-4">
                                {[1, 2, 3, 4, 5, 6].map(n => (
                                    <Col key={n} xs={12} sm={6} md={4}>
                                        <div className="glass-panel p-3 h-100 placeholder-glow">
                                            <div className="placeholder rounded-4 w-100 mb-3" style={{ height: '200px' }}></div>
                                            <div className="placeholder w-75 mb-2"></div>
                                            <div className="placeholder w-50"></div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        ) : (
                            <Row className="g-4">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((product, index) => (
                                        <Col key={index} xs={12} sm={6} md={4} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                                            <Card className="glass-panel border-0 card-hover h-100 p-2 overflow-hidden" 
                                                onClick={() => handleDetailClick(product)} 
                                                style={{ cursor: 'pointer' }}>
                                                <div className="position-relative overflow-hidden rounded-4 mb-3" style={{ height: '200px' }}>
                                                    <Card.Img
                                                        variant="top"
                                                        src={getFullImageUrl(product.imageUrl, product.category, product.name)}
                                                        style={{ height: '100%', objectFit: 'cover' }}
                                                        className="transition-all"
                                                    />
                                                    <div className="position-absolute top-0 end-0 m-2">
                                                        <Badge bg="white" text="dark" className="rounded-pill shadow-sm py-2 px-3 fw-bold border-0">
                                                            ${product.price ? product.price.toFixed(2) : '0.00'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <Card.Body className="p-2 d-flex flex-column">
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <small className="text-primary fw-bold text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                                                            {product.category || 'General'}
                                                        </small>
                                                        <div className="d-flex align-items-center gap-1 text-warning small">
                                                            <FaStar size={10} /> <span className="fw-bold" style={{ fontSize: '0.7rem' }}>4.9</span>
                                                        </div>
                                                    </div>
                                                    <h6 className="fw-bold text-dark mb-1 text-truncate" title={product.name}>{product.name}</h6>
                                                    <div className="small text-muted mb-3 d-flex align-items-center gap-1">
                                                        <FaStore className="text-primary opacity-75" size={10} /> 
                                                        <span className="text-truncate fw-500" style={{ fontSize: '0.75rem' }}>{product.companyName}</span>
                                                    </div>
                                                    
                                                    <div className="mt-auto d-grid">
                                                        <Button 
                                                            variant="primary" 
                                                            size="sm" 
                                                            className="rounded-pill fw-bold py-2 shadow-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddToCart(product);
                                                            }}
                                                        >
                                                            Añadir al Carrito
                                                        </Button>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))
                                 ) : (
                                    <Col lg={12} className="text-center py-5">
                                        <div className="display-1 mb-4" style={{ opacity: 0.1 }}>📦</div>
                                        <h4 className="fw-bold text-muted">No encontramos productos</h4>
                                        <p className="text-muted">Prueba buscando otros términos o ajustando los filtros.</p>
                                    </Col>
                                )}
                            </Row>
                        )}

                        {/* Load More Button */}
                        {!loading && page < totalPages - 1 && (
                            <div className="text-center mt-5 mb-5">
                                <Button 
                                    variant="outline-primary" 
                                    className="rounded-pill px-5 py-3 fw-bold shadow-sm border-2"
                                    onClick={handleLoadMore}
                                >
                                    Cargar más productos
                                </Button>
                            </div>
                        )}
                        
                        {loading && page > 0 && (
                            <div className="text-center mt-5 mb-5">
                                <Spinner animation="border" variant="primary" />
                            </div>
                        )}
                    </Col>
                </Row>
            </Container>

            {/* Floating Cart Button */}
            {cart.length > 0 && (
                <Button
                    variant="primary"
                    className="position-fixed bottom-0 end-0 m-4 rounded-circle shadow-lg d-flex align-items-center justify-content-center"
                    style={{ width: '60px', height: '60px', zIndex: 1050 }}
                    onClick={() => setShowCartModal(true)}
                >
                    <div className="position-relative">
                        <FaShoppingCart size={24} />
                        <Badge bg="danger" className="position-absolute top-0 start-100 translate-middle rounded-circle p-1" style={{ minWidth: '20px' }}>
                            {cart.reduce((acc, item) => acc + item.quantity, 0)}
                        </Badge>
                    </div>
                </Button>
            )}

            {/* Cart Modal */}
            <CartModal
                show={showCartModal}
                onHide={() => setShowCartModal(false)}
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onRemoveFromCart={removeFromCart}
                onCheckout={handleCheckout}
                platformConfig={platformConfig}
                formatSecondary={formatSecondary}
            />

            {/* Product Detail Modal */}
            <ProductDetailModal
                show={showDetailModal}
                onHide={() => setShowDetailModal(false)}
                selectedProduct={selectedProduct}
                sellers={sellers}
                sellerSortOrder={sellerSortOrder}
                onSortSellers={handleSortSellers}
                onBuyFromSeller={handleBuyFromSeller}
                onStoreClick={handleStoreClick}
                platformConfig={platformConfig}
                formatSecondary={formatSecondary}
                getCategoryEmoji={getCategoryEmoji}
                getCategoryPlaceholder={getCategoryPlaceholder}
            />

            {/* Notification Toast (Dynamic Style) */}
            <div 
                className={`position-fixed top-0 start-50 translate-middle-x p-3 ${showToast ? 'animate-slide-down' : 'd-none'}`} 
                style={{ zIndex: 10000, pointerEvents: 'none' }}
            >
                <div 
                    className={`${toastType === 'success' ? 'bg-success' : 'bg-danger'} text-white px-4 py-3 rounded-pill shadow-lg d-flex align-items-center gap-3`}
                    style={{ minWidth: '320px', border: '2px solid rgba(255,255,255,0.2)', pointerEvents: 'auto' }}
                >
                    <div className="bg-white bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>
                        {toastType === 'success' ? <FaShoppingCart size={16} /> : <FaInfoCircle size={16} />}
                    </div>
                    <div className="flex-grow-1">
                        <div className="fw-bold small line-height-1">
                            {toastType === 'success' ? '¡Hecho con éxito!' : '¡Atención!'}
                        </div>
                        <div className="small opacity-90 text-truncate" style={{ maxWidth: '200px' }}>{toastMessage}</div>
                    </div>
                    <Button 
                        variant="link" 
                        className="text-white p-0 ms-2 text-decoration-none fw-bold" 
                        onClick={() => setShowToast(false)}
                    >
                        ✕
                    </Button>
                </div>
            </div>

            {/* Store Detail Modal (Map & Reviews) */}
            <Modal show={showStoreModal} onHide={() => setShowStoreModal(false)} size="lg" centered className="modal-premium">
                <Modal.Body className="p-0 overflow-hidden rounded-4">
                    <div className="position-relative">
                        <Button variant="light" className="position-absolute top-0 end-0 m-3 rounded-circle shadow-sm"
                            style={{ zIndex: 10, width: '40px', height: '40px', lineHeight: 1 }}
                            onClick={() => setShowStoreModal(false)}>×</Button>

                        {selectedStore?.subscriptionStatus === 'PAID' ? (
                            <Row className="g-0">
                                <Col lg={6}>
                                    <div className="p-4 p-lg-5">
                                        <Badge bg="primary" className="mb-2 px-3 py-2 rounded-pill fw-bold shadow-sm">
                                            🌟 Tienda Verificada
                                        </Badge>
                                        <h2 className="fw-bold mb-3">{selectedStore?.companyName}</h2>
                                        <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                                            {selectedStore?.description || 'Nuestra tienda ofrece la mejor selección de productos en San Cristóbal con garantía de calidad.'}
                                        </p>

                                        <h6 className="fw-bold mb-3 small text-uppercase text-muted" style={{ letterSpacing: '1px' }}>Galería del Local</h6>
                                        <Row className="g-2 mb-4">
                                            <Col xs={6}>
                                                <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=200&h=150&auto=format&fit=crop" className="img-fluid rounded-3 w-100 shadow-sm" alt="Store 1" />
                                            </Col>
                                            <Col xs={6}>
                                                <img src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=200&h=150&auto=format&fit=crop" className="img-fluid rounded-3 w-100 shadow-sm" alt="Store 2" />
                                            </Col>
                                        </Row>

                                        <h6 className="fw-bold mb-3 small text-uppercase text-muted" style={{ letterSpacing: '1px' }}>Experiencias Tiendario</h6>
                                        <div className="bg-light p-3 rounded-4 mb-2 shadow-sm border-0">
                                            <div className="d-flex gap-1 text-warning mb-1" style={{ fontSize: '0.7rem' }}><FaStar /><FaStar /><FaStar /><FaStar /><FaStar /></div>
                                            <small className="d-block text-dark fw-bold" style={{ fontSize: '0.75rem' }}>"Excelente atención y despacho súper rápido en SC."</small>
                                            <small className="text-muted" style={{ fontSize: '0.65rem' }}>- Maria G. • San Cristóbal</small>
                                        </div>
                                        <div className="bg-light p-3 rounded-4 shadow-sm border-0">
                                            <div className="d-flex gap-1 text-warning mb-1" style={{ fontSize: '0.7rem' }}><FaStar /><FaStar /><FaStar /><FaStar /><FaStar /></div>
                                            <small className="d-block text-dark fw-bold" style={{ fontSize: '0.75rem' }}>"Productos originales, 100% recomendado."</small>
                                            <small className="text-muted" style={{ fontSize: '0.65rem' }}>- Luis F. • Táriba</small>
                                        </div>
                                    </div>
                                </Col>
                                <Col lg={6} className="bg-light d-flex flex-column h-100">
                                    <div className="flex-grow-1" style={{ minHeight: '500px' }}>
                                        {selectedStore?.latitude && selectedStore?.longitude && selectedStore.latitude !== 0.0 ? (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                <iframe
                                                    width="100%"
                                                    style={{ flexGrow: 1, border: 0, minHeight: '400px' }}
                                                    src={`https://maps.google.com/maps?q=${selectedStore.latitude},${selectedStore.longitude}&z=15&output=embed`}
                                                    allowFullScreen
                                                ></iframe>
                                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.latitude},${selectedStore.longitude}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="btn btn-primary rounded-0 py-3 fw-bold shadow-none"
                                                    style={{ textDecoration: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                                                    📍 Cómo llegar (Google Maps)
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light p-5 text-center">
                                                <div className="display-1 mb-3">🏢</div>
                                                <h4 className="fw-bold mb-2">Ubicación No Disponible</h4>
                                                <p className="text-muted">Esta tienda no ha configurado sus coordenadas físicas en el mapa.</p>
                                            </div>
                                        )}
                                    </div>
                                </Col>
                            </Row>
                        ) : (
                            // FREE Store View (Only Map/Location)
                            <div className="p-5 text-center">
                                <div className="mb-4 d-inline-block p-4 rounded-circle bg-light shadow-sm">
                                    <FaStore size={40} className="text-secondary" />
                                </div>
                                <Badge bg="secondary" className="mb-3 px-3 py-2 rounded-pill fw-bold">Catálogo Digital</Badge>
                                <h2 className="fw-bold mb-2">{selectedStore?.companyName}</h2>
                                <p className="text-muted mb-5 mx-auto" style={{ maxWidth: '400px' }}>Esta tienda utiliza el catálogo digital para mostrar sus productos. Visítalos en su ubicación física en San Cristóbal.</p>

                                <div className="rounded-4 overflow-hidden border shadow-sm mb-5" style={{ height: '350px' }}>
                                    {selectedStore?.latitude && selectedStore?.longitude && selectedStore.latitude !== 0.0 ? (
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0 }}
                                            src={`https://maps.google.com/maps?q=${selectedStore.latitude},${selectedStore.longitude}&z=15&output=embed`}
                                            allowFullScreen
                                        ></iframe>
                                    ) : (
                                        <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light p-4 text-center">
                                            <div className="display-4 mb-2">📍</div>
                                            <h5 className="fw-bold mb-1">Ubicación Pendiente</h5>
                                            <p className="text-muted small">Contactar directo para obtener la dirección exacta.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="d-grid gap-2">
                                    <Button variant="primary" className="py-3 rounded-pill fw-bold shadow-sm" onClick={() => setShowStoreModal(false)}>
                                        Cerrar Vista
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal.Body>
            </Modal>

            {/* Exhibition Mode Modal */}
            <Modal show={showExhibitionModal} onHide={() => setShowExhibitionModal(false)} centered className="modal-premium">
                <Modal.Body className="p-5 text-center">
                    <div className="mb-4 d-inline-block p-4 rounded-circle bg-light shadow-sm">
                        <FaInfoCircle size={50} className="text-primary" />
                    </div>
                    <h3 className="fw-bold mb-3 text-gradient">Modo Exhibición</h3>
                    <p className="lead text-secondary mb-4">
                        La tienda <span className="fw-bold text-dark">{exhibitionStore}</span> utiliza nuestra plataforma como
                        catálogo digital.
                    </p>
                    <div className="alert alert-primary border-0 rounded-4 py-3 mb-4">
                        <small className="fw-bold">
                            Esta tienda no acepta pagos directos por este medio en este momento.
                            Te invitamos a visitarlos en su local o contactarlos directamente.
                        </small>
                    </div>
                    <Button variant="primary" className="w-100 py-3 rounded-pill fw-bold shadow-sm" onClick={() => setShowExhibitionModal(false)}>
                        Entendido
                    </Button>
                </Modal.Body>
            </Modal>

            {/* Checkout Modal */}
            <CheckoutModal
                show={showBuyModal}
                onHide={() => setShowBuyModal(false)}
                cart={cart}
                customerData={customerData}
                setCustomerData={setCustomerData}
                orderStatus={orderStatus}
                onOrderSubmit={handleOrderSubmit}
                platformConfig={platformConfig}
                formatSecondary={formatSecondary}
            />


            {/* Loyalty Program Modal */}
            <Modal show={showLoyaltyModal} onHide={() => setShowLoyaltyModal(false)} centered size="lg">
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Programa de Lealtad Tiendario 🎈</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <div className="text-center mb-4">
                        <div className="display-1 mb-3">⭐</div>
                        <h4>¡Gana mientras compras!</h4>
                        <p className="text-muted">Por cada $1 que gastes en cualquier tienda del marketplace, acumulas 1 punto.</p>
                    </div>

                    <Row className="g-3 mb-4">
                        <Col md={4}>
                            <Card className="h-100 border-0 bg-light text-center p-3">
                                <div className="h3 mb-2">🎁</div>
                                <h6 className="fw-bold">Canjea</h6>
                                <small>Usa tus puntos para obtener descuentos directos.</small>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="h-100 border-0 bg-light text-center p-3">
                                <div className="h3 mb-2">🚚</div>
                                <h6 className="fw-bold">Envíos Gratis</h6>
                                <small>Llega a Nivel Plata y olvídate de los costos de envío.</small>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="h-100 border-0 bg-light text-center p-3">
                                <div className="h3 mb-2">🔥</div>
                                <h6 className="fw-bold">Exclusividad</h6>
                                <small>Acceso anticipado a lanzamientos y ofertas flash.</small>
                            </Card>
                        </Col>
                    </Row>

                    <div className="bg-primary bg-opacity-10 p-4 rounded-4">
                        <h6 className="fw-bold mb-3"><FaGem className="text-primary me-2" /> Tus Beneficios Actuales</h6>
                        <ul className="mb-0">
                            <li><strong>10% OFF</strong> en tu siguiente compra mayor a $50.</li>
                            <li>Soporte prioritario como cliente frecuente.</li>
                            <li>Puntos que nunca vencen.</li>
                        </ul>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="primary" className="rounded-pill px-4" onClick={() => setShowLoyaltyModal(false)}>
                        ¡Entendido!
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Order Confirmation Modal (Click & Collect) */}
            <Modal show={showOrderConfirmation} onHide={() => setShowOrderConfirmation(false)} size="lg" centered className="modal-premium">
                <Modal.Body className="p-0 overflow-hidden rounded-4">
                    <div className="bg-success text-white p-4 text-center">
                        <div className="display-4 mb-2">✅</div>
                        <h3 className="fw-bold mb-1">Tu orden se ha enviado con éxito</h3>
                        <p className="mb-0 opacity-75">{confirmedOrder?.stores?.length > 1 ? 'Tu pedido ha sido distribuido entre las tiendas seleccionadas' : 'Tu pedido ha sido recibido por la tienda'}</p>
                    </div>

                    {confirmedOrder && (
                        <div className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                                <div>
                                    <small className="text-muted d-block">Número de Orden</small>
                                    <h5 className="fw-bold mb-0">{confirmedOrder.orderNumber}</h5>
                                </div>
                                <div className="text-end">
                                    <small className="text-muted d-block">Total a Pagar en Tiendas</small>
                                    <h4 className="fw-bold text-success mb-0">${confirmedOrder.total.toFixed(2)}</h4>
                                </div>
                            </div>

                            <Alert variant="info" className="rounded-4 border-0 mb-4">
                                <strong>💡 {confirmedOrder.stores.length > 1 ? 'Retiro en múltiples tiendas:' : 'Retiro en tienda:'}</strong> {confirmedOrder.stores.length > 1 ? 'Cada tienda preparará su parte del pedido por separado. Pagas y retiras directamente en cada local. Puedes modificar al llegar si lo necesitas.' : 'La tienda preparará tu pedido. Pagas y retiras directamente en el local. Puedes modificar al llegar si lo necesitas.'}
                            </Alert>

                            <h6 className="fw-bold mb-3 text-uppercase text-muted" style={{ letterSpacing: '1px', fontSize: '0.75rem' }}>
                                📦 {confirmedOrder.stores.length > 1 ? `Sub-órdenes por Tienda (${confirmedOrder.stores.length})` : 'Detalle de Orden'}
                            </h6>

                            {confirmedOrder.stores.map((store, idx) => {
                                const prepTime = 15 + Math.floor(Math.random() * 30);
                                const subTotal = store.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                                return (
                                    <div key={idx} className="border rounded-4 p-4 mb-3 bg-white shadow-sm">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <Badge bg="primary" className="mb-2 rounded-pill px-3">Sub-orden #{idx + 1}</Badge>
                                                <h5 className="fw-bold mb-1">{store.companyName}</h5>
                                                <small className="text-muted">⏱️ Tiempo estimado: <strong>{prepTime} min</strong></small>
                                            </div>
                                            <h5 className="fw-bold text-success">${subTotal.toFixed(2)}</h5>
                                        </div>

                                        <div className="bg-light rounded-3 p-3 mb-3">
                                            <h6 className="fw-bold small mb-2">Productos a retirar:</h6>
                                            {store.items.map((item, itemIdx) => (
                                                <div key={itemIdx} className="d-flex justify-content-between small py-1 border-bottom">
                                                    <span>{item.quantity}x {item.name}</span>
                                                    <span className="fw-bold">${(item.price * item.quantity).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <Row className="g-2">
                                            <Col sm={6}>
                                                <div className="bg-light rounded-3 p-3 h-100">
                                                    <small className="text-muted d-block mb-1">📍 Ubicación</small>
                                                    <small className="fw-bold">San Cristóbal, Táchira</small>
                                                    <br />
                                                    <a
                                                        href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-sm btn-outline-primary mt-2 rounded-pill"
                                                    >
                                                        Ver en Mapa
                                                    </a>
                                                </div>
                                            </Col>
                                            <Col sm={6}>
                                                <div className="bg-light rounded-3 p-3 h-100">
                                                    <small className="text-muted d-block mb-1">📞 Contacto</small>
                                                    <small className="fw-bold">+58 424 123 4567</small>
                                                    <br />
                                                    <Badge bg="warning" text="dark" className="mt-2">Pendiente de Preparación</Badge>
                                                </div>
                                            </Col>
                                        </Row>
                                    </div>
                                );
                            })}

                            <div className="d-grid mt-4">
                                <Button variant="primary" size="lg" className="rounded-pill fw-bold py-3 shadow" onClick={() => setShowOrderConfirmation(false)}>
                                    Entendido, Iré a Retirar
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* Auth Modals */}
            <LoginModal
                show={showLoginModal}
                onHide={() => setShowLoginModal(false)}
                loginData={loginData}
                setLoginData={setLoginData}
                loginError={loginError}
                loginLoading={loginLoading}
                onLogin={handleLogin}
                onSwitchToRegister={openRegister}
            />

            <RegisterModal
                show={showRegisterModal}
                onHide={() => setShowRegisterModal(false)}
                registerData={registerData}
                setRegisterData={setRegisterData}
                registerMessage={registerMessage}
                registerSuccess={registerSuccess}
                onRegister={handleRegister}
                onSwitchToLogin={openLogin}
            />

            {/* Footer */}
            <footer className="bg-dark text-white py-4 mt-5">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6 text-center text-md-start mb-3 mb-md-0">
                            <span className="fw-bold">Tiendario</span>
                            <span className="text-white-50 ms-2">© {new Date().getFullYear()} Antigravity Inc.</span>
                        </div>
                        <div className="col-md-6 text-center text-md-end">
                            <a href="/terms" className="text-white-50 text-decoration-none me-3 small hover-white">Términos de Servicio</a>
                            <a href="/privacy" className="text-white-50 text-decoration-none small hover-white">Política de Privacidad</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div >
    );
};

export default MarketplacePage;
