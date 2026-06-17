import React, { useState, useEffect } from "react";
import { Container, Table, Button, Modal, Form, Alert, Badge, Image, OverlayTrigger, Tooltip, Pagination, Dropdown } from "react-bootstrap";
import Sidebar from "../components/Sidebar";
import Layout from "../components/Layout";
import ProductService from "../services/product.service";
import CategoryService from "../services/category.service";
import CategorySuggestionService from "../services/category-suggestion.service";
import AuthService from "../services/auth.service";
import InventoryService from "../services/inventory.service";
import { FaPlus, FaTrash, FaEdit, FaBoxOpen, FaExclamationTriangle, FaLock, FaImage, FaFileExcel, FaFilePdf, FaUpload, FaSort, FaSortUp, FaSortDown, FaBarcode, FaChartLine, FaCogs } from "react-icons/fa";
import InventoryImportWizard from "../components/InventoryImportWizard";
import { useToast } from "../components/ToastContext";

const InventoryPage = () => {
    // ... (logic remains same)
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [message, setMessage] = useState("");
    const user = AuthService.getCurrentUser();
    const subscriptionStatus = user?.subscriptionStatus || 'TRIAL';
    const isPremium = subscriptionStatus === 'PAID' || subscriptionStatus === 'TRIAL';
    const isBlocked = subscriptionStatus === 'PAST_DUE' || subscriptionStatus === 'SUSPENDED';
    const toast = useToast();

    // Form State
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [minStock, setMinStock] = useState("5");
    const [category, setCategory] = useState("");
    const [variant, setVariant] = useState("");
    const [brand, setBrand] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [barcode, setBarcode] = useState("");
    const [isGeneratingSku, setIsGeneratingSku] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [catalogSuggestions, setCatalogSuggestions] = useState([]);
    const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);

    // Category Suggestion
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [suggestedCategoryName, setSuggestedCategoryName] = useState("");
    const [isSuggesting, setIsSuggesting] = useState(false);

    // History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryProduct, setSelectedHistoryProduct] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

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

    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [sortBy, setSortBy] = useState("id");
    const [sortDir, setSortDir] = useState("desc");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [onlyLowStock, setOnlyLowStock] = useState(false);
    const [onlyLowMargin, setOnlyLowMargin] = useState(false);

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const loadCategories = () => {
        CategoryService.getAll().then(
            (res) => setCategories(res.data),
            (err) => console.error("Error loading categories", err)
        );

        CategorySuggestionService.getAll().then(
            (res) => setSuggestions(res.data),
            (err) => console.error("Error loading suggestions", err)
        );
    };

    const loadProducts = () => {
        const params = {
            page: currentPage,
            size: pageSize,
            sort: `${sortBy},${sortDir}`,
            q: debouncedSearchQuery || undefined,
            lowStock: onlyLowStock,
            lowMargin: onlyLowMargin
        };

        ProductService.getAll(params).then(
            (response) => {
                const { products, totalPages, totalItems } = response.data;
                setProducts(products);
                setTotalPages(totalPages);
                setTotalItems(totalItems);
            },
            (error) => {
                console.error("Error loading products", error);
            }
        );
    };

    useEffect(() => {
        loadProducts();
    }, [currentPage, pageSize, sortBy, sortDir, debouncedSearchQuery, onlyLowStock, onlyLowMargin]);

    useEffect(() => {
        loadCategories();
    }, []);

    const handleViewHistory = (product) => {
        setSelectedHistoryProduct(product);
        setShowHistoryModal(true);
        setHistoryLoading(true);
        ProductService.getHistory(product.id).then(
            (res) => {
                setHistoryData(res.data.monthlyData || []);
                setHistoryLoading(false);
            },
            (err) => {
                console.error("Error loading product history", err);
                setHistoryLoading(false);
            }
        );
    };

    // Suggest SKU when name changes (and category if available)
    useEffect(() => {
        if (name.length > 2 && !sku && !editingProduct) {
            const delayDebounceFn = setTimeout(() => {
                setIsGeneratingSku(true);
                ProductService.getSuggestedSku(name, category, variant, brand).then(
                    (response) => {
                        setSku(response.data.suggestedSku);
                        setIsGeneratingSku(false);
                    },
                    () => setIsGeneratingSku(false)
                );
            }, 800);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [name, category, variant, brand, editingProduct, sku]);

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

    const handleSort = (field) => {
        const isAsc = sortBy === field && sortDir === "asc";
        setSortDir(isAsc ? "desc" : "asc");
        setSortBy(field);
        setCurrentPage(0);
    };

    const renderSortIcon = (field) => {
        if (sortBy !== field) return <FaSort className="ms-1 text-muted opacity-50" size={10} />;
        return sortDir === "asc" ? <FaSortUp className="ms-1 text-primary" size={12} /> : <FaSortDown className="ms-1 text-primary" size={12} />;
    };

    const handleSelectCatalogProduct = (cp) => {
        setName(cp.name);
        setSku(cp.sku);
        setBrand(cp.brand || "");
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
        setMinStock(product.minStock || "5");
        setCategory(product.category || "");
        setVariant(product.variant || "");
        setBrand(product.brand || "");
        setCostPrice(product.costPrice || "");
        setImageUrl(product.imageUrl || "");
        setBarcode(product.barcode || "");

        // Ensure the product's category is in the list so the <select> can pre-select it
        if (product.category) {
            setCategories(prev => {
                const exists = prev.some(c => c.name === product.category);
                if (!exists) {
                    return [...prev, { id: 'edit-temp-' + product.id, name: product.category }];
                }
                return prev;
            });
        }

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
            brand,
            costPrice,
            imageUrl,
            barcode: barcode.trim() || null,
            minStock: minStock === "" ? 5 : parseInt(minStock)
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
                    setMessage("❌ " + (error.translatedMessage || "No se pudo actualizar el producto."));
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
                    setMessage("❌ " + (error.translatedMessage || "No se pudo crear el producto."));
                }
            );
        }
    };

    const resetForm = () => {
        setName(""); setSku(""); setPrice(""); setStock(""); setCategory(""); setVariant(""); setBrand(""); setCostPrice(""); setImageUrl(""); setBarcode(""); setMinStock("5");
        setEditingProduct(null);
    };

    const confirmDelete = (product) => {
        setProductToDelete(product);
        setShowDeleteModal(true);
    };

    const handleDelete = () => {
        if (productToDelete) {
            ProductService.remove(productToDelete.id).then(
                () => {
                    loadProducts();
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                },
                () => {
                    setMessage("❌ No pudimos eliminar el producto. Intente más tarde.");
                    setShowDeleteModal(false);
                    setProductToDelete(null);
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

    const handleDownloadTemplate = () => {
        InventoryService.downloadTemplate().then(response => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'formato_carga_inventario.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        }).catch(() => setMessage("Error descargando el formato Excel"));
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setMessage("Importando productos...");
        InventoryService.importExcel(file).then(response => {
            setMessage(response.data.join("\n"));
            loadProducts();
            e.target.value = null;
        }).catch((error) => {
            setMessage("❌ " + (error.translatedMessage || "Error importando productos"));
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
        <Layout>
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
                        {(user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN')) && (
                            <>
                                <Dropdown>
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Importa o exporta tus productos masivamente")}>
                                        <Dropdown.Toggle variant="outline-secondary" className="px-3 py-2 shadow-sm d-flex align-items-center gap-2 rounded-pill bg-white">
                                            <FaCogs /> Opciones
                                        </Dropdown.Toggle>
                                    </OverlayTrigger>
                                    <Dropdown.Menu className="shadow-lg border-0 rounded-4 mt-2" style={{ minWidth: '280px' }}>
                                        <div className="px-3 py-2 text-muted small fw-bold text-uppercase" style={{ letterSpacing: '1px', fontSize: '0.7rem' }}>
                                            Exportar
                                        </div>
                                        <Dropdown.Item onClick={handleExportExcel} className="d-flex align-items-center gap-3 py-2">
                                            <div className="bg-success bg-opacity-10 p-2 rounded text-success d-flex"><FaFileExcel size={18} /></div>
                                            <div>
                                                <div className="fw-bold text-dark">Descargar Excel</div>
                                                <small className="text-muted d-block" style={{ fontSize: '0.75rem', whiteSpace: 'normal' }}>Obtén todo tu inventario actual en una tabla .xlsx</small>
                                            </div>
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={handleExportPdf} className="d-flex align-items-center gap-3 py-2">
                                            <div className="bg-danger bg-opacity-10 p-2 rounded text-danger d-flex"><FaFilePdf size={18} /></div>
                                            <div>
                                                <div className="fw-bold text-dark">Generar Reporte PDF</div>
                                                <small className="text-muted d-block" style={{ fontSize: '0.75rem', whiteSpace: 'normal' }}>Descarga un documento PDF listo para imprimir</small>
                                            </div>
                                        </Dropdown.Item>
                                        
                                        <Dropdown.Divider className="my-2" />
                                        
                                        <div className="px-3 py-2 text-muted small fw-bold text-uppercase" style={{ letterSpacing: '1px', fontSize: '0.7rem' }}>
                                            Importar Masivo
                                        </div>
                                        <Dropdown.Item onClick={handleDownloadTemplate} className="d-flex align-items-center gap-3 py-2">
                                            <div className="bg-success bg-opacity-10 p-2 rounded text-success d-flex"><FaFileExcel size={18} /></div>
                                            <div>
                                                <div className="fw-bold text-dark">Bajar Plantilla Vacía</div>
                                                <small className="text-muted d-block" style={{ fontSize: '0.75rem', whiteSpace: 'normal' }}>Formato base para llenar con tus productos nuevos</small>
                                            </div>
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={() => setShowImportWizard(true)} className="d-flex align-items-center gap-3 py-2">
                                            <div className="bg-primary bg-opacity-10 p-2 rounded text-primary d-flex"><FaUpload size={18} /></div>
                                            <div>
                                                <div className="fw-bold text-dark">Subir Archivo (.csv)</div>
                                                <small className="text-muted d-block" style={{ fontSize: '0.75rem', whiteSpace: 'normal' }}>Carga múltiples productos de una sola vez</small>
                                            </div>
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>

                                <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Añadir un nuevo producto a tu catálogo")}>
                                    <Button
                                        className="btn-primary px-4 py-2 shadow-sm rounded-pill w-auto d-flex align-items-center"
                                        onClick={() => { resetForm(); setShowModal(true); }}
                                        disabled={isBlocked || (!isPremium && products.length >= 10)}
                                    >
                                        <FaPlus className="me-2" />
                                        {isBlocked ? 'Acceso Bloqueado' : (!isPremium && products.length >= 10 ? 'Límite Alcanzado' : 'Nuevo Producto')}
                                    </Button>
                                </OverlayTrigger>
                            </>
                        )}
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

                <div className="mb-4 d-flex gap-3 align-items-center">
                    <div className="glass-card-admin p-3 border-0 shadow-sm d-flex align-items-center flex-grow-1">
                        <div className="position-relative flex-grow-1">
                            <Form.Control
                                type="text"
                                placeholder="🔍 Buscar producto por nombre, SKU o marca..."
                                className="border-0 bg-transparent shadow-none fs-5 py-2"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {searchQuery && (
                            <Button variant="link" className="text-secondary p-0 me-2" onClick={() => setSearchQuery("")}>
                                Limpiar
                            </Button>
                        )}
                    </div>
                    
                    <Button 
                        variant={onlyLowStock ? "danger" : "outline-secondary"}
                        className={`px-4 shadow-sm fw-bold d-flex align-items-center gap-2 rounded-4 ${onlyLowStock ? 'animate-pulse' : ''}`}
                        onClick={() => { setOnlyLowStock(!onlyLowStock); setCurrentPage(0); }}
                        style={{ height: '70px', minWidth: '180px' }}
                    >
                        <FaExclamationTriangle className={onlyLowStock ? "text-white" : "text-danger"} />
                        {onlyLowStock ? "Mostrando Stock Bajo" : "Filtrar Stock Bajo"}
                    </Button>
                    
                    <Button 
                        variant={onlyLowMargin ? "warning" : "outline-secondary"}
                        className={`px-4 shadow-sm fw-bold d-flex align-items-center gap-2 rounded-4 ${onlyLowMargin ? 'text-dark' : ''}`}
                        onClick={() => { setOnlyLowMargin(!onlyLowMargin); setCurrentPage(0); }}
                        style={{ height: '70px', minWidth: '180px' }}
                    >
                        <FaChartLine className={onlyLowMargin ? "text-dark" : "text-warning"} />
                        {onlyLowMargin ? "Mostrando Margen Bajo" : "Filtrar Margen Bajo"}
                    </Button>
                </div>

                <div className="glass-card-admin p-0 overflow-hidden border-0 shadow-sm">
                    {products.length === 0 ? (
                        <div className="text-center py-5 text-secondary">
                            <FaBoxOpen size={50} className="mb-3 opacity-25" />
                            <h4 className="fw-bold">Tu inventario está vacío</h4>
                            <p>Agrega tu primer producto para comenzar a vender.</p>
                        </div>
                    ) : (
                        <>
                            <Table hover responsive className="align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="border-0 text-secondary small text-uppercase ps-4 pointer-cursor" style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                                            Producto {renderSortIcon('name')}
                                        </th>
                                        <th className="border-0 text-secondary small text-uppercase pointer-cursor" style={{ cursor: 'pointer' }} onClick={() => handleSort('sku')}>
                                            Código {renderSortIcon('sku')}
                                        </th>
                                        <th className="border-0 text-secondary small text-uppercase pointer-cursor" style={{ cursor: 'pointer' }} onClick={() => handleSort('category')}>
                                            Categoría {renderSortIcon('category')}
                                        </th>
                                        <th className="border-0 text-secondary small text-uppercase text-end pointer-cursor" style={{ cursor: 'pointer' }} onClick={() => handleSort('price')}>
                                            Precio {renderSortIcon('price')}
                                        </th>
                                        <th className="border-0 text-secondary small text-uppercase text-center pointer-cursor" style={{ cursor: 'pointer' }} onClick={() => handleSort('stock')}>
                                            Stock {renderSortIcon('stock')}
                                        </th>
                                        <th className="border-0 text-secondary small text-uppercase text-center">Estado</th>
                                        {(user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN')) && (
                                            <th className="border-0 text-secondary small text-uppercase text-end pe-4">Acciones</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => (
                                        <tr key={product.id} onClick={() => handleViewHistory(product)} style={{ cursor: 'pointer' }} className="table-row-hover">
                                            <td className="ps-4">
                                                <div className="d-flex align-items-center">
                                                    <div className="me-3 rounded bg-light d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, overflow: 'hidden', border: '1px solid #eee' }}>
                                                        {product.imageUrl ? (
                                                            <Image src={getFullImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <FaImage className="text-secondary opacity-50" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="fw-bold text-dark d-block" style={{ fontSize: '0.9rem' }}>{product.name}</span>
                                                        {product.brand && <small className="text-primary d-block" style={{ fontSize: '0.75rem', fontWeight: '500' }}>{product.brand}</small>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="text-secondary fw-bold small">#{product.sku}</div>
                                                {product.variant && <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>{product.variant}</small>}
                                            </td>
                                            <td>
                                                <Badge bg="light" className="text-dark border shadow-sm fw-normal px-2 py-1" style={{ fontSize: '0.75rem' }}>{product.category || 'Sin Cat.'}</Badge>
                                            </td>
                                            <td className="text-end align-middle">
                                                <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>${product.price}</div>
                                                {product.price > 0 && product.costPrice >= product.price * 0.85 && (
                                                    <Badge bg="warning" text="dark" className="mt-1 shadow-sm opacity-75" style={{ fontSize: '0.65rem' }}>📉 Margen Bajo</Badge>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <div className="d-inline-block px-2 py-1 rounded bg-light border fw-bold small">
                                                    {product.stock}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                {product.stock <= (product.minStock || 5) ? (
                                                    <Badge bg="danger" className="text-uppercase" style={{ fontSize: '0.65rem' }}>Bajo Stock</Badge>
                                                ) : (
                                                    <Badge bg="success" className="bg-opacity-25 text-success text-uppercase" style={{ fontSize: '0.65rem' }}>Disponible</Badge>
                                                )}
                                            </td>
                                            {(user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN')) && (
                                                <td className="text-end pe-4" onClick={(e) => e.stopPropagation()}>
                                                    <OverlayTrigger overlay={<Tooltip>Editar</Tooltip>}>
                                                        <Button variant="link" className="text-primary me-2 p-0 text-decoration-none fw-bold small" onClick={() => handleEditClick(product)}>
                                                            <FaEdit size={16} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <OverlayTrigger overlay={<Tooltip>Borrar</Tooltip>}>
                                                        <Button variant="link" className="text-danger p-0 text-decoration-none fw-bold small" onClick={() => confirmDelete(product)}>
                                                            <FaTrash size={16} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {/* Pagination Footer */}
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 border-top bg-light">
                                <div className="text-muted small mb-3 mb-md-0">
                                    Mostrando <b>{products.length}</b> de <b>{totalItems}</b> productos
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <small className="text-muted">Por página:</small>
                                        <Form.Select
                                            size="sm"
                                            style={{ width: '70px' }}
                                            value={pageSize}
                                            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                                        >
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </Form.Select>
                                    </div>
                                    <Pagination size="sm" className="mb-0">
                                        <Pagination.First disabled={currentPage === 0} onClick={() => setCurrentPage(0)} />
                                        <Pagination.Prev disabled={currentPage === 0} onClick={() => setCurrentPage(currentPage - 1)} />
                                        {[...Array(totalPages)].map((_, i) => (
                                            <Pagination.Item key={i} active={i === currentPage} onClick={() => setCurrentPage(i)}>
                                                {i + 1}
                                            </Pagination.Item>
                                        ))}
                                        <Pagination.Next disabled={currentPage === totalPages - 1} onClick={() => setCurrentPage(currentPage + 1)} />
                                        <Pagination.Last disabled={currentPage === totalPages - 1} onClick={() => setCurrentPage(totalPages - 1)} />
                                    </Pagination>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Container>

            {/* Create/Edit Modal */}
            <Modal scrollable show={showModal} onHide={() => { setShowModal(false); setEditingProduct(null); }} centered size="lg">
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
                                                        <div className="d-flex gap-2 align-items-center">
                                                            <small className="text-primary fw-bold" style={{ fontSize: '0.7rem' }}>{cp.brand || 'Marca no reg.'}</small>
                                                            <small className="text-muted">SKU: {cp.sku}</small>
                                                        </div>
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
                                    <Form.Label>Variante / Presentación <small className="text-muted">(Opcional)</small></Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ej: Manzana, Naranja, XL, 500ml"
                                        value={variant}
                                        onChange={(e) => setVariant(e.target.value)}
                                    />
                                    <Form.Text className="text-muted">
                                        Para distinguir versiones del mismo producto. Ej: <em>Jugo Del Valle → Manzana / Naranja</em>
                                    </Form.Text>
                                </Form.Group>
                            </div>

                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Marca <small className="text-muted">(Opcional)</small></Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ej: Del Valle, Stanley, Nike"
                                        value={brand}
                                        onChange={(e) => setBrand(e.target.value)}
                                    />
                                    <Form.Text className="text-muted">
                                        Fabricante o marca del producto.
                                    </Form.Text>
                                </Form.Group>
                            </div>

                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Categoría <span className="text-danger">*</span></Form.Label>
                                    <Form.Select
                                        required
                                        value={category}
                                        onChange={(e) => {
                                            if (e.target.value === 'suggest_new_category_action') {
                                                setShowSuggestModal(true);
                                                setCategory('');
                                            } else {
                                                setCategory(e.target.value);
                                            }
                                        }}
                                    >
                                        <option value="">Selecciona una categoría...</option>

                                        {/* Global Approved Categories */}
                                        {categories.length > 0 && (
                                            <optgroup label="Categorías Globales">
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </optgroup>
                                        )}

                                        {/* Store Pending Suggestions */}
                                        {suggestions.filter(s => s.status === 'PENDING').length > 0 && (
                                            <optgroup label="Tus Sugerencias (Pendientes)">
                                                {suggestions.filter(s => s.status === 'PENDING').map(s => (
                                                    <option key={'sug-' + s.id} value={s.name}>{s.name}</option>
                                                ))}
                                            </optgroup>
                                        )}

                                        <option value="Otros">Otros</option>
                                        <optgroup label="Opciones">
                                            <option value="suggest_new_category_action" className="fw-bold text-primary">+ Sugerir Categoría Nueva</option>
                                        </optgroup>
                                    </Form.Select>
                                </Form.Group>
                            </div>

                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label className="d-flex justify-content-between">
                                        SKU (Código Interno) <span className="text-danger">*</span>
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
                                    <Form.Text className="text-muted">Generado automáticamente por el sistema.</Form.Text>
                                </Form.Group>
                            </div>

                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label className="d-flex align-items-center gap-2">
                                        <FaBarcode className="text-secondary" /> Código de Barras
                                        <small className="text-muted fw-normal">(EAN-13, UPC — Opcional)</small>
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        placeholder="Escanear o ingresar código del fabricante"
                                    />
                                    <Form.Text className="text-muted">Se usa para búsqueda rápida en el POS con lector de barras.</Form.Text>
                                </Form.Group>
                            </div>

                            {/* Inventory & Pricing */}
                            <div className="col-12 mt-4">
                                <h6 className="text-primary fw-bold mb-3">Precios e Inventario</h6>
                            </div>

                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Costo de Adquisición ($) <small className="text-muted">(Privado)</small></Form.Label>
                                    <Form.Control type="number" onFocus={(e) => e.target.select()} step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} min="0" placeholder="0.00" />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Precio de Venta ($) <span className="text-danger">*</span></Form.Label>
                                    <Form.Control type="number" onFocus={(e) => e.target.select()} step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} min="0" placeholder="0.00" />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Ganancia Estimada (%)</Form.Label>
                                    <div className="d-flex align-items-center h-100 pb-1">
                                        <Badge bg={(price - costPrice) > 0 ? "success" : "secondary"} className="p-2 w-100 fs-6 shadow-sm">
                                            ${(price - costPrice || 0).toFixed(2)}
                                            <small className="ms-2 opacity-75">
                                                ({costPrice > 0 ? (((price - costPrice) / costPrice) * 100).toFixed(1) : (price > 0 ? "100.0" : "0.0")}%)
                                            </small>
                                        </Badge>
                                    </div>
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Stock Inicial</Form.Label>
                                    <Form.Control type="number" onFocus={(e) => e.target.select()} required value={stock} onChange={(e) => setStock(e.target.value)} min="0" placeholder="Cantidad actual" />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label>Stock Mínimo (Alerta)</Form.Label>
                                    <Form.Control type="number" onFocus={(e) => e.target.select()} required value={minStock} onChange={(e) => setMinStock(e.target.value)} min="0" placeholder="Ej: 5" />
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

            {/* Suggest Category Modal */}
            <Modal scrollable show={showSuggestModal} onHide={() => setShowSuggestModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold text-dark"><FaBoxOpen className="me-2" />Sugerir Categoría</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Alert variant="info" className="small d-flex gap-2">
                        <FaExclamationTriangle className="flex-shrink-0 mt-1" />
                        <div>Esta categoría será sugerida a nivel global. Podrás usarla localmente de inmediato mientras se procesa su inclusión en el catálogo general.</div>
                    </Alert>
                    <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">Nombre de la Categoría</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Ej: Mascotas, Herramientas, Suplementos"
                            value={suggestedCategoryName}
                            onChange={(e) => setSuggestedCategoryName(e.target.value)}
                            autoFocus
                        />
                    </Form.Group>
                    <Button
                        variant="primary"
                        className="w-100 py-2 fw-bold"
                        disabled={isSuggesting || !suggestedCategoryName.trim()}
                        onClick={() => {
                            const newName = suggestedCategoryName.trim();
                            if (!newName) return;
                            setIsSuggesting(true);
                            CategorySuggestionService.suggest(newName).then((res) => {
                                setCategory(newName);
                                if (!categories.some(c => c.name.toLowerCase() === newName.toLowerCase())) {
                                    setCategories([...categories, { id: 'sug-' + Date.now(), name: newName }]);
                                }
                                toast.showSuccess("✅ Sugerencia enviada a revisión. ¡Gracias!");
                                setShowSuggestModal(false);
                            }).catch(err => {
                                toast.showError(err.translatedMessage || "Hubo un error al guardar la sugerencia.");
                            }).finally(() => {
                                setIsSuggesting(false);
                            });
                        }}
                    >
                        {isSuggesting ? 'Guardando...' : 'Sugerir y Seleccionar'}
                    </Button>
                </Modal.Body>
            </Modal>
            {/* Import Wizard */}
            <InventoryImportWizard 
                show={showImportWizard} 
                onHide={() => { setShowImportWizard(false); loadProducts(); }} 
            />

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Body className="text-center p-5">
                    <div className="mb-4">
                        <div className="rounded-circle bg-danger bg-opacity-10 d-inline-flex p-4">
                            <FaTrash size={40} className="text-danger" />
                        </div>
                    </div>
                    <h4 className="fw-bold mb-3">¿Eliminar Producto?</h4>
                    <p className="text-secondary mb-4">
                        Estás a punto de eliminar el producto <strong>{productToDelete?.name}</strong> de forma permanente.
                        Esta acción no se puede deshacer.
                    </p>
                    <div className="d-flex justify-content-center gap-3">
                        <Button variant="outline-secondary" className="px-4 rounded-pill fw-bold" onClick={() => setShowDeleteModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="danger" className="px-4 rounded-pill fw-bold" onClick={handleDelete}>
                            Sí, Eliminar Producto
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Product History Modal */}
            <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} centered size="lg">
                <Modal.Header closeButton className="border-0 bg-light">
                    <Modal.Title className="fw-bold text-dark d-flex align-items-center gap-2">
                        <FaChartLine className="text-primary" />
                        Historial: {selectedHistoryProduct?.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {historyLoading ? (
                        <div className="d-flex justify-content-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : (
                        <>
                            <div className="d-flex flex-wrap gap-3 mb-4">
                                <div className="p-3 bg-light rounded-4 flex-grow-1 border">
                                    <small className="text-muted text-uppercase fw-bold">Costo Promedio (Último)</small>
                                    <h4 className="fw-bold mb-0 text-dark">${selectedHistoryProduct?.costPrice || 0}</h4>
                                </div>
                                <div className="p-3 bg-light rounded-4 flex-grow-1 border">
                                    <small className="text-muted text-uppercase fw-bold">Precio Actual</small>
                                    <h4 className="fw-bold mb-0 text-primary">${selectedHistoryProduct?.price || 0}</h4>
                                </div>
                                <div className="p-3 bg-light rounded-4 flex-grow-1 border">
                                    <small className="text-muted text-uppercase fw-bold">Stock</small>
                                    <h4 className="fw-bold mb-0 text-dark">{selectedHistoryProduct?.stock || 0}</h4>
                                </div>
                            </div>
                            
                            <h6 className="fw-bold mb-3 text-secondary text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>Historial de Margen de Ganancia</h6>
                            {(() => {
                                if (historyData.length === 0) {
                                    return (
                                        <div className="text-center py-5 opacity-50">
                                            <FaChartLine size={40} className="mb-2 text-secondary" />
                                            <p className="small mb-0 text-secondary fw-bold">No hay datos históricos registrados.</p>
                                        </div>
                                    );
                                }

                                const svgW = 560, svgH = 260;
                                const padL = 55, padR = 20, padT = 25, padB = 45;
                                const chartW = svgW - padL - padR;
                                const chartH = svgH - padT - padB;

                                const allValues = historyData.flatMap(d => [d.avgPrice, d.avgCost]);
                                const maxVal = Math.max(...allValues, 1) * 1.15;
                                const minVal = 0;

                                const xStep = historyData.length > 1 ? chartW / (historyData.length - 1) : chartW;
                                const toX = (i) => padL + (historyData.length > 1 ? i * xStep : chartW / 2);
                                const toY = (v) => padT + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

                                // Build smooth line paths (monotone cubic interpolation)
                                const buildPath = (points) => {
                                    if (points.length < 2) return `M ${points[0][0]} ${points[0][1]}`;
                                    let d = `M ${points[0][0]} ${points[0][1]}`;
                                    for (let i = 0; i < points.length - 1; i++) {
                                        const cx = (points[i][0] + points[i + 1][0]) / 2;
                                        d += ` C ${cx} ${points[i][1]}, ${cx} ${points[i + 1][1]}, ${points[i + 1][0]} ${points[i + 1][1]}`;
                                    }
                                    return d;
                                };

                                const pricePoints = historyData.map((d, i) => [toX(i), toY(d.avgPrice)]);
                                const costPoints = historyData.map((d, i) => [toX(i), toY(d.avgCost)]);
                                const pricePath = buildPath(pricePoints);
                                const costPath = buildPath(costPoints);

                                // Area fill under the price line
                                const priceAreaPath = pricePath + ` L ${pricePoints[pricePoints.length - 1][0]} ${padT + chartH} L ${pricePoints[0][0]} ${padT + chartH} Z`;

                                // Y-axis gridlines
                                const gridLines = 5;
                                const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => ({
                                    y: padT + (chartH / gridLines) * i,
                                    val: maxVal - (maxVal / gridLines) * i
                                }));

                                return (
                                    <div className="position-relative" style={{ overflowX: 'auto' }}>
                                        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxHeight: '280px' }} className="d-block">
                                            <defs>
                                                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                                                </linearGradient>
                                            </defs>

                                            {/* Gridlines + Y-axis labels */}
                                            {gridYs.map((g, i) => (
                                                <g key={i}>
                                                    <line x1={padL} y1={g.y} x2={svgW - padR} y2={g.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={i === gridLines ? "0" : "4 3"} />
                                                    <text x={padL - 8} y={g.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
                                                        ${Math.round(g.val)}
                                                    </text>
                                                </g>
                                            ))}

                                            {/* X-axis labels */}
                                            {historyData.map((d, i) => (
                                                <text key={i} x={toX(i)} y={svgH - 8} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">
                                                    {d.label}
                                                </text>
                                            ))}

                                            {/* Filled area under price line */}
                                            <path d={priceAreaPath} fill="url(#priceGrad)" />

                                            {/* Price line (green) */}
                                            <path d={pricePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

                                            {/* Cost line (red) */}
                                            <path d={costPath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3" />

                                            {/* Data points + hover targets */}
                                            {historyData.map((d, i) => (
                                                <g key={`pts-${i}`}>
                                                    {/* Price dot */}
                                                    <OverlayTrigger placement="top" overlay={<Tooltip><strong>Precio Venta</strong><br/>${Number(d.avgPrice).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</Tooltip>}>
                                                        <circle cx={toX(i)} cy={toY(d.avgPrice)} r="5" fill="#10b981" stroke="#fff" strokeWidth="2" style={{ cursor: 'pointer' }} />
                                                    </OverlayTrigger>
                                                    {/* Cost dot */}
                                                    <OverlayTrigger placement="top" overlay={<Tooltip><strong>Costo Prom.</strong><br/>${Number(d.avgCost).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</Tooltip>}>
                                                        <circle cx={toX(i)} cy={toY(d.avgCost)} r="5" fill="#ef4444" stroke="#fff" strokeWidth="2" style={{ cursor: 'pointer' }} />
                                                    </OverlayTrigger>
                                                    {/* Margin label between the two dots */}
                                                    {d.avgPrice > 0 && d.avgCost > 0 && (
                                                        <text
                                                            x={toX(i)}
                                                            y={(toY(d.avgPrice) + toY(d.avgCost)) / 2}
                                                            textAnchor="middle"
                                                            fontSize="9"
                                                            fill={((d.avgPrice - d.avgCost) / d.avgPrice * 100) < 15 ? '#ef4444' : '#10b981'}
                                                            fontWeight="700"
                                                        >
                                                            {Math.round((d.avgPrice - d.avgCost) / d.avgPrice * 100)}%
                                                        </text>
                                                    )}
                                                </g>
                                            ))}
                                        </svg>
                                    </div>
                                );
                            })()}
                            
                            <div className="d-flex justify-content-center gap-4 mt-3 pt-3 border-top">
                                <div className="d-flex align-items-center gap-2">
                                    <div style={{ width: 20, height: 3, background: '#ef4444', borderRadius: 2 }}></div>
                                    <span className="text-muted fw-bold small">Costo Promedio</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <div style={{ width: 20, height: 3, background: '#10b981', borderRadius: 2 }}></div>
                                    <span className="text-muted fw-bold small">Precio de Venta</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="text-success fw-bold small">%</span>
                                    <span className="text-muted fw-bold small">Margen</span>
                                </div>
                            </div>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="light" size="sm" className="rounded-pill px-3" onClick={() => setShowHistoryModal(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>
        </Layout>
    );
};

export default InventoryPage;
