import { Modal, Row, Col, Badge, Button, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaStore, FaStar, FaShoppingCart, FaInfoCircle } from 'react-icons/fa';
import { useEffect } from 'react';

/**
 * Product Detail Modal — shows product info and all sellers offering it.
 */
const ProductDetailModal = ({
    show, onHide, selectedProduct, sellers,
    sellerSortOrder, onSortSellers, onBuyFromSeller,
    onStoreClick, platformConfig, formatSecondary,
    getCategoryEmoji, getCategoryPlaceholder,
    getFullImageUrl
}) => {
    if (!selectedProduct) return null;

    const renderTooltip = (props, text) => (
        <Tooltip id="button-tooltip" {...props}>
            {text}
        </Tooltip>
    );

    const mainSeller = sellers.find(s => s.companyId === selectedProduct.companyId);
    const showDetails = mainSeller
        ? ['PAID', 'TRIAL'].includes(mainSeller.subscriptionStatus)
        : ['PAID', 'TRIAL'].includes(selectedProduct.subscriptionStatus);

    // SEO: JSON-LD for Search Engines
    useEffect(() => {
        if (!show || !selectedProduct) return;

        const scriptId = 'json-ld-product';
        let existingScript = document.getElementById(scriptId);
        if (existingScript) existingScript.remove();

        const jsonLd = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": selectedProduct.name,
            "description": selectedProduct.description || `Comprar ${selectedProduct.name} en tiendas locales con Nugar.`,
            "image": [getFullImageUrl(selectedProduct)],
            "brand": {
                "@type": "Brand",
                "name": selectedProduct.companyName
            },
            "offers": {
                "@type": "Offer",
                "url": window.location.href,
                "priceCurrency": "COP",
                "price": selectedProduct.price,
                "availability": selectedProduct.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "seller": {
                    "@type": "LocalBusiness",
                    "name": selectedProduct.companyName
                }
            }
        };

        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        script.text = JSON.stringify(jsonLd);
        document.head.appendChild(script);

        return () => {
            const scriptToRemove = document.getElementById(scriptId);
            if (scriptToRemove) scriptToRemove.remove();
        };
    }, [show, selectedProduct]);

    return (
        <Modal show={show} onHide={onHide} size="lg" centered scrollable className="modal-premium">
            <Modal.Body className="p-0 rounded-4">
                <Row className="g-0">
                    <Col md={5} className="bg-light d-flex align-items-center justify-content-center p-4 position-relative" style={{ height: '100%', minHeight: '300px' }}>
                        <img
                            src={getFullImageUrl(selectedProduct)}
                            alt={selectedProduct.name}
                            className="img-fluid rounded shadow-sm"
                            style={{ maxHeight: '400px', objectFit: 'contain' }}
                        />
                        {selectedProduct.stock === 0 && (
                            <div className="position-absolute bg-dark text-white px-3 py-1 rounded small shadow-sm" style={{ top: '10px', left: '10px' }}>
                                Agotado
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
                                        <h3 className="fw-bold text-primary mb-0">${selectedProduct.price}</h3>
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
                        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 border rounded-4 mb-4 bg-gradient shadow-sm gap-3"
                            style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
                            <div className="d-flex align-items-center"
                                style={{ cursor: mainSeller ? 'pointer' : 'default' }}
                                onClick={() => mainSeller && onStoreClick(mainSeller)}>
                                <div className="bg-primary text-white p-3 rounded-circle me-3 shadow-sm flex-shrink-0">
                                    <FaStore size={24} />
                                </div>
                                <div>
                                    <h6 className="fw-bold mb-0 text-primary" style={{ textDecoration: 'underline' }}>
                                        {['PAID', 'TRIAL'].includes(mainSeller?.subscriptionStatus) ? selectedProduct.companyName : 'Tienda con Membresía Vencida'}
                                    </h6>
                                    <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                                        <small className="text-muted">🏆 Mejor Precio del Marketplace</small>
                                        {['PAID', 'TRIAL'].includes(mainSeller?.subscriptionStatus) && mainSeller?.latitude && mainSeller?.longitude && mainSeller.latitude !== 0.0 && (
                                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${mainSeller.latitude},${mainSeller.longitude}`}
                                                target="_blank" rel="noreferrer"
                                                className="small text-decoration-none bg-white px-2 py-1 rounded shadow-sm"
                                                onClick={(e) => e.stopPropagation()}>
                                                📍 Ver Ubicación
                                            </a>
                                        )}
                                        {mainSeller?.distance != null && (
                                            <OverlayTrigger placement="top" overlay={(p) => renderTooltip(p, "Distancia aproximada desde tu ubicación")}>
                                                <Badge bg="white" className="text-primary border shadow-sm small" style={{ cursor: 'help' }}>
                                                   🚀 {mainSeller.distance < 1 ? `${(mainSeller.distance * 1000).toFixed(0)}m` : `${mainSeller.distance.toFixed(1)}km`}
                                                </Badge>
                                            </OverlayTrigger>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {['PAID', 'TRIAL'].includes(mainSeller?.subscriptionStatus) ? (
                                <OverlayTrigger placement="top" overlay={(p) => renderTooltip(p, "Agregar producto al carrito")}>
                                    <Button variant="primary" className="rounded-pill px-4 py-2 fw-bold shadow-sm w-100 w-md-auto"
                                        onClick={(e) => { e.stopPropagation(); onBuyFromSeller(mainSeller); }}>
                                        <FaShoppingCart className="me-2" /> Añadir a mi Pedido
                                    </Button>
                                </OverlayTrigger>
                            ) : (
                                <OverlayTrigger placement="top" overlay={(p) => renderTooltip(p, "Ver información de contacto de la tienda")}>
                                    <Button variant="outline-primary" className="rounded-pill px-4 py-2 fw-bold w-100 w-md-auto"
                                        onClick={(e) => { e.stopPropagation(); onBuyFromSeller(mainSeller); }}>
                                        <FaInfoCircle className="me-2" /> Ver detalles Tienda
                                    </Button>
                                </OverlayTrigger>
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
                                    <div key={idx} className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center p-3 border rounded-4 mb-2 bg-white shadow-sm hover-elevate gap-3">
                                        <div className="w-100">
                                            <div className="d-flex align-items-center gap-2">
                                                <h6 className="fw-bold mb-0 small text-primary"
                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => onStoreClick(seller)}>
                                                    {['PAID', 'TRIAL'].includes(seller.subscriptionStatus) ? seller.companyName : 'Tienda Vencida'}
                                                </h6>
                                                {['PAID', 'TRIAL'].includes(seller.subscriptionStatus) &&
                                                    <Badge bg="primary" className="rounded-circle p-1" style={{ fontSize: '0.6rem' }}><FaStar size={8} /></Badge>
                                                }
                                            </div>
                                            {['PAID', 'TRIAL'].includes(seller.subscriptionStatus) ? (
                                                <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                                                    <span className={seller.stock > 0 ? 'text-primary small fw-bold' : 'text-danger small fw-bold'}>
                                                        {seller.stock > 0 ? 'Disponible' : 'Agotado'}
                                                    </span>
                                                    <span className="text-muted small">•</span>
                                                    <span className="text-primary fw-bold">${seller.price}</span>
                                                </div>
                                            ) : (
                                                <small className="text-muted mt-1 d-block">Consultar Precio</small>
                                            )}
                                            <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                                                {['PAID', 'TRIAL'].includes(seller.subscriptionStatus) && seller.latitude && seller.longitude && seller.latitude !== 0.0 && (
                                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${seller.latitude},${seller.longitude}`}
                                                        target="_blank" rel="noreferrer"
                                                        className="small text-decoration-none d-inline-block"
                                                        onClick={(e) => e.stopPropagation()}>
                                                        📍 Ver Ubicación en Mapa
                                                    </a>
                                                )}
                                                {seller.distance != null && (
                                                    <OverlayTrigger placement="top" overlay={(p) => renderTooltip(p, "Distancia aproximada desde tu ubicación")}>
                                                        <Badge bg="light" className="text-primary border-0 x-small px-2 py-1" style={{ fontSize: '0.65rem', cursor: 'help' }}>
                                                            📍 {seller.distance < 1 ? `${(seller.distance * 1000).toFixed(0)}m` : `${seller.distance.toFixed(1)}km`}
                                                        </Badge>
                                                    </OverlayTrigger>
                                                )}
                                            </div>
                                        </div>
                                        <OverlayTrigger placement="left" overlay={(p) => renderTooltip(p, "Comprar en esta tienda alternativa")}>
                                            <Button
                                                variant={['PAID', 'TRIAL'].includes(seller.subscriptionStatus) ? "primary" : "outline-primary"}
                                                size="sm"
                                                className="rounded-pill px-3 fw-bold w-100 w-sm-auto flex-shrink-0"
                                                disabled={seller.stock === 0}
                                                onClick={() => onBuyFromSeller(seller)}>
                                                {['PAID', 'TRIAL'].includes(seller.subscriptionStatus) ? (
                                                    <><FaShoppingCart className="me-1" /> Añadir</>
                                                ) : (
                                                    <><FaInfoCircle className="me-1" /> Ver Tienda</>
                                                )}
                                            </Button>
                                        </OverlayTrigger>
                                    </div>
                                ))}
                                {sellers.length === 0 && <div className="text-center py-4 text-muted small">Buscando las mejores ofertas...</div>}
                            </div>
                            <div className="mt-3 small text-muted opacity-75">* Las tiendas verificadas permiten reservar productos y acumular puntos Nugar.</div>
                        </div>
                    </Col>
                </Row>
            </Modal.Body>
        </Modal>
    );
};

export default ProductDetailModal;
