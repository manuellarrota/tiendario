import React from 'react';
import { Modal, Row, Col, Badge, Button, Card } from 'react-bootstrap';
import { FaStore, FaStar, FaShoppingCart, FaInfoCircle } from 'react-icons/fa';

/**
 * Product Detail Modal — shows product info and all sellers offering it.
 */
const ProductDetailModal = ({
    show, onHide, selectedProduct, sellers,
    sellerSortOrder, onSortSellers, onBuyFromSeller,
    onStoreClick, platformConfig, formatSecondary,
    getCategoryEmoji
}) => {
    if (!selectedProduct) return null;

    const mainSeller = sellers.find(s => s.companyId === selectedProduct.companyId);
    const showDetails = mainSeller
        ? ['PAID', 'TRIAL'].includes(mainSeller.subscriptionStatus)
        : ['PAID', 'TRIAL'].includes(selectedProduct.subscriptionStatus);

    // Helper for full image URL
    const getFullImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return (import.meta.env.VITE_API_URL || '') + path;
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="modal-premium">
            <Modal.Body className="p-0 overflow-hidden rounded-4">
                <Row className="g-0">
                    <Col md={5} className="bg-light d-flex align-items-center justify-content-center p-0 overflow-hidden" style={{ minHeight: '350px' }}>
                        {selectedProduct.imageUrl ? (
                            <img
                                src={getFullImageUrl(selectedProduct.imageUrl)}
                                alt={selectedProduct.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ fontSize: '150px' }}>
                                {getCategoryEmoji(selectedProduct.category)}
                            </div>
                        )}
                    </Col>
                    <Col md={7} className="p-5">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                                {selectedProduct.category || 'General'}
                            </Badge>
                            <Button variant="close" onClick={onHide} />
                        </div>
                        <h2 className="fw-bold mb-3">{selectedProduct.name}</h2>
                        <p className="text-muted mb-4">{selectedProduct.description || 'Sin descripción detallada disponible.'}</p>

                        {/* Price/Stock Section */}
                        {showDetails ? (
                            <div className="bg-light p-3 rounded-4 mb-4">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted">Precio Unitario</span>
                                    <div className="text-end">
                                        <h3 className="fw-bold text-success mb-0">${selectedProduct.price}</h3>
                                        {platformConfig?.enableSecondaryCurrency && (
                                            <h6 className="text-muted mb-0">{formatSecondary(selectedProduct.price)}</h6>
                                        )}
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mt-2 small">
                                    <span className="text-muted">Stock</span>
                                    <span className={selectedProduct.stock > 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                        {selectedProduct.stock > 0 ? 'Disponible' : 'Agotado'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-light p-3 rounded-4 mb-4 text-center">
                                <p className="mb-0 text-muted">
                                    <FaInfoCircle className="me-2" />
                                    Contactar tienda para precio y disponibilidad
                                </p>
                            </div>
                        )}

                        {/* Main Seller Card */}
                        <div className="d-flex align-items-center justify-content-between p-3 border rounded-4 mb-4 bg-gradient shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
                            <div className="d-flex align-items-center"
                                style={{ cursor: mainSeller ? 'pointer' : 'default' }}
                                onClick={() => mainSeller && onStoreClick(mainSeller)}>
                                <div className="bg-primary text-white p-3 rounded-circle me-3 shadow-sm">
                                    <FaStore size={24} />
                                </div>
                                <div>
                                    <h6 className="fw-bold mb-0 text-primary" style={{ textDecoration: 'underline' }}>
                                        {selectedProduct.companyName}
                                    </h6>
                                    <div className="d-flex align-items-center gap-2">
                                        <small className="text-muted">🏆 Mejor Precio del Marketplace</small>
                                        {mainSeller?.latitude && mainSeller?.longitude && mainSeller.latitude !== 0.0 && (
                                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${mainSeller.latitude},${mainSeller.longitude}`}
                                                target="_blank" rel="noreferrer"
                                                className="small text-decoration-none bg-white px-2 py-1 rounded shadow-sm"
                                                onClick={(e) => e.stopPropagation()}>
                                                📍 Ver Ubicación
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {['PAID', 'TRIAL'].includes(mainSeller?.subscriptionStatus) ? (
                                <Button variant="success" className="rounded-pill px-4 py-2 fw-bold shadow-sm"
                                    onClick={(e) => { e.stopPropagation(); onBuyFromSeller(mainSeller); }}>
                                    <FaShoppingCart className="me-2" /> Añadir a mi Pedido
                                </Button>
                            ) : (
                                <Button variant="outline-primary" className="rounded-pill px-4 py-2 fw-bold"
                                    onClick={(e) => { e.stopPropagation(); onBuyFromSeller(mainSeller); }}>
                                    <FaInfoCircle className="me-2" /> Ver detalles Tienda
                                </Button>
                            )}
                        </div>

                        {/* Other Sellers */}
                        <div className="mt-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="fw-bold mb-0">Compara precios en otras tiendas</h6>
                                {sellers.length > 1 && (
                                    <Button variant="link" size="sm" className="text-decoration-none p-0" onClick={onSortSellers}>
                                        Ordenar por Precio {sellerSortOrder === 'asc' ? '↑' : '↓'}
                                    </Button>
                                )}
                            </div>
                            <div className="sellers-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {sellers.filter(s => s.companyId !== selectedProduct.companyId).map((seller, idx) => (
                                    <div key={idx} className="d-flex justify-content-between align-items-center p-3 border rounded-4 mb-2 bg-white shadow-sm hover-elevate">
                                        <div>
                                            <div className="d-flex align-items-center gap-2">
                                                <h6 className="fw-bold mb-0 small text-primary"
                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => onStoreClick(seller)}>
                                                    {seller.companyName}
                                                </h6>
                                                {['PAID', 'TRIAL'].includes(seller.subscriptionStatus) &&
                                                    <Badge bg="primary" className="rounded-circle p-1" style={{ fontSize: '0.6rem' }}><FaStar size={8} /></Badge>
                                                }
                                            </div>
                                            {['PAID', 'TRIAL'].includes(seller.subscriptionStatus) ? (
                                                <div className="d-flex align-items-center gap-2 mt-1">
                                                    <span className={seller.stock > 0 ? 'text-success small fw-bold' : 'text-danger small fw-bold'}>
                                                        {seller.stock > 0 ? 'Disponible' : 'Agotado'}
                                                    </span>
                                                    <span className="text-muted small">•</span>
                                                    <span className="text-primary fw-bold">${seller.price}</span>
                                                </div>
                                            ) : (
                                                <small className="text-muted mt-1 d-block">Consultar Precio</small>
                                            )}
                                            {seller.latitude && seller.longitude && seller.latitude !== 0.0 && (
                                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${seller.latitude},${seller.longitude}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="small text-decoration-none mt-1 d-inline-block"
                                                    onClick={(e) => e.stopPropagation()}>
                                                    📍 Ver Ubicación en Mapa
                                                </a>
                                            )}
                                        </div>
                                        <Button
                                            variant={['PAID', 'TRIAL'].includes(seller.subscriptionStatus) ? "primary" : "outline-primary"}
                                            size="sm"
                                            className="rounded-pill px-3 fw-bold"
                                            disabled={seller.stock === 0}
                                            onClick={() => onBuyFromSeller(seller)}>
                                            {['PAID', 'TRIAL'].includes(seller.subscriptionStatus) ? (
                                                <><FaShoppingCart className="me-1" /> Añadir</>
                                            ) : (
                                                <><FaInfoCircle className="me-1" /> Ver Tienda</>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                                {sellers.length === 0 && <div className="text-center py-4 text-muted small">Buscando las mejores ofertas...</div>}
                            </div>
                            <div className="mt-3 small text-muted opacity-75">* Las tiendas verificadas permiten reservar productos y acumular puntos Tiendario.</div>
                        </div>
                    </Col>
                </Row>
            </Modal.Body>
        </Modal>
    );
};

export default ProductDetailModal;
