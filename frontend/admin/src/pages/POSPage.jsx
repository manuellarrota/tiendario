import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, ListGroup, InputGroup, Table, Modal, Alert } from 'react-bootstrap';
import { FaSearch, FaPlus, FaTrash, FaShoppingCart, FaEdit, FaLock, FaExclamationTriangle } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import ProductService from '../services/product.service';
import SaleService from '../services/sale.service';
import AuthService from '../services/auth.service';

const POSPage = () => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [message, setMessage] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [customerName, setCustomerName] = useState("");

    // Subscription status check
    const user = AuthService.getCurrentUser();
    const subscriptionStatus = user?.subscriptionStatus || 'FREE';
    const canOperate = subscriptionStatus === 'PAID' || subscriptionStatus === 'TRIAL';

    // Quantity modal
    const [showQuantityModal, setShowQuantityModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [inputQuantity, setInputQuantity] = useState(1);

    useEffect(() => {
        ProductService.getCompanyProducts().then(
            (response) => setProducts(response.data),
            (error) => console.error("Error fetching products", error)
        );
    }, []);

    const openQuantityModal = (product) => {
        setSelectedProduct(product);
        setInputQuantity(1);
        setShowQuantityModal(true);
    };

    const confirmAddToCart = () => {
        if (!selectedProduct || inputQuantity < 1) return;

        const existing = cart.find(item => item.product.id === selectedProduct.id);
        if (existing) {
            if (existing.quantity + inputQuantity > selectedProduct.stock) {
                alert(`Stock insuficiente. Disponible: ${selectedProduct.stock}`);
                return;
            }
            setCart(cart.map(item =>
                item.product.id === selectedProduct.id
                    ? { ...item, quantity: item.quantity + inputQuantity, subtotal: (item.quantity + inputQuantity) * selectedProduct.price }
                    : item
            ));
        } else {
            if (inputQuantity > selectedProduct.stock) {
                alert(`Stock insuficiente. Disponible: ${selectedProduct.stock}`);
                return;
            }
            setCart([...cart, {
                product: selectedProduct,
                quantity: inputQuantity,
                unitPrice: selectedProduct.price,
                subtotal: inputQuantity * selectedProduct.price
            }]);
        }

        setShowQuantityModal(false);
        setSelectedProduct(null);
        setInputQuantity(1);
    };

    const updateCartQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return;

        const product = products.find(p => p.id === productId);
        if (newQuantity > product.stock) {
            alert(`Stock insuficiente. Disponible: ${product.stock}`);
            return;
        }

        setCart(cart.map(item =>
            item.product.id === productId
                ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unitPrice }
                : item
        ));
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product.id !== productId));
    };

    const total = cart.reduce((acc, item) => acc + item.subtotal, 0);

    const handleCheckout = () => {
        if (cart.length === 0) return;

        const saleData = {
            totalAmount: total,
            paymentMethod: paymentMethod,
            items: cart.map(item => ({
                product: { id: item.product.id },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal
            })),
            customerName: customerName,
            status: 'PAID'
        };

        SaleService.createSale(saleData).then(
            () => {
                setMessage("¡Venta realizada con éxito!");
                setCart([]);
                setPaymentMethod("CASH");
                setCustomerName("");
                // Refresh product stock
                ProductService.getCompanyProducts().then(r => setProducts(r.data));
                setTimeout(() => setMessage(""), 3000);
            },
            (error) => {
                setMessage("Error al procesar la venta: " + error.response?.data?.message);
                setTimeout(() => setMessage(""), 3000);
            }
        );
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                <h2 className="mb-4">Control de Ventas (Registro de Salida)</h2>

                {message && <div className={`alert ${message.includes('éxito') ? 'alert-success' : 'alert-danger'}`}>{message}</div>}

                {/* Subscription Status Block */}
                {!canOperate && (
                    <Alert variant={subscriptionStatus === 'PAST_DUE' ? 'warning' : subscriptionStatus === 'SUSPENDED' ? 'danger' : 'info'}
                        className="d-flex align-items-center shadow-sm mb-4">
                        <div className="me-3">
                            {subscriptionStatus === 'SUSPENDED'
                                ? <FaLock size={32} className="text-danger" />
                                : <FaExclamationTriangle size={32} className={subscriptionStatus === 'PAST_DUE' ? 'text-warning' : 'text-info'} />
                            }
                        </div>
                        <div>
                            <h5 className="mb-1">
                                {subscriptionStatus === 'FREE' && 'Funcionalidad Premium'}
                                {subscriptionStatus === 'PAST_DUE' && 'Suscripción Vencida'}
                                {subscriptionStatus === 'SUSPENDED' && 'Cuenta Suspendida'}
                            </h5>
                            <p className="mb-0">
                                {subscriptionStatus === 'FREE' && 'El sistema de ventas está disponible solo para cuentas Premium. Mejora tu plan para acceder.'}
                                {subscriptionStatus === 'PAST_DUE' && 'Tu suscripción ha vencido. Renueva tu plan para continuar registrando ventas.'}
                                {subscriptionStatus === 'SUSPENDED' && 'Tu cuenta ha sido suspendida. Contacta al administrador para más información.'}
                            </p>
                        </div>
                    </Alert>
                )}

                <Row className="g-4" style={{ opacity: canOperate ? 1 : 0.5, pointerEvents: canOperate ? 'auto' : 'none' }}>
                    <Col md={7}>
                        <Card className="shadow-sm border-0 mb-4">
                            <Card.Body>
                                <InputGroup className="mb-3">
                                    <InputGroup.Text className="bg-white"><FaSearch /></InputGroup.Text>
                                    <Form.Control
                                        placeholder="Buscar por nombre o SKU..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>

                                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                    <Table hover responsive>
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Producto</th>
                                                <th>SKU</th>
                                                <th>Precio</th>
                                                <th>Stock</th>
                                                <th>Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProducts.map(p => (
                                                <tr key={p.id}>
                                                    <td>{p.name}</td>
                                                    <td><small className="text-muted">{p.sku}</small></td>
                                                    <td>${p.price}</td>
                                                    <td>
                                                        <span className={`badge ${p.stock < 5 ? 'bg-danger' : 'bg-success'}`}>
                                                            {p.stock}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <OverlayTrigger
                                                            placement="left"
                                                            overlay={(props) => (
                                                                <Tooltip id={`tooltip-add-${p.id}`} {...props}>
                                                                    {p.stock < 1 ? "Producto sin stock disponible" : "Agregar este producto al carrito"}
                                                                </Tooltip>
                                                            )}
                                                        >
                                                            <span className="d-inline-block">
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    onClick={() => openQuantityModal(p)}
                                                                    disabled={p.stock < 1}
                                                                >
                                                                    <FaPlus /> Agregar
                                                                </Button>
                                                            </span>
                                                        </OverlayTrigger>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={5}>
                        <Card className="shadow-sm border-0 h-100">
                            <Card.Header className="bg-primary text-white py-3">
                                <h5 className="mb-0"><FaShoppingCart className="me-2" /> Registro de Salida</h5>
                            </Card.Header>
                            <Card.Body className="d-flex flex-column">
                                <ListGroup variant="flush" className="flex-grow-1 mb-3" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                                    {cart.map(item => (
                                        <ListGroup.Item key={item.product.id} className="border-0 px-0">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div className="flex-grow-1">
                                                    <h6 className="mb-1">{item.product.name}</h6>
                                                    <small className="text-muted">${item.unitPrice} c/u</small>
                                                </div>
                                                <Button variant="outline-danger" size="sm" onClick={() => removeFromCart(item.product.id)}>
                                                    <FaTrash />
                                                </Button>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center">
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                                    >
                                                        -
                                                    </Button>
                                                    <Form.Control
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateCartQuantity(item.product.id, parseInt(e.target.value) || 1)}
                                                        className="mx-2 text-center"
                                                        style={{ width: '70px' }}
                                                    />
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                                <span className="fw-bold text-primary">${item.subtotal.toFixed(2)}</span>
                                            </div>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>

                                {cart.length === 0 && (
                                    <div className="text-center text-muted py-5">
                                        <FaShoppingCart size={50} className="opacity-25 mb-3" />
                                        <p>El carrito está vacío</p>
                                    </div>
                                )}

                                <div className="border-top pt-3">
                                    <div className="d-flex justify-content-between mb-3">
                                        <h4>Total:</h4>
                                        <h4 className="text-primary">${total.toFixed(2)}</h4>
                                    </div>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Cliente (Opcional)</Form.Label>
                                        <Form.Control
                                            placeholder="Nombre del cliente..."
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Método de Pago</Form.Label>
                                        <Form.Select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="mb-2"
                                        >
                                            <option value="CASH">Efectivo 💵</option>
                                            <option value="CARD">Tarjeta 💳</option>
                                            <option value="TRANSFER">Transferencia 🏦</option>
                                        </Form.Select>
                                    </Form.Group>
                                    <Button
                                        variant="success"
                                        size="lg"
                                        className="w-100"
                                        onClick={handleCheckout}
                                        disabled={cart.length === 0}
                                    >
                                        Registrar Salida / Venta
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Quantity Modal */}
                <Modal show={showQuantityModal} onHide={() => setShowQuantityModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Cantidad a Agregar</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedProduct && (
                            <>
                                <h5>{selectedProduct.name}</h5>
                                <p className="text-muted">Precio: ${selectedProduct.price} | Stock disponible: {selectedProduct.stock}</p>
                                <Form.Group>
                                    <Form.Label>Cantidad</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max={selectedProduct.stock}
                                        value={inputQuantity}
                                        onChange={(e) => setInputQuantity(parseInt(e.target.value) || 1)}
                                        autoFocus
                                        onKeyPress={(e) => e.key === 'Enter' && confirmAddToCart()}
                                    />
                                </Form.Group>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowQuantityModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={confirmAddToCart}>
                            Agregar al Carrito
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </div>
    );
};

export default POSPage;
