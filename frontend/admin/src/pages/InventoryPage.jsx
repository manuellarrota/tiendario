import React, { useState, useEffect } from "react";
import { Container, Table, Button, Modal, Form, Alert, Badge, Image } from "react-bootstrap";
import Sidebar from "../components/Sidebar";
import ProductService from "../services/product.service";
import CategoryService from "../services/category.service";
import AuthService from "../services/auth.service";
import { FaPlus, FaTrash, FaBoxOpen, FaExclamationTriangle, FaLock, FaImage } from "react-icons/fa";

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
    const [imageUrl, setImageUrl] = useState("");
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
        setImageUrl(product.imageUrl || "");
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const productData = {
            name,
            sku,
            price,
            stock,
            category,
            variant,
            costPrice,
            imageUrl,
            minStock: 5
        };

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
        setName(""); setSku(""); setPrice(""); setStock(""); setCategory(""); setVariant(""); setCostPrice(""); setImageUrl("");
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
                                <h4 className="fw-bold">Tu inventario está vacío</h4>
                                <p>Agrega tu primer producto para comenzar a vender.</p>
                            </div>
                        ) : (
                            <Table hover responsive className="align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="border-0 text-secondary small text-uppercase ps-4">Producto</th>
                                        <th className="border-0 text-secondary small text-uppercase">SKU / Variante</th>
                                        <th className="border-0 text-secondary small text-uppercase">Categoría</th>
                                        <th className="border-0 text-secondary small text-uppercase text-end">Precio</th>
                                        <th className="border-0 text-secondary small text-uppercase text-center">Stock</th>
                                        <th className="border-0 text-secondary small text-uppercase text-center">Estado</th>
                                        <th className="border-0 text-secondary small text-uppercase text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => (
                                        <tr key={product.id}>
                                            <td className="ps-4">
                                                <div className="d-flex align-items-center">
                                                    <div className="me-3 rounded bg-light d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, overflow: 'hidden' }}>
                                                        {product.imageUrl ? (
                                                            <Image src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <FaImage className="text-secondary opacity-50" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="fw-bold text-dark d-block">{product.name}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="text-secondary fw-bold small">#{product.sku}</div>
                                                {product.variant && <small className="text-muted">{product.variant}</small>}
                                            </td>
                                            <td>
                                                <Badge bg="light" className="text-dark border shadow-sm fw-normal px-3 py-2">{product.category || 'Sin Cat.'}</Badge>
                                            </td>
                                            <td className="text-end fw-bold text-dark">${product.price}</td>
                                            <td className="text-center">
                                                <div className="d-inline-block px-2 py-1 rounded bg-light border fw-bold">
                                                    {product.stock}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                {product.stock < 5 ? (
                                                    <Badge bg="danger" className="text-uppercase" style={{ fontSize: '0.7rem' }}>Bajo Stock</Badge>
                                                ) : (
                                                    <Badge bg="success" className="bg-opacity-25 text-success text-uppercase" style={{ fontSize: '0.7rem' }}>Disponible</Badge>
                                                )}
                                            </td>
                                            <td className="text-end pe-4">
                                                <Button variant="link" className="text-primary me-2 p-0 text-decoration-none fw-bold small" onClick={() => handleEditClick(product)}>
                                                    Editar
                                                </Button>
                                                <Button variant="link" className="text-danger p-0 text-decoration-none fw-bold small" onClick={() => handleDelete(product.id)}>
                                                    Borrar
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
                <Modal show={showModal} onHide={() => { setShowModal(false); setEditingProduct(null); }} centered size="lg">
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold text-dark">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <Form onSubmit={handleSubmit}>
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
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </Form.Group>
                                </div>
                                <div className="col-md-4">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Variante <small className="text-muted">(Color, Talla)</small></Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Ej: Rojo, XL"
                                            value={variant}
                                            onChange={(e) => setVariant(e.target.value)}
                                        />
                                    </Form.Group>
                                </div>

                                <div className="col-md-6">
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
                                            value={sku}
                                            onChange={(e) => setSku(e.target.value)}
                                            disabled={editingProduct}
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
                                        <Form.Control type="number" required value={stock} onChange={(e) => setStock(e.target.value)} min="0" />
                                    </Form.Group>
                                </div>
                                <div className="col-md-4">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Precio Venta ($) <span className="text-danger">*</span></Form.Label>
                                        <Form.Control type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} min="0" />
                                    </Form.Group>
                                </div>
                                <div className="col-md-4">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Costo Unitario ($) <small className="text-muted">(Opcional)</small></Form.Label>
                                        <Form.Control type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} min="0" placeholder="Para reportes" />
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
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                placeholder="https://ejemplo.com/imagen.jpg"
                                            />
                                            {imageUrl && (
                                                <div className="border rounded d-flex align-items-center justify-content-center" style={{ width: 50, height: 38, flexShrink: 0, overflow: 'hidden' }}>
                                                    <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                                </div>
                                            )}
                                        </div>
                                        <Form.Text className="text-muted">
                                            Recomendamos usar imágenes cuadradas (1:1).
                                        </Form.Text>
                                    </Form.Group>
                                </div>

                            </div>

                            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                                <Button variant="light" onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button variant="primary" type="submit" className="px-4">
                                    {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                                </Button>
                            </div>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default InventoryPage;
