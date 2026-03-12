import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Form, Modal, Alert } from 'react-bootstrap';
import { FaBox, FaEdit, FaTrash, FaImage } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';

const AdminCatalogPage = () => {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);

    // Pagination and search
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const loadCatalog = () => {
        setLoading(true);
        AdminService.getAllCatalogProducts().then(
            (response) => {
                setCatalog(response.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading catalog", error);
                setError("No se pudo cargar el catálogo global.");
                setLoading(false);
            }
        );
    };

    useEffect(() => {
        loadCatalog();
        loadCategories();
    }, []);

    const loadCategories = () => {
        AdminService.getGlobalCategories().then(
            (response) => {
                setCategories(response.data);
            },
            (error) => console.error("Error loading global categories", error)
        );
    };

    const handleEdit = (item) => {
        setSelectedItem({ ...item });
        setShowEditModal(true);
    };

    const handleSave = () => {
        setSaving(true);
        AdminService.updateCatalogProduct(selectedItem.id, selectedItem).then(
            () => {
                setCatalog(catalog.map(c => c.id === selectedItem.id ? selectedItem : c));
                setShowEditModal(false);
                setSaving(false);
            },
            (error) => {
                alert("❌ Error al actualizar el registro global.");
                setSaving(false);
            }
        );
    };

    const handleDelete = (id) => {
        if (window.confirm("¿Seguro que quieres eliminar este producto del catálogo global? Esto no borrará los productos de las tiendas pero romperá la unificación.")) {
            AdminService.deleteCatalogProduct(id).then(
                () => {
                    setCatalog(catalog.filter(c => c.id !== id));
                },
                (error) => {
                    alert("❌ No se pudo eliminar el registro del catálogo.");
                }
            );
        }
    };

    if (loading) {
        return (
            <div className="d-flex" style={{ height: '100vh' }}>
                <Sidebar />
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                    <Spinner animation="border" variant="primary" />
                </div>
            </div>
        );
    }

    const filteredCatalog = catalog.filter(item =>
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category?.name && item.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredCatalog.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCatalog = filteredCatalog.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="d-flex admin-content-area overflow-hidden">
            <Sidebar />
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto' }}>
                <Container className="py-4">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                        <h2 className="mb-0 d-flex align-items-center">
                            <FaBox className="me-3 text-primary" />
                            Catálogo Global Maestro
                        </h2>
                        <div style={{ width: '100%', maxWidth: '350px' }}>
                            <Form.Control
                                type="text"
                                placeholder="Buscar pos nombre, SKU o categoría..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="rounded-pill shadow-sm bg-white"
                            />
                        </div>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">Imagen</th>
                                        <th>SKU (Huella)</th>
                                        <th>Nombre Global</th>
                                        <th>Categoría</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCatalog.map((item) => (
                                        <tr key={item.id}>
                                            <td className="ps-4">
                                                {item.imageUrl ?
                                                    <img src={item.imageUrl} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover' }} className="rounded shadow-sm" />
                                                    : <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><FaImage className="text-muted" /></div>
                                                }
                                            </td>
                                            <td><code className="fw-bold text-primary">{item.sku}</code></td>
                                            <td><div className="fw-bold">{item.name}</div></td>
                                            <td>{item.category?.name || <span className="text-muted">Sin categoría</span>}</td>
                                            <td>
                                                <Button variant="outline-primary" size="sm" className="rounded-pill me-2" onClick={() => handleEdit(item)}>
                                                    <FaEdit /> Editar
                                                </Button>
                                                <Button variant="outline-danger" size="sm" className="rounded-pill" onClick={() => handleDelete(item.id)}>
                                                    <FaTrash />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            {filteredCatalog.length > 0 && (
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 border-top gap-3">
                                    <small className="text-muted">Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredCatalog.length)} de {filteredCatalog.length} productos</small>
                                    <div className="d-flex gap-2">
                                        <Button variant="outline-primary" size="sm" className="rounded-pill px-3" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
                                        <div className="d-flex align-items-center px-3 bg-light rounded-pill fw-bold text-primary">{currentPage} de {totalPages || 1}</div>
                                        <Button variant="outline-primary" size="sm" className="rounded-pill px-3" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</Button>
                                    </div>
                                </div>
                            )}
                            {filteredCatalog.length === 0 && (
                                <div className="text-center py-5">
                                    <p className="text-muted mb-0">No se encontraron productos que coincidan con tu búsqueda.</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Container>
            </div>

            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton className="border-0 shadow-sm">
                    <Modal.Title className="fw-bold">Editar Registro Maestro</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {selectedItem && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Nombre Global</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={selectedItem.name}
                                    onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })}
                                    className="rounded-3"
                                />
                                <Form.Text className="text-muted small">Este nombre aparecerá en todas las tiendas del Marketplace.</Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Descripción Maestra</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={selectedItem.description}
                                    onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })}
                                    className="rounded-3"
                                />
                            </Form.Group>

                             <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">URL de Imagen Premium</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={selectedItem.imageUrl}
                                    onChange={(e) => setSelectedItem({ ...selectedItem, imageUrl: e.target.value })}
                                    className="rounded-3"
                                />
                                <Form.Text className="text-muted small">Asegúrate de que sea una imagen de alta calidad.</Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Categoría Global</Form.Label>
                                <Form.Select
                                    value={selectedItem.category?.name || ""}
                                    onChange={(e) => {
                                        const catName = e.target.value;
                                        setSelectedItem({ 
                                            ...selectedItem, 
                                            category: catName ? { name: catName } : null 
                                        });
                                    }}
                                    className="rounded-3"
                                >
                                    <option value="">Sin Categoría</option>
                                    {categories.map((cat, idx) => (
                                        <option key={idx} value={cat}>{cat}</option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted small">Vincular este producto a una categoría maestra para mejor organización.</Form.Text>
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="light" onClick={() => setShowEditModal(false)} className="rounded-pill px-4">Cancelar</Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving} className="rounded-pill px-4 shadow">
                        {saving ? <Spinner size="sm" animation="border" /> : 'Guardar Cambios Globales'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AdminCatalogPage;
