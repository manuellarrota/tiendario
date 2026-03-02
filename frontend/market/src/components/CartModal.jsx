import React from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { FaShoppingCart } from 'react-icons/fa';

/**
 * Shopping Cart Modal — displays items in the cart with quantity controls.
 */
const CartModal = ({
    show, onHide, cart, onUpdateQuantity, onRemoveFromCart,
    onCheckout, platformConfig, formatSecondary
}) => {
    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    return (
        <Modal show={show} onHide={onHide} centered>
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
                            <div key={item.id} className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-light rounded p-2">📦</div>
                                    <div>
                                        <h6 className="mb-0 fw-bold">{item.name}</h6>
                                        <small className="text-muted">
                                            ${item.price} c/u
                                            {platformConfig?.enableSecondaryCurrency && (
                                                <span className="ms-2 text-success">({formatSecondary(item.price)})</span>
                                            )}
                                        </small>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <Button variant="outline-secondary" size="sm" onClick={() => onUpdateQuantity(item.id, -1)}>-</Button>
                                    <span className="fw-bold mx-2">{item.quantity}</span>
                                    <Button variant="outline-secondary" size="sm" onClick={() => onUpdateQuantity(item.id, 1)}>+</Button>
                                    <Button variant="danger" size="sm" className="ms-2" onClick={() => onRemoveFromCart(item.id)}>×</Button>
                                </div>
                            </div>
                        ))}
                        <div className="d-flex justify-content-between align-items-end mt-4">
                            <h5 className="fw-bold mb-0">Total:</h5>
                            <div className="text-end">
                                {platformConfig?.enableSecondaryCurrency && (
                                    <h5 className="text-success mb-1">{formatSecondary(cartTotal)}</h5>
                                )}
                                <h3 className="fw-bold text-success mb-0">${cartTotal.toFixed(2)}</h3>
                            </div>
                        </div>
                        <Button variant="primary" className="w-100 mt-3 py-2 fw-bold" onClick={onCheckout}>
                            Continuar con el Pedido
                        </Button>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default CartModal;
