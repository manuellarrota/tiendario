import React, { useState, useEffect } from "react";
import { Container, Table, Button, Modal, Form, Alert, Badge, Image, OverlayTrigger, Tooltip } from "react-bootstrap";
import Sidebar from "../components/Sidebar";
import ProductService from "../services/product.service";
import CategoryService from "../services/category.service";
import AuthService from "../services/auth.service";
import InventoryService from "../services/inventory.service";
import { FaPlus, FaTrash, FaBoxOpen, FaExclamationTriangle, FaLock, FaImage, FaFileExcel, FaFilePdf, FaUpload } from "react-icons/fa";

const InventoryPage = () => {
    // ... (logic remains same)
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [message, setMessage] = useState("");
    const user = AuthService.getCurrentUser();
    const subscriptionStatus = user?.subscriptionStatus || 'FREE';
    const isPremium = subscriptionStatus === 'PAID' || subscriptionStatus === 'TRIAL';
    const isBlocked = subscriptionStatus === 'PAST_DUE' || subscriptionStatus === 'SUSPENDED';

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
    const [isUploading, setIsUploading] = useState(false);
    const [catalogSuggestions, setCatalogSuggestions] = useState([]);
    const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);

    // Helper to get full image URL
    const getFullImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return (import.meta.env.VITE_API_URL || '') + path;
    };

    const renderTooltip = (props, text) => (
        <Tooltip id="button-tooltip" {...props}>
            {text}
        </Tooltip>
    );

    const loadCategories = () => {
        CategoryService.getAll().then(
            (res) => setCategories(res.data),
            (err) => console.error("Error loading categories", err)
        );
    };

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

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, []);

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
    }, [name, category, variant, editingProduct, sku]);

    // Search Catalog when name changes
    useEffect(() => {
        if (name.length > 2 && !editingProduct) {
            const delayDebounceFn = setTimeout(() => {
                ProductService.searchCatalog(name).then(
                    (res) => {
                        setCatalogSuggestions(res.data);
                        setShowCatalogSuggestions(res.data.length > 0);
                    },
                    (err) => console.error("Error searching catalog", err)
                );
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setCatalogSuggestions([]);
            setShowCatalogSuggestions(false);
        }
    }, [name, editingProduct]);

    const handleSelectCatalogProduct = (cp) => {
        setName(cp.name);
        setSku(cp.sku);
        setImageUrl(cp.imageUrl || "");
        if (cp.description) {
            // If we had a description field in the form, we'd set it here
        }
        setShowCatalogSuggestions(false);
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
                    setMessage("¡Genial! El producto se ha actualizado correctamente.");
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
                    setMessage("¡Listo! Nuevo producto añadido a tu inventario.");
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
                () => {
                    setMessage("❌ No pudimos eliminar el producto. Intente más tarde.");
                    setTimeout(() => setMessage(""), 3500);
                }
            );
        }
    };

    const handleExportExcel = () => {
        InventoryService.exportExcel().then(response => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'inventario.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        }).catch(() => setMessage("Error exportando a Excel"));
    };

    const handleExportPdf = () => {
        InventoryService.exportPdf().then(response => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'inventario.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
        }).catch(() => setMessage("Error exportando a PDF"));
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setMessage("Importando productos...");
        InventoryService.importExcel(file).then(response => {
            setMessage(response.data.join("\n"));
            loadProducts();
            e.target.value = null;
        }).catch(() => {
            setMessage("Error importando productos");
            e.target.value = null;
        });
    };

    const handleUploadImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        ProductService.uploadImage(file).then(
            res => {
                setImageUrl(res.data.message); // Should contain path like /api/products/images/filename.jpg
                setIsUploading(false);
            },
            err => {
                console.error("Upload failed", err);
                setMessage("❌ Lo sentimos, no pudimos procesar la imagen.");
                setIsUploading(false);
                setTimeout(() => setMessage(""), 3500);
            }
        );
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
                        <div className="d-flex flex-wrap gap-2">
                            <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Descarga toda tu lista de productos en formato Excel")}>
                                <Button variant="outline-success" className="px-3 shadow-sm d-flex align-items-center gap-2" onClick={handleExportExcel}>
                                    <FaFileExcel /> Descargar en Excel
                                </Button>
                            </OverlayTrigger>

                            <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Genera un reporte PDF de tu inventario actual")}>
                                <Button variant="outline-danger" className="px-3 shadow-sm d-flex align-items-center gap-2" onClick={handleExportPdf}>
                                    <FaFilePdf /> Descargar en PDF
                                </Button>
                            </OverlayTrigger>

                            <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Sube un archivo Excel para cargar productos masivamente")}>
                                <label className="btn btn-outline-primary px-3 shadow-sm mb-0 d-flex align-items-center gap-2">
                                    <FaUpload /> Importar
                                    <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
                                </label>
                            </OverlayTrigger>

                            <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Añadir un nuevo producto a tu catálogo")}>
                                <Button
                                    className="btn-primary px-4 py-2 shadow-lg w-auto"
                                    onClick={() => { resetForm(); setShowModal(true); }}
                                    disabled={isBlocked || (!isPremium && products.length >= 10)}
                                >
                                    <FaPlus className="me-2" />
                                    {isBlocked ? 'Acceso Bloqueado' : (!isPremium && products.length >= 10 ? 'Límite Alcanzado' : 'Nuevo Producto')}
                                </Button>
                            </OverlayTrigger>
                        </div>
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
                                        <th className="border-0 text-secondary small text-uppercase">Código / Variante</th>
                                        <th className="border-0 text-secondary small text-uppercase">Categoría</th>
                                        <th className="border-0 text-secondary small text-uppercase text-end">Precio al Público</th>
                                        <th className="border-0 text-secondary small text-uppercase text-center">Unidades</th>
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
                                                            <Image src={getFullImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                    <Form.Group className="mb-3 position-relative">
                                        <Form.Label>Nombre del Producto <span className="text-danger">*</span></Form.Label>
                                        <Form.Control
                                            type="text"
                                            required
                                            placeholder="Ej: Zapatillas Running"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            onFocus={() => catalogSuggestions.length > 0 && setShowCatalogSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowCatalogSuggestions(false), 200)}
                                        />
                                        {showCatalogSuggestions && (
                                            <div className="list-group position-absolute w-100 shadow-lg" style={{ zIndex: 1000, top: '100%' }}>
                                                {catalogSuggestions.map(cp => (
                                                    <button
                                                        key={cp.id}
                                                        type="button"
                                                        className="list-group-item list-group-item-action d-flex align-items-center gap-2"
                                                        onClick={() => handleSelectCatalogProduct(cp)}
                                                    >
                                                        {cp.imageUrl && <img src={cp.imageUrl} alt="" style={{ width: '30px', height: '30px', objectFit: 'cover' }} className="rounded" />}
                                                        <div>
                                                            <div className="fw-bold small">{cp.name}</div>
                                                            <small className="text-muted">SKU: {cp.sku}</small>
                                                        </div>
                                                        <Badge bg="info" className="ms-auto small">Sugerencia Global</Badge>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
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
                                            Código de Barras / SKU <span className="text-danger">*</span>
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
                                        <Form.Label>Unidades en Existencia</Form.Label>
                                        <Form.Control type="number" required value={stock} onChange={(e) => setStock(e.target.value)} min="0" placeholder="¿Cuántos tienes?" />
                                    </Form.Group>
                                </div>
                                <div className="col-md-4">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Precio al Público ($) <span className="text-danger">*</span></Form.Label>
                                        <Form.Control type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} min="0" placeholder="0.00" />
                                    </Form.Group>
                                </div>
                                <div className="col-md-4">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Costo de Adquisición ($) <small className="text-muted">(Privado)</small></Form.Label>
                                        <Form.Control type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} min="0" placeholder="Solo para tus reportes" />
                                    </Form.Group>
                                </div>

                                {/* Media */}
                                <div className="col-12 mt-4">
                                    <h6 className="text-primary fw-bold mb-3">Multimedia</h6>
                                </div>

                                <div className="col-12">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Imagen del Producto</Form.Label>
                                        <div className="d-flex flex-column gap-3">
                                            {/* File Upload Option */}
                                            <div className="d-flex align-items-center gap-2">
                                                <label className={`btn ${isUploading ? 'btn-secondary' : 'btn-outline-primary'} mb-0`}>
                                                    {isUploading ? <span className="spinner-border spinner-border-sm me-2"></span> : <FaUpload className="me-2" />}
                                                    {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                                                    <input type="file" hidden accept="image/*" onChange={handleUploadImage} disabled={isUploading} />
                                                </label>
                                                <span className="text-muted small">o pega una URL abajo</span>
                                            </div>

                                            {/* URL Input Option */}
                                            <div className="d-flex gap-3">
                                                <Form.Control
                                                    type="text"
                                                    value={imageUrl}
                                                    onChange={(e) => setImageUrl(e.target.value)}
                                                    placeholder="https://ejemplo.com/imagen.jpg o ruta/interna"
                                                />
                                                {imageUrl && (
                                                    <div className="border rounded d-flex align-items-center justify-content-center bg-light" style={{ width: 80, height: 45, flexShrink: 0, overflow: 'hidden' }}>
                                                        <img src={getFullImageUrl(imageUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Form.Text className="text-muted">
                                            Recomendamos usar imágenes cuadradas (1:1) de menos de 2MB.
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
