import React, { useState, useEffect } from "react";
import { Container, Row, Col, Table, Button, Form, Card, Alert, Modal } from "react-bootstrap";
import Sidebar from "../components/Sidebar";
import ProductService from "../services/product.service";
import SupplierService from "../services/supplier.service";
import PurchaseService from "../services/purchase.service";
import { FaPlus, FaShoppingCart, FaSave, FaTruck } from "react-icons/fa";

const NewPurchasePage = () => {
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [cart, setCart] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [message, setMessage] = useState("");

    // Item Form
    const [selectedProduct, setSelectedProduct] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unitCost, setUnitCost] = useState("");

    // New Supplier Modal
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState("");
    const [newSupplierEmail, setNewSupplierEmail] = useState("");
    const [newSupplierPhone, setNewSupplierPhone] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        ProductService.getAll().then(res => setProducts(res.data));
        SupplierService.getAll().then(res => setSuppliers(res.data));
    };

    const addToCart = () => {
        if (!selectedProduct || !quantity || !unitCost) return;
        const product = products.find(p => p.id === parseInt(selectedProduct));

        const newItem = {
            product: product,
            quantity: parseInt(quantity),
            unitCost: parseFloat(unitCost),
            total: parseInt(quantity) * parseFloat(unitCost)
        };

        setCart([...cart, newItem]);
        setSelectedProduct(""); setQuantity(1); setUnitCost("");
    };

    const handleCreateSupplier = (e) => {
        e.preventDefault();
        SupplierService.create({
            name: newSupplierName,
            email: newSupplierEmail,
            phone: newSupplierPhone
        }).then(
            (response) => {
                setMessage("✅ Proveedor creado exitosamente");
                setShowSupplierModal(false);
                setNewSupplierName("");
                setNewSupplierEmail("");
                setNewSupplierPhone("");
                loadData(); // Reload suppliers
                setTimeout(() => setMessage(""), 3000);
                // Auto-select the new supplier
                if (response.data && response.data.id) {
                    setSelectedSupplier(response.data.id);
                }
            },
            (error) => {
                setMessage("❌ Error creando proveedor");
                setTimeout(() => setMessage(""), 3000);
            }
        );
    };

    const handleSavePurchase = () => {
        if (!selectedSupplier) { alert("Selecciona un proveedor"); return; }
        if (cart.length === 0) { alert("El carrito está vacío"); return; }

        const purchaseData = {
            supplier: { id: selectedSupplier },
            items: cart.map(item => ({
                product: { id: item.product.id },
                quantity: item.quantity,
                unitCost: item.unitCost
            })),
            total: cart.reduce((acc, item) => acc + item.total, 0)
        };

        PurchaseService.create(purchaseData).then(
            () => {
                setMessage("¡Compra registrada y Stock actualizado!");
                setCart([]); setSelectedSupplier("");
            },
            (error) => setMessage("Error registrando compra")
        );
    };

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4 bg-light" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <h2 className="text-dark fw-bold mb-4">Registro de Compras (Entrada de Mercancía)</h2>

                    {message && <Alert variant={message.includes("✅") ? "success" : message.includes("❌") ? "danger" : "info"}>{message}</Alert>}

                    <Row>
                        <Col md={8}>
                            <Card className="border-0 shadow-sm p-4 mb-4">
                                <h5 className="mb-3">Lista de Productos a Ingresar</h5>
                                <Table responsive>
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Producto</th>
                                            <th className="text-center">Cant.</th>
                                            <th className="text-end">Costo Unit.</th>
                                            <th className="text-end">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cart.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{item.product.name}</td>
                                                <td className="text-center">{item.quantity}</td>
                                                <td className="text-end">${item.unitCost}</td>
                                                <td className="text-end fw-bold">${item.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                                {cart.length === 0 && <p className="text-center text-muted my-3">Agrega productos a la orden</p>}

                                <div className="text-end mt-3">
                                    <h4>Total: ${cart.reduce((acc, item) => acc + item.total, 0)}</h4>
                                </div>
                            </Card>
                        </Col>

                        <Col md={4}>
                            <Card className="border-0 shadow-sm p-4 mb-3">
                                <h5 className="mb-3">1. Datos Proveedor</h5>
                                <Form.Group className="mb-3">
                                    <Form.Label>Seleccionar Proveedor</Form.Label>
                                    <Form.Select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                                        <option value="">-- Elige un Proveedor --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </Form.Select>
                                </Form.Group>
                                <Button
                                    variant="outline-success"
                                    size="sm"
                                    className="w-100"
                                    onClick={() => setShowSupplierModal(true)}
                                >
                                    <FaTruck className="me-2" /> Crear Nuevo Proveedor
                                </Button>
                            </Card>

                            <Card className="border-0 shadow-sm p-4 mb-3">
                                <h5 className="mb-3">2. Agregar Producto</h5>
                                <Form.Group className="mb-2">
                                    <Form.Label>Producto</Form.Label>
                                    <Form.Select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                                        <option value="">-- Producto --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </Form.Select>
                                </Form.Group>
                                <Row>
                                    <Col>
                                        <Form.Group className="mb-2">
                                            <Form.Label>Cantidad</Form.Label>
                                            <Form.Control type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                                        </Form.Group>
                                    </Col>
                                    <Col>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Costo ($)</Form.Label>
                                            <Form.Control type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Button variant="outline-primary" className="w-100" onClick={addToCart}>
                                    <FaPlus /> Agregar Línea
                                </Button>
                            </Card>

                            <Button variant="primary" size="lg" className="w-100 py-3 fw-bold shadow-glow" onClick={handleSavePurchase}>
                                <FaSave className="me-2" /> Confirmar Ingreso de Mercancía
                            </Button>
                        </Col>
                    </Row>
                </Container>

                {/* New Supplier Modal */}
                <Modal show={showSupplierModal} onHide={() => setShowSupplierModal(false)} centered>
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold text-dark">
                            <FaTruck className="me-2" />Nuevo Proveedor
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleCreateSupplier}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre Empresa *</Form.Label>
                                <Form.Control
                                    type="text"
                                    required
                                    value={newSupplierName}
                                    onChange={(e) => setNewSupplierName(e.target.value)}
                                    placeholder="Ej: Distribuidora XYZ"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={newSupplierEmail}
                                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                                    placeholder="contacto@proveedor.com"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Teléfono</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={newSupplierPhone}
                                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                                    placeholder="+1 234 567 8900"
                                />
                            </Form.Group>
                            <Button variant="success" type="submit" className="w-100 py-2">
                                <FaTruck className="me-2" />Crear y Seleccionar
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default NewPurchasePage;
