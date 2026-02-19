import React, { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Table, Button, Form, Card, Alert, Modal, Image, Badge } from "react-bootstrap";
import Sidebar from "../components/Sidebar";
import ProductService from "../services/product.service";
import SupplierService from "../services/supplier.service";
import PurchaseService from "../services/purchase.service";
import CategoryService from "../services/category.service";
import { FaPlus, FaSave, FaTruck, FaBoxOpen, FaImage, FaSearch, FaTimes } from "react-icons/fa";

const NewPurchasePage = () => {
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cart, setCart] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [message, setMessage] = useState("");

    // Item Form
    const [selectedProduct, setSelectedProduct] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unitCost, setUnitCost] = useState("");

    // Product Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    // New Supplier Modal
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState("");
    const [newSupplierEmail, setNewSupplierEmail] = useState("");
    const [newSupplierPhone, setNewSupplierPhone] = useState("");

    // New Product Modal State
    const [showProductModal, setShowProductModal] = useState(false);
    const [prodName, setProdName] = useState("");
    const [prodSku, setProdSku] = useState("");
    const [prodPrice, setProdPrice] = useState("");
    const [prodStock, setProdStock] = useState("");
    const [prodCategory, setProdCategory] = useState("");
    const [prodVariant, setProdVariant] = useState("");
    const [prodCostPrice, setProdCostPrice] = useState("");
    const [prodImageUrl, setProdImageUrl] = useState("");
    const [isGeneratingSku, setIsGeneratingSku] = useState(false);

    // Predefined global categories
    const globalCategories = ["Ropa", "Tecnología", "Alimentos", "Hogar", "Deportes", "Salud y Belleza", "Juguetes", "Libros"];

    useEffect(() => {
        loadData();
        // Click outside listener for dropdown
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Suggest SKU logic
    useEffect(() => {
        if (prodName.length > 2 && !prodSku && showProductModal) {
            const delayDebounceFn = setTimeout(() => {
                setIsGeneratingSku(true);
                ProductService.getSuggestedSku(prodName, prodCategory, prodVariant).then(
                    (response) => {
                        setProdSku(response.data.suggestedSku);
                        setIsGeneratingSku(false);
                    },
                    () => setIsGeneratingSku(false)
                );
            }, 800);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [prodName, prodCategory, prodVariant, showProductModal]);

    const loadData = () => {
        ProductService.getAll().then(res => setProducts(res.data));
        SupplierService.getAll().then(res => setSuppliers(res.data));
        CategoryService.getAll().then(res => setCategories(res.data));
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
        // Reset Item Form
        setSelectedProduct("");
        setSearchTerm("");
        setQuantity(1);
        setUnitCost("");
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
                loadData();
                setTimeout(() => setMessage(""), 3000);
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

    const handleCreateProduct = (e) => {
        e.preventDefault();
        const productData = {
            name: prodName,
            sku: prodSku,
            price: prodPrice,
            stock: prodStock,
            category: prodCategory,
            variant: prodVariant,
            costPrice: prodCostPrice,
            imageUrl: prodImageUrl,
            minStock: 5
        };

        ProductService.create(productData).then(
            (response) => {
                setMessage("✅ Producto creado exitosamente");
                setShowProductModal(false);
                resetProductForm();
                loadData(); // Reload products
                setTimeout(() => setMessage(""), 3000);

                // Auto-select the new product
                if (response.data && response.data.id) {
                    const newProd = response.data;
                    setSelectedProduct(newProd.id);
                    setSearchTerm(`${newProd.name} ${newProd.variant ? `- ${newProd.variant}` : ''} (${newProd.sku})`);
                    // If created with cost price, use it as default
                    if (newProd.costPrice) setUnitCost(newProd.costPrice);
                }
            },
            (error) => {
                setMessage("❌ Error creando producto: " + (error.response?.data?.message || error.message));
                setTimeout(() => setMessage(""), 5000);
            }
        );
    };

    const resetProductForm = () => {
        setProdName(""); setProdSku(""); setProdPrice(""); setProdStock(""); setProdCategory(""); setProdVariant(""); setProdCostPrice(""); setProdImageUrl("");
    };

    const handleSavePurchase = () => {
        if (!selectedSupplier) { alert("Selecciona un proveedor"); return; }
        if (cart.length === 0) { alert("El carrito está vacío"); return; }

        const purchaseData = {
            supplierId: parseInt(selectedSupplier),
            items: cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                unitCost: item.unitCost
            })),
            total: cart.reduce((acc, item) => acc + item.total, 0)
        };

        PurchaseService.create(purchaseData).then(
            () => {
                setMessage("✅ ¡Compra registrada y Stock actualizado!");
                setCart([]); setSelectedSupplier("");
                // Reload products to update stock in list if needed
                loadData();
            },
            (error) => {
                console.error("Error registrando compra", error);
                setMessage("❌ Error registrando compra: " + (error.response?.data?.message || error.message));
                setTimeout(() => setMessage(""), 5000);
            }
        );
    };

    // Filter products for search
    const filteredProducts = products.filter(p => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(search) ||
            (p.variant && p.variant.toLowerCase().includes(search)) ||
            (p.sku && p.sku.toLowerCase().includes(search));
    });

    const selectProductFromList = (product) => {
        setSelectedProduct(product.id);
        const label = `${product.name} ${product.variant ? `- ${product.variant}` : ''} (${product.sku || 'No SKU'})`;
        setSearchTerm(label);
        setShowDropdown(false);
        // Pre-fill cost if available
        if (product.costPrice) setUnitCost(product.costPrice);
    };

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4 bg-light" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="text-dark fw-bold mb-0">Registro de Compras</h2>
                        <Button variant="primary" onClick={() => { resetProductForm(); setShowProductModal(true); }}>
                            <FaPlus className="me-2" /> Nuevo Producto
                        </Button>
                    </div>

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
                                                <td>
                                                    <span className="fw-bold">{item.product.name}</span>
                                                    {item.product.variant && <span className="text-muted small ms-2">({item.product.variant})</span>}
                                                </td>
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

                                {/* Custom Search Selector */}
                                <Form.Group className="mb-2 position-relative" ref={searchRef}>
                                    <Form.Label>Buscar Producto</Form.Label>
                                    <div className="position-relative">
                                        <Form.Control
                                            type="text"
                                            placeholder="Buscar por Nombre, Variante o SKU..."
                                            value={searchTerm}
                                            onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); setSelectedProduct(""); }}
                                            onFocus={() => setShowDropdown(true)}
                                        />
                                        <div className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted">
                                            <FaSearch size={14} />
                                        </div>
                                    </div>

                                    {showDropdown && (
                                        <div className="position-absolute w-100 bg-white border shadow-lg rounded mt-1" style={{ zIndex: 1000, maxHeight: '250px', overflowY: 'auto' }}>
                                            {filteredProducts.length > 0 ? (
                                                filteredProducts.map(p => (
                                                    <div
                                                        key={p.id}
                                                        className="p-2 border-bottom cursor-pointer hover-bg-light"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => selectProductFromList(p)}
                                                    >
                                                        <div className="fw-bold">{p.name}</div>
                                                        <div className="small text-muted d-flex justify-content-between">
                                                            <span>{p.variant || 'Standard'}</span>
                                                            <span>SKU: {p.sku || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-3 text-center text-muted">No se encontraron productos</div>
                                            )}
                                        </div>
                                    )}
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
                                    <FaPlus className="me-2" /> Agregar Producto
                                </Button>
                            </Card>

                            <Button variant="primary" size="lg" className="w-100 py-3 fw-bold shadow-glow" onClick={handleSavePurchase}>
                                <FaSave className="me-2" /> Guardar Compra
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

                {/* New Product Modal */}
                <Modal show={showProductModal} onHide={() => { setShowProductModal(false); resetProductForm(); }} centered size="lg">
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold text-dark">Nuevo Producto</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <Form onSubmit={handleCreateProduct}>
                            <div className="row g-3">
                                {/* Basic Info */}
                                <div className="col-12">
                                    <h6 className="text-primary fw-bold mb-3">Información Básica</h6>
                                </div>

                                <div className="col-md-8">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Nombre del Producto <span className="text-danger">*</span></Form.Label>
                                        <Form.Control
                                            type="text"
                                            required
                                            placeholder="Ej: Zapatillas Running"
                                            value={prodName}
                                            onChange={(e) => setProdName(e.target.value)}
                                        />
                                    </Form.Group>
                                </div>
                                <div className="col-md-4">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Variante <small className="text-muted">(Color, Talla)</small></Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Ej: Rojo, XL"
                                            value={prodVariant}
                                            onChange={(e) => setProdVariant(e.target.value)}
                                        />
                                    </Form.Group>
                                </div>

                                <div className="col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Categoría <span className="text-danger">*</span></Form.Label>
                                        <Form.Select
                                            required
                                            value={prodCategory}
                                            onChange={(e) => setProdCategory(e.target.value)}
                                        >
                                            <option value="">Selecciona una categoría...</option>
                                            <optgroup label="Categorías Globales">
                                                {globalCategories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </optgroup>
                                            {categories.length > 0 && (
                                                <optgroup label="Tus Categorías">
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            <option value="Otros">Otros</option>
                                        </Form.Select>
                                    </Form.Group>
                                </div>

                                <div className="col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label className="d-flex justify-content-between">
                                            SKU (Código) <span className="text-danger">*</span>
                                            {isGeneratingSku && <span className="spinner-border spinner-border-sm text-primary"></span>}
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            required
                                            value={prodSku}
                                            onChange={(e) => setProdSku(e.target.value)}
                                            placeholder="Generación automática..."
                                        />
                                    </Form.Group>
                                </div>

                                {/* Inventory & Pricing */}
                                <div className="col-12 mt-4">
                                    <h6 className="text-primary fw-bold mb-3">Precios e Inventario</h6>
                                </div>

                                <div className="col-md-4">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Stock Inicial</Form.Label>
                                        <Form.Control type="number" required value={prodStock} onChange={(e) => setProdStock(e.target.value)} min="0" />
                                    </Form.Group>
                                </div>
                                <div className="col-md-4">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Precio Venta ($) <span className="text-danger">*</span></Form.Label>
                                        <Form.Control type="number" step="0.01" required value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} min="0" />
                                    </Form.Group>
                                </div>
                                <div className="col-md-4">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Costo Unitario ($) <small className="text-muted">(Opcional)</small></Form.Label>
                                        <Form.Control type="number" step="0.01" value={prodCostPrice} onChange={(e) => setProdCostPrice(e.target.value)} min="0" placeholder="Para reportes" />
                                    </Form.Group>
                                </div>

                                {/* Media */}
                                <div className="col-12 mt-4">
                                    <h6 className="text-primary fw-bold mb-3">Multimedia</h6>
                                </div>

                                <div className="col-12">
                                    <Form.Group className="mb-3">
                                        <Form.Label>URL de la Imagen <small className="text-muted">(Pega un link de imagen)</small></Form.Label>
                                        <div className="d-flex gap-3">
                                            <Form.Control
                                                type="url"
                                                value={prodImageUrl}
                                                onChange={(e) => setProdImageUrl(e.target.value)}
                                                placeholder="https://ejemplo.com/imagen.jpg"
                                            />
                                            {prodImageUrl && (
                                                <div className="border rounded d-flex align-items-center justify-content-center" style={{ width: 50, height: 38, flexShrink: 0, overflow: 'hidden' }}>
                                                    <img src={prodImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                                </div>
                                            )}
                                        </div>
                                    </Form.Group>
                                </div>

                            </div>

                            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                                <Button variant="light" onClick={() => setShowProductModal(false)}>Cancelar</Button>
                                <Button variant="primary" type="submit" className="px-4">
                                    Guardar Producto
                                </Button>
                            </div>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default NewPurchasePage;
