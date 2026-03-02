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
import { getCategoryEmoji } from '../utils/categoryEmoji';

const MarketplacePage = () => {
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
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
    const [cart, setCart] = useState([]);
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
    const user = AuthService.getCurrentUser();

    useEffect(() => {
        if (user && user.email) {
            SearchService.getCustomerPoints(user.email).then(
                res => setUserPoints(res.data.points || 0),
                err => { if (process.env.NODE_ENV === 'development') console.error("Error loading points", err); }
            );
        }
    }, [user]);

    useEffect(() => {
        loadProducts();
        loadConfig();
    }, []);

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
        applyFilters();
    }, [searchQuery, products, priceRange, selectedStores, sortBy, selectedCategory]);

    const applyFilters = () => {
        let filtered = [...products];

        // Category Filter (Restrict search to this category if selected)
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(p =>
                p.category && p.category.toLowerCase() === selectedCategory.toLowerCase()
            );
        }

        // Search Query (Text search within the filtered set)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
            );
        }

        // Price Range
        if (priceRange.min) {
            filtered = filtered.filter(p => p.price >= parseFloat(priceRange.min));
        }
        if (priceRange.max) {
            filtered = filtered.filter(p => p.price <= parseFloat(priceRange.max));
        }

        // Store Filter
        if (selectedStores.length > 0) {
            filtered = filtered.filter(p => selectedStores.includes(p.companyName));
        }

        // Sorting
        if (sortBy === 'price_asc') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price_desc') {
            filtered.sort((a, b) => b.price - a.price);
        } else if (sortBy === 'name_asc') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        }

        setFilteredProducts(filtered);
    };

    const loadProducts = () => {
        setLoading(true);
        SearchService.getAllProducts().then(
            (response) => {
                const data = Array.isArray(response.data) ? response.data : [];
                setProducts(data);
                setFilteredProducts(data);
                setLoading(false);
            },
            (error) => {
                console.error('Error loading products', error);
                setProducts([]);
                setFilteredProducts([]);
                setLoading(false);
            }
        );
    };

    const handleSearch = () => {
        if (searchQuery.trim()) {
            SearchService.searchProducts(searchQuery).then(
                (response) => {
                    setFilteredProducts(response.data);
                },
                (error) => {
                    console.error('Error searching products', error);
                }
            );
        }
    };

    const handleDetailClick = (product) => {
        setSelectedProduct(product);
        setShowDetailModal(true);
        SearchService.getSellersByName(product.name).then(
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
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            setCart(cart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
        setToastMessage(`¡${product.name} agregado al carrito!`);
        setShowToast(true);
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
            window.location.href = '/login';
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

    // Helper for full image URL
    const getFullImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') + path;
    };

    return (
        <div className="bg-light min-vh-100 pb-5">
            <MarketplaceNavbar onLoginClick={() => setShowLoginModal(true)} onRegisterClick={() => setShowRegisterModal(true)} />
            {platformConfig?.announcementMessage && (
                <div className="bg-primary text-white py-2 text-center small fw-bold shadow-sm announce-bar">
                    <FaInfoCircle className="me-2" /> {platformConfig.announcementMessage}
                </div>
            )}
            {/* Premium Header */}
            <div className="py-5 shadow-sm" style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: 'white',
                borderRadius: '0 0 40px 40px'
            }}>
                <Container>
                    <Row className="align-items-center">
                        <Col lg={12} className="text-center">
                            <div className="d-flex justify-content-center align-items-center gap-2 mb-3">
                                <span className="p-2 bg-white text-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                    <FaStore size={20} />
                                </span>
                                <h3 className="fw-bold mb-0 text-white me-3" style={{ letterSpacing: '-0.5px' }}>Tiendario</h3>
                                <Badge bg="primary" className="px-3 py-2 rounded-pill fw-bold">Marketplace Global v1.0</Badge>
                                {user && (
                                    <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill fw-bold">
                                        ⭐ {userPoints} Puntos acumulados
                                    </Badge>
                                )}
                                {!user && (
                                    <Button variant="outline-light" size="sm" className="rounded-pill px-3 ms-2" onClick={() => setShowLoginModal(true)}>
                                        <FaLock className="me-2" /> Iniciar Sesión / Puntos
                                    </Button>
                                )}
                            </div>
                            <h1 className="display-4 fw-bold mb-3 text-white">Tu Mercado Local, <span className="text-primary italic">en un solo clic</span>.</h1>
                            <p className="lead opacity-75 mb-5 mx-auto" style={{ maxWidth: '800px' }}>Sincroniza tu inventario y compra directo a las mejores tiendas de tu ciudad.</p>

                            <div className="d-flex justify-content-center">
                                <InputGroup size="lg" className="w-75 shadow-lg rounded-pill overflow-hidden bg-white p-1 mb-4">
                                    <InputGroup.Text className="bg-white border-0 ps-3"><FaSearch className="text-muted" /></InputGroup.Text>
                                    <Form.Control
                                        className="border-0 py-3"
                                        placeholder="¿Qué estás buscando hoy?"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        style={{ boxShadow: 'none' }}
                                    />
                                    <Button variant="primary" className="rounded-pill px-5 mx-1" onClick={handleSearch}>Buscar</Button>
                                </InputGroup>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            <Container className="mt-n4 position-relative" style={{ zIndex: 10 }}>
                {/* Stats Bar */}
                <Card className="border-0 shadow-sm rounded-4 mb-5">
                    <Card.Body className="py-4">
                        <Row className="text-center align-items-center">
                            <Col md={4} className="border-end">
                                <h4 className="fw-bold text-primary mb-0">{products.length}+</h4>
                                <small className="text-muted text-uppercase fw-bold">Productos Activos</small>
                            </Col>
                            <Col md={4} className="border-end">
                                <h4 className="fw-bold text-success mb-0">{featuredStores.length}</h4>
                                <small className="text-muted text-uppercase fw-bold">Tiendas Asociadas</small>
                            </Col>
                            <Col md={4}>
                                <div className="text-warning">
                                    <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                                </div>
                                <small className="text-muted text-uppercase fw-bold">Confianza Verificada</small>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Main Content Area */}
                <Row>
                    {/* Left Sidebar - Categories & Filters */}
                    <Col lg={3}>
                        <Card className="border-0 shadow-sm rounded-4 mb-4">
                            <Card.Body>
                                <h6 className="fw-bold mb-3">Categorías Dinámicas</h6>
                                <Nav className="flex-column nav-pills-custom">
                                    <Nav.Link active={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')} className="mb-2 rounded-3">Todos los Productos</Nav.Link>
                                    {[...new Set(products.map(p => p.category).filter(Boolean))].map((cat, idx) => (
                                        <Nav.Link
                                            key={idx}
                                            active={selectedCategory === cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className="mb-2 rounded-3 text-capitalize"
                                        >
                                            {getCategoryEmoji(cat)} {cat}
                                        </Nav.Link>
                                    ))}
                                </Nav>
                                <hr />
                                <h6 className="fw-bold mb-3">Rango de Precio</h6>
                                <Row className="g-2 mb-3">
                                    <Col>
                                        <Form.Control
                                            size="sm"
                                            type="number"
                                            placeholder="Min"
                                            value={priceRange.min}
                                            onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                                        />
                                    </Col>
                                    <Col>
                                        <Form.Control
                                            size="sm"
                                            type="number"
                                            placeholder="Max"
                                            value={priceRange.max}
                                            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                                        />
                                    </Col>
                                </Row>
                                <hr />
                                <h6 className="fw-bold mb-3">Filtrar por Tienda</h6>
                                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                    {featuredStores.map((store, i) => (
                                        <Form.Check
                                            key={i}
                                            type="checkbox"
                                            id={`store-${i}`}
                                            label={store}
                                            className="small mb-1"
                                            checked={selectedStores.includes(store)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedStores([...selectedStores, store]);
                                                } else {
                                                    setSelectedStores(selectedStores.filter(s => s !== store));
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 mt-2 text-decoration-none text-muted"
                                    onClick={() => {
                                        setPriceRange({ min: '', max: '' });
                                        setSelectedStores([]);
                                    }}
                                >
                                    Limpiar filtros
                                </Button>
                            </Card.Body>
                        </Card>

                        {/* Banner */}
                        <Card className="border-0 bg-primary text-white rounded-4 overflow-hidden shadow-sm">
                            <Card.Body className="p-4 text-center">
                                <div className="display-4 mb-2">🎈</div>
                                <h5 className="fw-bold">Programa de Lealtad</h5>
                                <p className="small mb-3">
                                    {user ? '¡Ya eres parte! Acumulas 1 punto por cada $1 de compra.' : 'Registrate como cliente y obtén 10% de descuento en tu primera compra.'}
                                </p>
                                <Button
                                    variant="light"
                                    size="sm"
                                    className="w-100 fw-bold rounded-pill text-primary"
                                    onClick={() => setShowLoyaltyModal(true)}
                                >
                                    {user ? 'Ver mis recompensas' : 'Saber más'}
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Main Grid */}
                    <Col lg={9}>
                        {loading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-3 text-muted">Explorando el mercado para ti...</p>
                            </div>
                        ) : (
                            <>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h4 className="fw-bold mb-0">Catálogo Global</h4>
                                    <div className="d-flex align-items-center gap-3">
                                        <Form.Select
                                            size="sm"
                                            className="rounded-pill border-0 shadow-sm px-3"
                                            style={{ width: '180px' }}
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                        >
                                            <option value="relevant">Más relevantes</option>
                                            <option value="price_asc">Mejor precio primero</option>
                                            <option value="price_desc">Más exclusivos primero</option>
                                            <option value="name_asc">Orden A-Z</option>
                                        </Form.Select>
                                        <div className="text-muted small">Mostrando {filteredProducts.length} productos disponibles</div>
                                    </div>
                                </div>

                                <Row>
                                    {filteredProducts.map((product) => (
                                        <Col key={product.id} xs={12} sm={6} lg={4} className="mb-4 animate-fade-in">
                                            <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden product-card-v2"
                                                onClick={() => handleDetailClick(product)} style={{ cursor: 'pointer' }}>
                                                <div className="position-relative">
                                                    <div className="bg-light d-flex align-items-center justify-content-center overflow-hidden" style={{ height: '220px' }}>
                                                        {product.imageUrl ? (
                                                            <img
                                                                src={getFullImageUrl(product.imageUrl)}
                                                                alt={product.name}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                className="product-img-zoom"
                                                            />
                                                        ) : (
                                                            <span style={{ fontSize: '70px' }}>
                                                                {getCategoryEmoji(product.category)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Card.Body className="p-4">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <h6 className="fw-bold mb-0 text-truncate">{product.name}</h6>
                                                        {['PAID', 'TRIAL'].includes(product.subscriptionStatus) ? (
                                                            <div className="text-end">
                                                                <div className="text-success fw-bold">Desde ${product.price}</div>
                                                                {platformConfig?.enableSecondaryCurrency && (
                                                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>{formatSecondary(product.price)}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted small">Consultar Precio</span>
                                                        )}
                                                    </div>

                                                    <p className="text-muted small mb-3 text-truncate-2" style={{ height: '40px', fontSize: '0.8rem' }}>
                                                        {product.description || 'Sin descripción disponible.'}
                                                    </p>

                                                    <Button variant="outline-primary" className="w-100 rounded-pill fw-bold"
                                                        onClick={(e) => { e.stopPropagation(); handleDetailClick(product); }}>
                                                        Ver tiendas y precios
                                                    </Button>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>

                                {filteredProducts.length === 0 && (
                                    <div className="text-center py-5">
                                        <div className="opacity-25 display-1 mb-3">🔍</div>
                                        <h5 className="fw-bold">No encontramos coincidencias</h5>
                                        <p className="text-muted">Intenta con otros términos o explora las categorías principales.</p>
                                        <Button variant="outline-primary" className="rounded-pill px-4" onClick={() => setSearchTerm('')}>Ver Todo el Catálogo</Button>
                                    </div>
                                )}
                            </>
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
            />

            {/* Notification Toast */}
            <ToastContainer position="bottom-center" className="pb-5 mb-5" style={{ zIndex: 3000 }}>
                <Toast
                    onClose={() => setShowToast(false)}
                    show={showToast}
                    delay={3000}
                    autohide
                    className="border-0 shadow-lg rounded-pill overflow-hidden animate-fade-in"
                    style={{
                        background: 'rgba(15, 23, 42, 0.9)',
                        backdropFilter: 'blur(10px)',
                        minWidth: '250px'
                    }}
                >
                    <Toast.Body className="text-white py-3 px-4 d-flex align-items-center justify-content-center gap-2 fw-bold">
                        <span style={{ fontSize: '1.2rem' }}>🎉</span>
                        {toastMessage}
                    </Toast.Body>
                </Toast>
            </ToastContainer>

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
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            frameBorder="0"
                                            style={{ border: 0, minHeight: '500px' }}
                                            srcDoc={`
                                                <div style="width:100%;height:100%;background:#e5dbff;background-image:radial-gradient(#3b82f6 0.5px, #e5dbff 0.5px);background-size:20px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:20px;text-align:center;">
                                                    <div style="font-size:60px;margin-bottom:20px;filter:drop-shadow(0 10px 10px rgba(0,0,0,0.1));">🏢</div>
                                                    <h4 style="margin:0 0 10px;color:#1e3a8a;">San Cristóbal, Táchira</h4>
                                                    <p style="color:#4b5563;margin-bottom:30px;font-size:14px;">Coordenadas: ${selectedStore?.latitude || 7.76}, ${selectedStore?.longitude || -72.22}</p>
                                                    <a href="https://www.google.com/maps/dir/?api=1&destination=${selectedStore?.latitude},${selectedStore?.longitude}" 
                                                       target="_blank" 
                                                       style="background:#3b82f6;color:white;padding:18px 40px;border-radius:40px;text-decoration:none;font-weight:bold;box-shadow:0 15px 30px rgba(59,130,246,0.4);display:inline-block;transition:transform 0.2s;">
                                                       📍 Cómo llegar (Google Maps)
                                                    </a>
                                                    <p style="margin-top:20px;font-size:12px;color:#6b7280;">Estamos a pocos minutos de ti en el centro de San Cristóbal.</p>
                                                </div>
                                            `}
                                            allowFullScreen
                                        ></iframe>
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
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        srcDoc={`
                                            <div style="width:100%;height:100%;background:#f3f4f6;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;">
                                                <div style="font-size:50px;margin-bottom:15px;">📍</div>
                                                <b style="font-size:18px;color:#374151;">Ubicación en San Cristóbal</b>
                                                <p style="color:#6b7280;margin:10px 0;">Punto referencial: ${selectedStore?.latitude}, ${selectedStore?.longitude}</p>
                                                <p style="font-size:12px;color:#9ca3af;margin-top:20px;">Contacto directo para compras y pedidos.</p>
                                            </div>
                                        `}
                                    ></iframe>
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
                        <h3 className="fw-bold mb-1">¡Orden Confirmada!</h3>
                        <p className="mb-0 opacity-75">Tu reserva ha sido enviada a las tiendas</p>
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
                                <strong>💡 Click & Collect:</strong> Cada tienda preparará su parte del pedido por separado.
                                Pagas y retiras directamente en cada local. Puedes modificar al llegar si lo necesitas.
                            </Alert>

                            <h6 className="fw-bold mb-3 text-uppercase text-muted" style={{ letterSpacing: '1px', fontSize: '0.75rem' }}>
                                📦 Sub-órdenes por Tienda ({confirmedOrder.stores.length})
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
