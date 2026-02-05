import React, { useState, useEffect } from "react";
import { Container, Table, Button, Modal, Form, Alert, Badge } from "react-bootstrap";
import Sidebar from "../components/Sidebar";
import ProductService from "../services/product.service";
import CategoryService from "../services/category.service";
import AuthService from "../services/auth.service";
import { FaPlus, FaTrash, FaBoxOpen, FaExclamationTriangle, FaLock } from "react-icons/fa";

const InventoryPage = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [message, setMessage] = useState("");
    const user = AuthService.getCurrentUser();
    const subscriptionStatus = user?.subscriptionStatus || 'FREE';
    const isPremium = subscriptionStatus === 'PAID' || subscriptionStatus === 'TRIAL';
    const isBlocked = subscriptionStatus === 'PAST_DUE' || subscriptionStatus === 'SUSPENDED';
    const canCreateProducts = isPremium || (subscriptionStatus === 'FREE' && products.length < 10);

    // Form State
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [category, setCategory] = useState("");
    const [variant, setVariant] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [isGeneratingSku, setIsGeneratingSku] = useState(false);

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, []);

    const loadCategories = () => {
        CategoryService.getAll().then(
            (res) => setCategories(res.data),
            (err) => console.error("Error loading categories", err)
        );
    };

    // Suggest SKU when name changes (and category if available)
    useEffect(() => {
        if (name.length > 2 && !sku && !editingProduct) {
            const delayDebounceFn = setTimeout(() => {
                setIsGeneratingSku(true);
                ProductService.getSuggestedSku(name, category, variant).then(
                    (response) => {
                        setSku(response.data.suggestedSku);
                        setIsGeneratingSku(false);
                    },
                    () => setIsGeneratingSku(false)
                );
            }, 800);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [name, category, variant, editingProduct]);

    const loadProducts = () => {
        ProductService.getAll().then(
            (response) => {
                setProducts(response.data);
            },
            (error) => {
                console.error("Error loading products", error);
            }
        );
    };

    const handleEditClick = (product) => {
        setEditingProduct(product);
        setName(product.name);
        setSku(product.sku);
        setPrice(product.price);
        setStock(product.stock);
        setCategory(product.category);
        setVariant(product.variant || "");
        setCostPrice(product.costPrice || "");
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const productData = { name, sku, price, stock, category, variant, costPrice, minStock: 5 };

        if (editingProduct) {
            ProductService.update(editingProduct.id, productData).then(
                () => {
                    setMessage("Producto actualizado con éxito!");
                    setShowModal(false);
                    setEditingProduct(null);
                    loadProducts();
                    resetForm();
                    setTimeout(() => setMessage(""), 3000);
                },
                (error) => {
                    const resMessage = (error.response && error.response.data && error.response.data.message) || error.message;
                    setMessage(resMessage);
                }
            );
        } else {
            ProductService.create(productData).then(
                () => {
                    setMessage("Producto creado con éxito!");
                    setShowModal(false);
                    loadProducts();
                    resetForm();
                    setTimeout(() => setMessage(""), 3000);
                },
                (error) => {
                    const resMessage = (error.response && error.response.data && error.response.data.message) || error.message;
                    setMessage(resMessage);
                }
            );
        }
    };

    const resetForm = () => {
        setName(""); setSku(""); setPrice(""); setStock(""); setCategory(""); setVariant(""); setCostPrice("");
        setEditingProduct(null);
    };

    const handleDelete = (id) => {
        if (window.confirm("¿Estás seguro de eliminar este producto?")) {
            ProductService.remove(id).then(
                () => {
                    loadProducts();
                },
                (error) => {
                    alert("Error al eliminar");
                }
            );
        }
    };

    // Predefined global categories
    const globalCategories = ["Ropa", "Tecnología", "Alimentos", "Hogar", "Deportes", "Salud y Belleza", "Juguetes", "Libros"];

    return (
        <div className="d-flex admin-content-area overflow-hidden">
            <Sidebar />
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 mb-md-5 gap-3">
                        <div>
                            <h2 className="display-6 fw-bold mb-0 text-gradient">Inventario</h2>
                            {!isPremium && !isBlocked && (
                                <div className="mt-3 p-3 glass-card-admin" style={{ maxWidth: '300px' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <small className="text-secondary fw-bold small">Uso del Plan Gratis</small>
                                        <small className="text-primary fw-bold small">{products.length}/10</small>
                                    </div>
                                    <div className="progress" style={{ height: '6px', borderRadius: '10px' }}>
                                        <div
                                            className={`progress-bar ${products.length >= 8 ? 'bg-warning' : 'bg-primary'}`}
                                            role="progressbar"
                                            style={{ width: `${(products.length / 10) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <Button
                            className="btn-primary px-4 py-2 shadow-lg w-auto"
                            onClick={() => { resetForm(); setShowModal(true); }}
                            disabled={isBlocked || (!isPremium && products.length >= 10)}
                        >
                            <FaPlus className="me-2" />
                            {isBlocked ? 'Acceso Bloqueado' : (!isPremium && products.length >= 10 ? 'Límite Alcanzado' : 'Nuevo Producto')}
                        </Button>
                    </div>

                    {/* Subscription Status Alerts */}
                    {isBlocked && (
                        <Alert variant={subscriptionStatus === 'PAST_DUE' ? 'warning' : 'danger'}
                            className="d-flex align-items-center shadow-sm mb-4 rounded-4">
                            <div className="me-3">
                                {subscriptionStatus === 'SUSPENDED'
                                    ? <FaLock size={28} className="text-danger" />
                                    : <FaExclamationTriangle size={28} className="text-warning" />
                                }
                            </div>
                            <div>
                                <h6 className="mb-1 fw-bold">
                                    {subscriptionStatus === 'PAST_DUE' && '⚠️ Tu suscripción ha vencido'}
                                    {subscriptionStatus === 'SUSPENDED' && '🔒 Cuenta Suspendida'}
                                </h6>
                                <p className="mb-0 small">
                                    {subscriptionStatus === 'PAST_DUE' && 'No puedes crear nuevos productos hasta que renueves tu plan. Tus productos existentes siguen visibles.'}
                                    {subscriptionStatus === 'SUSPENDED' && 'Tu cuenta ha sido suspendida. Contacta al administrador para más información.'}
                                </p>
                            </div>
                        </Alert>
                    )}

                    {message && <Alert variant="info" className="border-0 shadow-sm rounded-4 mb-4">{message}</Alert>}

                    <div className="glass-card-admin p-0 overflow-hidden border-0 shadow-sm">
                        {products.length === 0 ? (
                            <div className="text-center py-5 text-secondary">
                                <FaBoxOpen size={50} className="mb-3 opacity-25" />
                                <h4>Tu inventario está vacío</h4>
                                <p>Agrega tu primer producto para comenzar a vender.</p>
                            </div>
                        ) : (
                            <Table hover responsive className="align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="border-0 text-secondary small text-uppercase">SKU</th>
                                        <th className="border-0 text-secondary small text-uppercase">Producto</th>
                                        <th className="border-0 text-secondary small text-uppercase">Categoría</th>
                                        <th className="border-0 text-secondary small text-uppercase text-end">Precio</th>
                                        <th className="border-0 text-secondary small text-uppercase text-center">Stock</th>
                                        <th className="border-0 text-secondary small text-uppercase text-center">Estado</th>
                                        <th className="border-0 text-secondary small text-uppercase text-end">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => (
                                        <tr key={product.id}>
                                            <td className="text-secondary fw-bold">#{product.sku}</td>
                                            <td>
                                                <span className="fw-bold text-dark">{product.name}</span>
                                                {product.variant && <small className="text-muted d-block">{product.variant}</small>}
                                            </td>
                                            <td>
                                                <Badge bg="info" className="bg-opacity-10 text-info fw-normal">{product.category || 'Sin Cat.'}</Badge>
                                            </td>
                                            <td className="text-end fw-bold text-dark">${product.price}</td>
                                            <td className="text-center">{product.stock}</td>
                                            <td className="text-center">
                                                {product.stock < 5 ? (
                                                    <Badge bg="danger">Bajo Stock</Badge>
                                                ) : (
                                                    <Badge bg="success" className="bg-opacity-25 text-success">Disponible</Badge>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                <Button variant="link" className="text-primary me-2 p-0" onClick={() => handleEditClick(product)}>
                                                    Editar
                                                </Button>
                                                <Button variant="link" className="text-danger p-0" onClick={() => handleDelete(product.id)}>
                                                    <FaTrash />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </div>
                </Container>

                {/* Create/Edit Modal */}
                <Modal show={showModal} onHide={() => { setShowModal(false); setEditingProduct(null); }} centered>
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold text-dark">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre del Producto</Form.Label>
                                <Form.Control
                                    type="text"
                                    required
                                    placeholder="Ej: Coca Cola"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Variante / SKU Extra (Ej: 1.5L, Rojo, XL)</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Ej: 1.5L"
                                    value={variant}
                                    onChange={(e) => setVariant(e.target.value)}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Categoría <span className="text-danger">*</span></Form.Label>
                                <Form.Select
                                    required
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
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
                                <Form.Text className="text-muted small">
                                    La categoría es obligatoria y ayuda a los clientes a encontrar tus productos.
                                </Form.Text>
                            </Form.Group>

                            <div className="row">
                                <div className="col-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label className="d-flex justify-content-between">
                                            SKU (Código)
                                            {isGeneratingSku && <span className="spinner-border spinner-border-sm text-primary"></span>}
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            required
                                            value={sku}
                                            onChange={(e) => setSku(e.target.value)}
                                            disabled={editingProduct}
                                        />
                                    </Form.Group>
                                </div>
                                <div className="col-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Stock Inicial</Form.Label>
                                        <Form.Control type="number" required value={stock} onChange={(e) => setStock(e.target.value)} />
                                    </Form.Group>
                                </div>
                            </div>
                            <Form.Group className="mb-4">
                                <Form.Label>Precio de Venta</Form.Label>
                                <Form.Control type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} />
                            </Form.Group>
                            <Button variant="primary" type="submit" className="w-100 py-2">
                                {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default InventoryPage;
