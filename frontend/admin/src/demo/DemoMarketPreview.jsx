import React, { useState } from 'react';
import { Modal, Badge, Button } from 'react-bootstrap';
import { DEMO_PRODUCTS, DEMO_STORE } from '../demo/DemoData';
import { FaStore, FaShoppingCart, FaMapMarkerAlt, FaStar, FaTimes } from 'react-icons/fa';

/**
 * DemoMarketPreview
 * Vitrina embebida que simula cómo aparece la tienda demo en el marketplace.
 * Se abre desde el inventario del demo. No hace llamadas al backend.
 */
const DemoMarketPreview = ({ show, onHide }) => {
    const [cart, setCart] = useState([]);
    const [orderDone, setOrderDone] = useState(false);

    const addToCart = (product) => {
        setCart(prev => {
            const exists = prev.find(i => i.id === product.id);
            if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

    const handleOrder = () => {
        setOrderDone(true);
        setTimeout(() => {
            setCart([]);
            setOrderDone(false);
            onHide();
        }, 2500);
    };

    return (
        <Modal show={show} onHide={onHide} size="xl" centered scrollable>
            <Modal.Header className="border-0 pb-0" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                <div className="w-100">
                    {/* Market Header */}
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="d-flex align-items-center gap-2">
                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: 32, height: 32 }}>
                                <FaStore size={14} />
                            </div>
                            <span className="text-white fw-bold fs-5">Tiendario</span>
                            <Badge bg="primary" pill className="ms-1">Marketplace</Badge>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                            <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill fw-bold" style={{ fontSize: '0.8rem' }}>
                                🎭 Modo Demo
                            </Badge>
                            <button className="btn btn-sm btn-outline-light rounded-circle" onClick={onHide} style={{ width: 32, height: 32, padding: 0 }}>
                                <FaTimes size={12} />
                            </button>
                        </div>
                    </div>

                    {/* Store Banner */}
                    <div className="d-flex align-items-center gap-3 pb-3">
                        <div className="bg-primary bg-opacity-20 rounded-3 p-3 text-white" style={{ fontSize: '2rem' }}>🔧</div>
                        <div>
                            <h5 className="text-white fw-bold mb-1">{DEMO_STORE.name}</h5>
                            <div className="d-flex align-items-center gap-3">
                                <small className="text-white-50 d-flex align-items-center gap-1">
                                    <FaMapMarkerAlt size={10} /> {DEMO_STORE.location}
                                </small>
                                <small className="text-warning d-flex align-items-center gap-1">
                                    <FaStar size={10} /> 4.8 (124 reseñas)
                                </small>
                                <Badge bg="success" pill>Abierto ahora</Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal.Header>

            <Modal.Body className="p-0" style={{ background: '#f8fafc', maxHeight: '65vh', overflowY: 'auto' }}>
                {orderDone ? (
                    <div className="text-center py-5">
                        <div style={{ fontSize: '4rem' }} className="mb-3">🎉</div>
                        <h4 className="fw-bold text-success">¡Pedido Registrado! (Demo)</h4>
                        <p className="text-muted">En una tienda real, el vendedor recibiría esta orden en su panel.</p>
                    </div>
                ) : (
                    <div className="p-4">
                        {/* Info banner */}
                        <div className="alert alert-primary border-0 rounded-3 mb-4 py-2 px-3 small d-flex align-items-center gap-2">
                            <span>🌐</span>
                            <span>Así es como <strong>tus clientes</strong> verán tu tienda en el Marketplace de Tiendario.</span>
                        </div>

                        {/* Product Grid */}
                        <div className="row g-3">
                            {DEMO_PRODUCTS.map(product => (
                                <div key={product.id} className="col-6 col-md-4 col-lg-3">
                                    <div className="bg-white rounded-4 shadow-sm h-100 d-flex flex-column overflow-hidden"
                                        style={{ border: '1px solid #e2e8f0', transition: 'transform 0.15s', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        {/* Product image area */}
                                        <div className="d-flex align-items-center justify-content-center bg-light"
                                            style={{ height: '90px', fontSize: '2.5rem' }}>
                                            {product.image}
                                        </div>
                                        <div className="p-3 flex-grow-1 d-flex flex-column">
                                            <p className="small fw-bold mb-1 text-dark" style={{ lineHeight: 1.3, minHeight: '2.6em' }}>
                                                {product.name}
                                            </p>
                                            <Badge bg="light" text="secondary" className="rounded-pill mb-2 align-self-start" style={{ fontSize: '0.65rem' }}>
                                                {product.category}
                                            </Badge>
                                            <div className="d-flex align-items-center justify-content-between mt-auto">
                                                <span className="fw-bold text-success">${product.price.toFixed(2)}</span>
                                                <button
                                                    className="btn btn-primary btn-sm rounded-pill px-2 py-1"
                                                    style={{ fontSize: '0.7rem' }}
                                                    onClick={() => addToCart(product)}
                                                >
                                                    + Agregar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal.Body>

            {/* Cart Footer */}
            {!orderDone && (
                <Modal.Footer className="border-0 bg-white shadow-lg">
                    <div className="w-100 d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="position-relative">
                                <FaShoppingCart size={22} className="text-primary" />
                                {cartCount > 0 && (
                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                                        {cartCount}
                                    </span>
                                )}
                            </div>
                            {cart.length === 0 ? (
                                <span className="text-muted small">Carrito vacío — agrega productos</span>
                            ) : (
                                <span className="fw-bold">${cartTotal.toFixed(2)} <span className="text-muted fw-normal small">({cartCount} productos)</span></span>
                            )}
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="outline-secondary" size="sm" className="rounded-pill" onClick={onHide}>
                                Volver al Panel
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                className="rounded-pill px-4 fw-bold shadow-sm"
                                disabled={cart.length === 0}
                                onClick={handleOrder}
                            >
                                Confirmar Pedido (Demo)
                            </Button>
                        </div>
                    </div>
                </Modal.Footer>
            )}
        </Modal>
    );
};

export default DemoMarketPreview;
