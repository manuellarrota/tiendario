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

    useEffect(() => {
        loadCatalog();
    }, []);

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
                console.error("Error updating catalog item", error);
                alert("Error al actualizar el registro.");
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
                    console.error("Error deleting catalog item", error);
                    alert("No se pudo eliminar.");
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

    return (
        <div className="d-flex admin-content-area overflow-hidden">
            <Sidebar />
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto' }}>
                <Container className="py-4">
                    <h2 className="mb-4 d-flex align-items-center">
                        <FaBox className="me-3 text-primary" />
                        Catálogo Global Maestro
                    </h2>

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
                                    {catalog.map((item) => (
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
                            {catalog.length === 0 && (
                                <div className="text-center py-5">
                                    <p className="text-muted">El catálogo está vacío.</p>
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
