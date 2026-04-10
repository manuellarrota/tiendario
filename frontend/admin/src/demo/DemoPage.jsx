import React, { useState } from 'react';
import {
    Container, Row, Col, Card, Badge, Button, Table,
    Form, InputGroup, Alert, Nav
} from 'react-bootstrap';
import {
    FaStore, FaRocket, FaChartBar, FaBoxes, FaShoppingCart,
    FaSearch, FaReceipt, FaGlobe, FaClock, FaCog,
    FaTimesCircle, FaCheck, FaBolt, FaArrowRight
} from 'react-icons/fa';
import {
    DEMO_PRODUCTS, DEMO_SUMMARY, DEMO_RECENT_SALES,
    DEMO_STORE, DEMO_SALES_CHART
} from './DemoData';
import DemoMarketPreview from './DemoMarketPreview';
import { useNavigate } from 'react-router-dom';

/**
 * DemoPage — Modo demo interactivo de Tiendario.
 * Ruta pública /demo — sin autenticación.
 * Muestra Dashboard, POS e Inventario con datos ficticios.
 * Incluye acceso a vitrina del Marketplace embebida.
 */
const DemoPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showMarket, setShowMarket] = useState(false);

    // POS State
    const [posSearch, setPosSearch] = useState('');
    const [posCart, setPosCart] = useState([]);
    const [posSaleSuccess, setPosSaleSuccess] = useState(false);

    const posResults = posSearch.length > 1
        ? DEMO_PRODUCTS.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()))
        : [];

    const addToPos = (product) => {
        setPosCart(prev => {
            const exists = prev.find(i => i.id === product.id);
            if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...product, qty: 1 }];
        });
        setPosSearch('');
    };

    const posTotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);

    const handlePosSale = () => {
        setPosSaleSuccess(true);
        setTimeout(() => {
            setPosCart([]);
            setPosSaleSuccess(false);
        }, 2000);
    };

    const maxBar = Math.max(...DEMO_SALES_CHART.map(d => d.amount));

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>

            {/* Demo Banner */}
            <div style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)', padding: '10px 24px' }}
                className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2 text-white">
                    <span style={{ fontSize: '1.1rem' }}>🎭</span>
                    <strong>Modo Demostración</strong>
                    <span className="opacity-75 d-none d-md-inline">— Todos los datos son ficticios. Explora sin límites.</span>
                </div>
                <Button
                    variant="dark"
                    size="sm"
                    className="rounded-pill px-4 fw-bold"
                    onClick={() => navigate('/')}
                >
                    ✨ Crear mi tienda gratis →
                </Button>
            </div>

            {/* Sidebar + Content */}
            <div className="d-flex" style={{ minHeight: 'calc(100vh - 46px)' }}>

                {/* Sidebar */}
                <div className="d-none d-md-flex flex-column p-3 bg-white shadow-sm"
                    style={{ width: '220px', minHeight: '100%', borderRight: '1px solid #e2e8f0' }}>
                    <div className="d-flex align-items-center gap-2 px-2 py-3 mb-3">
                        <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white"
                            style={{ width: 36, height: 36 }}>
                            <FaStore size={16} />
                        </div>
                        <div>
                            <div className="fw-bold small text-dark" style={{ lineHeight: 1.2 }}>{DEMO_STORE.name}</div>
                            <Badge bg="warning" text="dark" pill style={{ fontSize: '0.6rem' }}>Demo</Badge>
                        </div>
                    </div>

                    <Nav className="flex-column gap-1">
                        {[
                            { key: 'dashboard', icon: <FaChartBar />, label: 'Dashboard' },
                            { key: 'pos', icon: <FaBolt />, label: 'Punto de Venta' },
                            { key: 'inventory', icon: <FaBoxes />, label: 'Inventario' },
                        ].map(item => (
                            <button
                                key={item.key}
                                className={`btn d-flex align-items-center gap-2 text-start px-3 py-2 rounded-3 small fw-medium ${activeTab === item.key ? 'btn-primary' : 'btn-light text-secondary'}`}
                                onClick={() => setActiveTab(item.key)}
                            >
                                {item.icon} {item.label}
                            </button>
                        ))}

                        <hr className="my-2" />
                        <button
                            className="btn btn-success d-flex align-items-center gap-2 text-start px-3 py-2 rounded-3 small fw-bold"
                            onClick={() => setShowMarket(true)}
                        >
                            <FaGlobe /> Ver mi Vitrina →
                        </button>
                    </Nav>

                    <div className="mt-auto px-2 pb-2">
                        <div className="bg-primary bg-opacity-10 rounded-3 p-3 text-center">
                            <div className="text-primary fw-bold small mb-1">🚀 {DEMO_STORE.daysLeft} días de prueba</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>Acceso completo sin costo</div>
                        </div>
                    </div>
                </div>

                {/* Mobile Nav */}
                <div className="d-md-none w-100 bg-white border-bottom px-3 py-2 d-flex gap-2 overflow-auto position-sticky top-0" style={{ zIndex: 10 }}>
                    {['dashboard', 'pos', 'inventory'].map(tab => (
                        <button
                            key={tab}
                            className={`btn btn-sm rounded-pill flex-shrink-0 ${activeTab === tab ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'dashboard' ? 'Dashboard' : tab === 'pos' ? 'POS' : 'Inventario'}
                        </button>
                    ))}
                    <button className="btn btn-sm btn-success rounded-pill flex-shrink-0" onClick={() => setShowMarket(true)}>
                        🌐 Vitrina
                    </button>
                </div>

                {/* Main content */}
                <div className="flex-grow-1 p-4" style={{ maxWidth: '100%', overflowX: 'hidden' }}>

                    {/* ═══════════════════ DASHBOARD ═══════════════════ */}
                    {activeTab === 'dashboard' && (
                        <>
                            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                                <div>
                                    <h2 className="fw-bold mb-0" style={{ color: '#1e293b' }}>Panel de Control</h2>
                                    <p className="text-muted small mb-0">Gestiona tu negocio en tiempo real.</p>
                                </div>
                                <Badge bg="info" pill className="px-3 py-2">Plan Trial — 28 días restantes</Badge>
                            </div>

                            {/* KPI Cards */}
                            <Row className="g-3 mb-4">
                                {[
                                    { label: 'Ventas Hoy', value: `$${DEMO_SUMMARY.revenueToday.toFixed(2)}`, change: '↓ 45% vs ayer', changeColor: 'text-danger', border: 'border-primary' },
                                    { label: 'Ticket Promedio', value: `$${DEMO_SUMMARY.shopAov.toFixed(2)}`, change: 'Promedio por venta', changeColor: 'text-muted', border: 'border-warning' },
                                    { label: 'Inventario', value: `${DEMO_SUMMARY.totalProducts} productos`, change: '2 con stock bajo', changeColor: 'text-danger', border: 'border-dark' },
                                    { label: 'Pedidos Pendientes', value: `${DEMO_SUMMARY.pendingOrders}`, change: 'Esperando atención', changeColor: 'text-warning', border: 'border-danger' },
                                ].map((kpi, i) => (
                                    <Col key={i} lg={3} md={6}>
                                        <Card className={`border-0 shadow-sm h-100 border-start border-4 ${kpi.border}`} style={{ borderRadius: '12px' }}>
                                            <Card.Body className="p-4">
                                                <div className="text-secondary small text-uppercase fw-bold mb-2" style={{ letterSpacing: '0.5px' }}>
                                                    {kpi.label}
                                                </div>
                                                <h3 className="fw-bold text-dark mb-1">{kpi.value}</h3>
                                                <small className={kpi.changeColor}>{kpi.change}</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>

                            <Row className="g-3 mb-4">
                                {/* Sales chart */}
                                <Col lg={7}>
                                    <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                                        <Card.Body className="p-4">
                                            <h6 className="fw-bold mb-4">Ventas — Últimos 7 días</h6>
                                            <div className="d-flex align-items-end gap-2" style={{ height: '120px' }}>
                                                {DEMO_SALES_CHART.map((d, i) => (
                                                    <div key={i} className="d-flex flex-column align-items-center flex-grow-1 h-100">
                                                        <div className="flex-grow-1 d-flex align-items-end w-100">
                                                            <div
                                                                className="w-100 rounded-top"
                                                                style={{
                                                                    height: `${(d.amount / maxBar) * 100}%`,
                                                                    background: d.day === 'Hoy'
                                                                        ? 'linear-gradient(180deg, #3b82f6, #1d4ed8)'
                                                                        : '#dbeafe',
                                                                    transition: 'height 0.4s ease',
                                                                    minHeight: '8px'
                                                                }}
                                                                title={`$${d.amount}`}
                                                            />
                                                        </div>
                                                        <small className="text-muted mt-1" style={{ fontSize: '0.65rem' }}>{d.day}</small>
                                                        <small className="fw-bold" style={{ fontSize: '0.65rem' }}>${d.amount}</small>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>

                                {/* Orders status */}
                                <Col lg={5}>
                                    <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                                        <Card.Body className="p-4">
                                            <h6 className="fw-bold mb-3">Estado de Pedidos</h6>
                                            <div className="d-flex flex-column gap-3">
                                                {[
                                                    { label: 'Recibidos', value: DEMO_SUMMARY.pendingOrders, color: 'warning', icon: <FaClock /> },
                                                    { label: 'En Preparación', value: DEMO_SUMMARY.preparingOrders, color: 'primary', icon: <FaCog /> },
                                                    { label: 'Listos', value: DEMO_SUMMARY.readyOrders, color: 'info', icon: <FaReceipt /> },
                                                    { label: 'Cancelados', value: DEMO_SUMMARY.cancelledOrders, color: 'danger', icon: <FaTimesCircle /> },
                                                ].map((item, i) => (
                                                    <div key={i} className="d-flex align-items-center justify-content-between">
                                                        <span className="text-muted small d-flex align-items-center gap-2">
                                                            {item.icon} {item.label}
                                                        </span>
                                                        <Badge bg={item.color} pill>{item.value}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Recent sales */}
                            <Card className="border-0 shadow-sm mb-3" style={{ borderRadius: '12px' }}>
                                <Card.Body className="p-4">
                                    <h6 className="fw-bold mb-3">Últimas Ventas</h6>
                                    <div className="table-responsive">
                                        <Table hover size="sm" className="mb-0">
                                            <thead className="text-muted small">
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Cliente</th>
                                                    <th>Método</th>
                                                    <th className="text-end">Total</th>
                                                    <th className="text-end">Tiempo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {DEMO_RECENT_SALES.map(sale => (
                                                    <tr key={sale.id}>
                                                        <td><code className="small">{sale.id}</code></td>
                                                        <td className="fw-medium">{sale.customer}</td>
                                                        <td><Badge bg="light" text="secondary" className="rounded-pill">{sale.method}</Badge></td>
                                                        <td className="text-end fw-bold text-success">${sale.total.toFixed(2)}</td>
                                                        <td className="text-end text-muted small">{sale.time}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Market CTA */}
                            <Card className="border-0 shadow-sm" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
                                <Card.Body className="p-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="bg-primary rounded-3 p-3 text-white"><FaGlobe size={20} /></div>
                                        <div>
                                            <h6 className="fw-bold mb-0">Tus productos ya aparecen en el Marketplace</h6>
                                            <small className="text-muted">Clientes en San Cristóbal pueden encontrarte ahora mismo.</small>
                                        </div>
                                    </div>
                                    <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => setShowMarket(true)}>
                                        Ver mi vitrina <FaArrowRight className="ms-1" size={12} />
                                    </Button>
                                </Card.Body>
                            </Card>
                        </>
                    )}

                    {/* ═══════════════════ POS ═══════════════════ */}
                    {activeTab === 'pos' && (
                        <>
                            <h2 className="fw-bold mb-4" style={{ color: '#1e293b' }}>Punto de Venta</h2>
                            <Row className="g-4">
                                <Col lg={7}>
                                    <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                                        <Card.Body className="p-4">
                                            <InputGroup className="mb-3">
                                                <InputGroup.Text className="bg-white border-end-0">
                                                    <FaSearch className="text-muted" />
                                                </InputGroup.Text>
                                                <Form.Control
                                                    placeholder="Buscar producto por nombre o código..."
                                                    value={posSearch}
                                                    onChange={e => setPosSearch(e.target.value)}
                                                    className="border-start-0 py-2"
                                                    style={{ boxShadow: 'none' }}
                                                />
                                            </InputGroup>

                                            {posResults.length > 0 && (
                                                <div className="border rounded-3 overflow-hidden mb-3">
                                                    {posResults.slice(0, 5).map(p => (
                                                        <div
                                                            key={p.id}
                                                            className="d-flex align-items-center justify-content-between p-3 border-bottom hover-bg-light"
                                                            style={{ cursor: 'pointer', background: 'white' }}
                                                            onClick={() => addToPos(p)}
                                                        >
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span style={{ fontSize: '1.3rem' }}>{p.image}</span>
                                                                <div>
                                                                    <div className="fw-medium small">{p.name}</div>
                                                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                                        Stock: {p.stock} · {p.barcode}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span className="fw-bold text-success">${p.price.toFixed(2)}</span>
                                                                <Badge bg="primary" pill>+</Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {posSearch.length > 1 && posResults.length === 0 && (
                                                <p className="text-muted text-center small py-3">Sin resultados para "{posSearch}"</p>
                                            )}

                                            {posSearch.length === 0 && (
                                                <div className="text-center text-muted py-4">
                                                    <FaSearch size={24} className="mb-2 opacity-25" />
                                                    <p className="small mb-0">Escribe para buscar productos del inventario</p>
                                                    <p className="small opacity-50">Ej: "tornillos", "pintura", "cable"</p>
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>

                                <Col lg={5}>
                                    <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                                        <Card.Body className="p-4">
                                            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                                <FaShoppingCart /> Carrito
                                            </h6>

                                            {posSaleSuccess && (
                                                <Alert variant="success" className="text-center rounded-3 border-0 py-3">
                                                    <FaCheck className="me-2" /> ¡Venta Registrada! (Demo)
                                                </Alert>
                                            )}

                                            {posCart.length === 0 && !posSaleSuccess ? (
                                                <div className="text-center text-muted py-4">
                                                    <FaShoppingCart size={28} className="mb-2 opacity-25" />
                                                    <p className="small">El carrito está vacío</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {posCart.map(item => (
                                                        <div key={item.id} className="d-flex align-items-center justify-content-between mb-2 p-2 bg-light rounded-3">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span>{item.image}</span>
                                                                <div>
                                                                    <div className="small fw-medium" style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {item.name}
                                                                    </div>
                                                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>{item.qty}x ${item.price.toFixed(2)}</div>
                                                                </div>
                                                            </div>
                                                            <span className="fw-bold small text-success">${(item.qty * item.price).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                    <hr />
                                                    <div className="d-flex justify-content-between fw-bold mb-3">
                                                        <span>Total</span>
                                                        <span className="text-success fs-5">${posTotal.toFixed(2)}</span>
                                                    </div>
                                                    <Button
                                                        variant="primary"
                                                        className="w-100 rounded-pill fw-bold py-2 shadow-sm"
                                                        onClick={handlePosSale}
                                                    >
                                                        <FaBolt className="me-1" /> Cobrar (Demo)
                                                    </Button>
                                                </>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}

                    {/* ═══════════════════ INVENTORY ═══════════════════ */}
                    {activeTab === 'inventory' && (
                        <>
                            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                                <h2 className="fw-bold mb-0" style={{ color: '#1e293b' }}>Inventario</h2>
                                <Button variant="success" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => setShowMarket(true)}>
                                    <FaGlobe className="me-2" size={13} /> Así te ven tus clientes →
                                </Button>
                            </div>

                            <Card className="border-0 shadow-sm mb-3" style={{ borderRadius: '12px' }}>
                                <Card.Body className="p-0">
                                    <div className="table-responsive">
                                        <Table hover className="mb-0">
                                            <thead style={{ background: '#f8fafc' }}>
                                                <tr className="text-muted small text-uppercase">
                                                    <th className="px-4 py-3">Producto</th>
                                                    <th>Categoría</th>
                                                    <th>SKU</th>
                                                    <th className="text-end">Precio</th>
                                                    <th className="text-end">Stock</th>
                                                    <th className="text-center">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {DEMO_PRODUCTS.map(product => (
                                                    <tr key={product.id}>
                                                        <td className="px-4 py-3">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span style={{ fontSize: '1.3rem' }}>{product.image}</span>
                                                                <span className="fw-medium small">{product.name}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <Badge bg="light" text="secondary" className="rounded-pill small">
                                                                {product.category}
                                                            </Badge>
                                                        </td>
                                                        <td><code className="small text-muted">{product.barcode}</code></td>
                                                        <td className="text-end fw-bold text-success small">${product.price.toFixed(2)}</td>
                                                        <td className="text-end">
                                                            <span className={`fw-bold small ${product.stock < 30 ? 'text-danger' : 'text-dark'}`}>
                                                                {product.stock}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            <Badge bg={product.stock < 30 ? 'danger' : 'success'} pill style={{ fontSize: '0.65rem' }}>
                                                                {product.stock < 30 ? '⚠ Stock bajo' : '✓ Disponible'}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Card.Body>
                            </Card>

                            <Alert variant="primary" className="border-0 rounded-3 d-flex align-items-center gap-3">
                                <FaGlobe size={20} />
                                <div>
                                    <strong>Estos productos ya están publicados en el Marketplace.</strong>
                                    {' '}Cada producto que agregas se sincroniza automáticamente para que tus clientes te encuentren.
                                    {' '}<button className="btn btn-link p-0 fw-bold" onClick={() => setShowMarket(true)}>
                                        Ver cómo te ven tus clientes →
                                    </button>
                                </div>
                            </Alert>
                        </>
                    )}
                </div>
            </div>

            {/* Market Preview Modal */}
            <DemoMarketPreview show={showMarket} onHide={() => setShowMarket(false)} />
        </div>
    );
};

export default DemoPage;
