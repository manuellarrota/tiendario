import React from 'react';
import { Modal, Button, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaShoppingCart } from 'react-icons/fa';

/**
 * Shopping Cart Modal — displays items in the cart with quantity controls.
 */
const CartModal = ({
    show, onHide, cart, onUpdateQuantity, onRemoveFromCart,
    onCheckout, platformConfig, formatSecondary, getFullImageUrl
}) => {
    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    const renderTooltip = (props, text) => (
        <Tooltip id="button-tooltip" {...props}>
            {text}
        </Tooltip>
    );

    return (
        <Modal show={show} onHide={onHide} centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold">Tu Carrito de Compras</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {cart.length === 0 ? (
                    <div className="text-center p-5">
                        <div className="display-1 mb-3">🛒</div>
                        <h5>Tu carrito está vacío</h5>
                        <p className="text-muted">¡Agrega productos para empezar!</p>
                        <Button variant="primary" onClick={onHide}>Ir a Comprar</Button>
                    </div>
                ) : (
                    <div className="p-3">
                        {cart.map(item => (
                            <div key={item.id} className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-3 border-bottom pb-3">
                                <div className="d-flex align-items-center gap-3 flex-grow-1 w-100">
                                    <div className="bg-light rounded p-1 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '50px', height: '50px', overflow: 'hidden' }}>
                                        {getFullImageUrl ? (
                                            <img src={getFullImageUrl(item)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '1.5rem' }}>📦</span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-grow-1">
                                        <h6 className="mb-0 fw-bold text-truncate">{item.name}</h6>
                                        <small className="text-muted d-block">
                                            ${item.price} c/u
                                            {platformConfig?.enableSecondaryCurrency && (
                                                <span className="ms-2 text-primary">({formatSecondary(item.price)})</span>
                                            )}
                                        </small>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-between w-100 w-sm-auto mt-2 mt-sm-0">
                                    <div className="d-flex align-items-center bg-light rounded-pill px-2 py-1 border">
                                        <OverlayTrigger placement="top" overlay={(p) => renderTooltip(p, "Disminuir cantidad")}>
                                            <Button variant="link" className="text-dark p-1 text-decoration-none" onClick={() => onUpdateQuantity(item.id, -1)}>-</Button>
                                        </OverlayTrigger>
                                        <span className="fw-bold mx-3">{item.quantity}</span>
                                        <OverlayTrigger placement="top" overlay={(p) => renderTooltip(p, "Aumentar cantidad")}>
                                            <Button variant="link" className="text-dark p-1 text-decoration-none" onClick={() => onUpdateQuantity(item.id, 1)}>+</Button>
                                        </OverlayTrigger>
                                    </div>
                                    <OverlayTrigger placement="top" overlay={(p) => renderTooltip(p, "Quitar del carrito")}>
                                        <Button variant="outline-danger" size="sm" className="ms-3 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} onClick={() => onRemoveFromCart(item.id)}>×</Button>
                                    </OverlayTrigger>
                                </div>
                            </div>
                        ))}
                        <div className="d-flex justify-content-between align-items-end mt-4">
                            <h5 className="fw-bold mb-0">Total:</h5>
                            <div className="text-end">
                                {platformConfig?.enableSecondaryCurrency && (
                                    <h5 className="text-primary mb-1">{formatSecondary(cartTotal)}</h5>
                                )}
                                <h3 className="fw-bold text-primary mb-0">${cartTotal.toFixed(2)}</h3>
                            </div>
                        </div>
                        <OverlayTrigger placement="bottom" overlay={(p) => renderTooltip(p, "Ir a la pantalla de pago seguro")}>
                            <Button variant="primary" className="w-100 mt-3 py-2 fw-bold" onClick={onCheckout}>
                                Continuar con el Pedido
                            </Button>
                        </OverlayTrigger>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default CartModal;
