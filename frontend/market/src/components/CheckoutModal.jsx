import React from 'react';
import { Modal, Form, Row, Col, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { FaUser, FaPhone } from 'react-icons/fa';

/**
 * Checkout Modal — customer data form and order submission.
 * If isLoggedIn is true, name/email/phone are prefilled and locked.
 * Delivery address is hidden (no deliveries yet).
 */
const CheckoutModal = ({
    show, onHide, cart, customerData, setCustomerData,
    orderStatus, onOrderSubmit, platformConfig, formatSecondary,
    isLoggedIn
}) => {
    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    return (
        <Modal show={show} onHide={onHide} centered size="md">
            <Modal.Header closeButton className="border-0">
                <Modal.Title className="fw-bold">Finalizar Compra</Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 pb-4">
                {orderStatus.success ? (
                    <div className="text-center py-5">
                        <div className="display-1 text-success mb-3">🎉</div>
                        <h4 className="fw-bold">¡Orden Registrada!</h4>
                        <p className="text-muted mb-4">Tu compra ha sido registrada en el sistema de inventario.</p>
                        <div className="bg-light p-3 rounded-4 text-start">
                            <h6 className="fw-bold small mb-2 text-uppercase">Próximos Pasos</h6>
                            <div className="small mb-1"><strong>1.</strong> Dirígete a la tienda mencionada.</div>
                            <div className="small"><strong>2.</strong> Presenta tu número de orden o comprobante de pago para retirar.</div>
                        </div>
                    </div>
                ) : (
                    <Form onSubmit={onOrderSubmit}>
                        {/* Summary */}
                        <div className="bg-light p-3 rounded-4 mb-4">
                            <h6 className="fw-bold mb-3 border-bottom pb-2">Resumen del Pedido</h6>
                            {cart.map((item, idx) => (
                                <div key={idx} className="d-flex align-items-center justify-content-between mb-2">
                                    <div className="d-flex align-items-center">
                                        <small className="badge bg-secondary me-2">{item.quantity}x</small>
                                        <span className="small fw-medium text-truncate" style={{ maxWidth: '200px' }}>{item.name}</span>
                                    </div>
                                    <span className="small fw-bold">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="d-flex justify-content-between mt-3 pt-2 border-top align-items-end">
                                <span className="fw-bold">Total a Pagar</span>
                                <div className="text-end">
                                    {platformConfig?.enableSecondaryCurrency && (
                                        <h5 className="text-success mb-1">{formatSecondary(cartTotal)}</h5>
                                    )}
                                    <h5 className="fw-bold text-success mb-0">${cartTotal.toFixed(2)}</h5>
                                </div>
                            </div>
                        </div>

                        {orderStatus.error && <Alert variant="danger" className="rounded-4">{orderStatus.error}</Alert>}

                        {/* Customer data section */}
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="fw-bold mb-0 d-flex align-items-center">
                                <span className="bg-primary bg-opacity-10 text-primary rounded-circle px-2 me-2">1</span> Datos del Cliente
                            </h6>
                            {isLoggedIn && (
                                <Badge bg="success" pill className="px-3">
                                    ✓ Datos cargados automáticamente
                                </Badge>
                            )}
                        </div>

                        <Row className="mb-4">
                            <Col md={6}>
                                <Form.Control
                                    className="mb-2 rounded-3 py-2 px-3"
                                    placeholder="Nombre"
                                    value={customerData.name}
                                    onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                                    disabled={isLoggedIn && !!customerData.name}
                                    required
                                />
                            </Col>
                            <Col md={6}>
                                <Form.Control
                                    className="mb-2 rounded-3 py-2 px-3"
                                    placeholder="Email"
                                    type="email"
                                    value={customerData.email}
                                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                                    disabled={isLoggedIn && !!customerData.email}
                                    required
                                />
                            </Col>
                            <Col md={12}>
                                <Form.Control
                                    className="mb-2 rounded-3 py-2 px-3"
                                    placeholder="Teléfono / WhatsApp"
                                    type="tel"
                                    value={customerData.phone}
                                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                                    disabled={isLoggedIn && !!customerData.phone}
                                />
                            </Col>
                            {/* Dirección oculta por ahora — no hay domicilios activos */}
                            {/* <Col md={12}>
                                <Form.Control
                                    className="mb-2 rounded-3 py-2 px-3"
                                    placeholder="Dirección de Entrega"
                                    value={customerData.address}
                                    onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                                />
                            </Col> */}
                        </Row>

                        <Alert variant="info" className="rounded-4 mb-4 border-0">
                            <strong>💡 Nota Importante:</strong>
                            <br />
                            Estás registrando un pedido. El pago se coordinará y confirmará directamente con la tienda.
                        </Alert>

                        <Button variant="primary" type="submit" className="w-100 py-3 rounded-4 fw-bold shadow" disabled={orderStatus.loading}>
                            {orderStatus.loading ? (
                                <><Spinner size="sm" animation="border" className="me-2" /> Procesando Pedido...</>
                            ) : (
                                <>Confirmar Pedido (Pago en Tienda) (${cartTotal.toFixed(2)})</>
                            )}
                        </Button>
                    </Form>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default CheckoutModal;
