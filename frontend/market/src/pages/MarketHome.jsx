import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner, Form, InputGroup, Button, Card, Badge } from 'react-bootstrap';
import { FaSearch, FaMapMarkerAlt, FaStore, FaTshirt, FaRunning, FaBlender } from 'react-icons/fa';
import MarketService from '../services/market.service';
import ProductCard from '../components/ProductCard';

const MarketHome = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        MarketService.getAllProducts().then(
            (response) => {
                setProducts(response.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching products", error);
                setLoading(false);
            }
        );
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const categories = [
        { name: 'Ropa', icon: <FaTshirt />, color: '#6366f1' },
        { name: 'Deportes', icon: <FaRunning />, color: '#ef4444' },
        { name: 'Hogar', icon: <FaBlender />, color: '#10b981' },
        { name: 'Electrónica', icon: '📱', color: '#f59e0b' },
    ];

    return (
        <div className="market-home">
            {/* Hero Section */}
            <div className="hero-section py-5 mb-5 text-white" style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%)',
                borderRadius: '0 0 50px 50px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}></div>
                <div style={{ position: 'absolute', bottom: '-50px', left: '10%', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }}></div>

                <Container>
                    <Row className="align-items-center">
                        <Col lg={7} className="text-center text-lg-start">
                            <Badge bg="light" text="primary" className="mb-3 px-3 py-2 rounded-pill fw-bold">
                                🚀 Nueva Versión 1.0 disponible
                            </Badge>
                            <h1 className="fw-bolder mb-3 display-3 text-white">
                                Todo lo que necesitas, <span style={{ color: '#818cf8' }}>en un solo lugar</span>
                            </h1>
                            <p className="lead mb-4 opacity-75" style={{ fontSize: '1.25rem' }}>
                                Explora el inventario compartido de cientos de tiendas locales.
                                Compra directo, seguro y rápido.
                            </p>

                            <div className="d-flex justify-content-center justify-content-lg-start">
                                <InputGroup className="mb-3 w-75 shadow-lg rounded-pill overflow-hidden bg-white p-1">
                                    <InputGroup.Text className="bg-white border-0 ps-3">
                                        <FaSearch className="text-primary" />
                                    </InputGroup.Text>
                                    <Form.Control
                                        placeholder="Buscar productos, marcas, categorías..."
                                        className="border-0 py-3 fs-5"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ boxShadow: 'none' }}
                                    />
                                    <Button variant="primary" className="rounded-pill px-4 mx-1">
                                        Buscar
                                    </Button>
                                </InputGroup>
                            </div>
                        </Col>
                        <Col lg={5} className="d-none d-lg-block text-center">
                            <div className="hero-emoji" style={{ fontSize: '180px', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))' }}>
                                🛍️
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            <Container>
                {/* Quick Categories */}
                <div className="mb-5">
                    <h5 className="fw-bold mb-4 text-dark d-flex align-items-center">
                        <span className="me-2">🗂️</span> Explorar Categorías
                    </h5>
                    <Row className="g-3">
                        {categories.map((cat, idx) => (
                            <Col key={idx} xs={6} md={3}>
                                <Card
                                    className="border-0 shadow-sm category-card text-center py-4 h-100"
                                    style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                    onClick={() => setSearchTerm(cat.name)}
                                >
                                    <div className="fs-1 mb-2" style={{ color: cat.color }}>{cat.icon}</div>
                                    <h6 className="fw-bold mb-0">{cat.name}</h6>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>

                {/* Main Content */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="fw-bold mb-0 text-dark">
                        {searchTerm ? `Resultados para "${searchTerm}"` : '✨ Productos destacados'}
                    </h4>
                    {!searchTerm && <Badge bg="primary" className="bg-opacity-10 text-primary px-3">Ver Todos</Badge>}
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-3 text-muted">Buscando los mejores productos...</p>
                    </div>
                ) : (
                    <>
                        {filteredProducts.length === 0 ? (
                            <Card className="border-0 shadow-sm py-5 text-center">
                                <Card.Body>
                                    <div className="fs-1 opacity-25 mb-3">🔍</div>
                                    <h4>No encontramos productos 😢</h4>
                                    <p className="text-muted">Intenta con otra palabra clave o categoría.</p>
                                    <Button variant="outline-primary" onClick={() => setSearchTerm("")}>Ver todo el catálogo</Button>
                                </Card.Body>
                            </Card>
                        ) : (
                            <Row xs={1} md={2} lg={4} className="g-4 mb-5">
                                {filteredProducts.map(product => (
                                    <Col key={product.id}>
                                        <ProductCard product={product} />
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </>
                )}

                {/* Features Section */}
                <div className="py-5 bg-light rounded-4 mb-5 shadow-sm px-4">
                    <Row className="text-center">
                        <Col md={4} className="mb-4 mb-md-0">
                            <div className="fs-1 mb-3">🛡️</div>
                            <h5 className="fw-bold">Compra Segura</h5>
                            <p className="text-muted small">Tu información está protegida con estándares bancarios.</p>
                        </Col>
                        <Col md={4} className="mb-4 mb-md-0">
                            <div className="fs-1 mb-3">📍</div>
                            <h5 className="fw-bold">Tiendas Locales</h5>
                            <p className="text-muted small">Apoya al comercio de tu zona con envíos ultrarápidos.</p>
                        </Col>
                        <Col md={4}>
                            <div className="fs-1 mb-3">💳</div>
                            <h5 className="fw-bold">Múltiples Pagos</h5>
                            <p className="text-muted small">Paga como quieras: efectivo, tarjeta o transferencia.</p>
                        </Col>
                    </Row>
                </div>
            </Container>

            <style jsx>{`
                .category-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
                    background-color: #f8fbff;
                }
                .text-gradient {
                    background: linear-gradient(to right, #6366f1, #a855f7);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
            `}</style>
        </div>
    );
};

export default MarketHome;
