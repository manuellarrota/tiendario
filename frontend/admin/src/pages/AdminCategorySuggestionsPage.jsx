import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Alert, Modal, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { FaTags, FaCheck, FaTimes, FaRandom, FaInfoCircle, FaStore, FaLayerGroup, FaPlus, FaTrash, FaSearch, FaEdit } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Layout from '../components/Layout';
import CategorySuggestionService from '../services/category-suggestion.service';
import CategoryService from '../services/category.service';
import { useToast } from '../components/ToastContext';

const AdminCategorySuggestionsPage = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    
    // Suggestion Modals
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [targetCategoryId, setTargetCategoryId] = useState('');
    
    // Direct Category Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [newCatName, setNewCatName] = useState('');
    const [newCatDesc, setNewCatDesc] = useState('');
    const [editingCat, setEditingCat] = useState(null);
    
    const [processing, setProcessing] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const toast = useToast();

    const loadData = () => {
        setLoading(true);
        Promise.all([
            CategorySuggestionService.getAll(),
            CategoryService.getAll()
        ]).then(
            ([suggestionsRes, categoriesRes]) => {
                setSuggestions(suggestionsRes.data.sort((a, b) => b.id - a.id));
                setCategories(categoriesRes.data.sort((a, b) => a.name.localeCompare(b.name)));
                setLoading(false);
            },
            (error) => {
                console.error("Error loading data", error);
                setError("No se pudieron cargar los datos de categorías.");
                setLoading(false);
            }
        );
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- Suggestion Handlers ---
    const handleApprove = (id) => {
        setProcessing(id);
        CategorySuggestionService.approve(id).then(
            () => {
                setMessage("✅ Sugerencia aprobada. Nueva categoría creada.");
                loadData();
                setProcessing(null);
                setTimeout(() => setMessage(''), 3000);
            },
            (error) => {
                toast.showError("Error al aprobar.");
                setProcessing(null);
            }
        );
    };

    const handleReject = (id) => {
        setProcessing(id);
        CategorySuggestionService.reject(id).then(
            () => {
                setMessage("✅ Sugerencia rechazada.");
                loadData();
                setProcessing(null);
                setTimeout(() => setMessage(''), 3000);
            },
            (error) => {
                toast.showError("Error al rechazar.");
                setProcessing(null);
            }
        );
    };

    const openMergeModal = (suggestion) => {
        setSelectedSuggestion(suggestion);
        setShowMergeModal(true);
        setTargetCategoryId('');
    };

    const handleMerge = () => {
        if (!targetCategoryId) return;
        setProcessing(selectedSuggestion.id);
        CategorySuggestionService.merge(selectedSuggestion.id, targetCategoryId).then(
            () => {
                setMessage("✅ Sugerencia fusionada correctamente.");
                setShowMergeModal(false);
                loadData();
                setProcessing(null);
                setTimeout(() => setMessage(''), 3000);
            },
            (error) => {
                toast.showError("Error al fusionar la sugerencia.");
                setProcessing(null);
            }
        );
    };

    // --- Direct Management Handlers ---
    const handleCreateDirect = (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        
        setProcessing('create');
        CategoryService.create({ name: newCatName.trim(), description: newCatDesc.trim() }).then(
            () => {
                setMessage("✅ Categoría global creada correctamente.");
                setShowCreateModal(false);
                setNewCatName('');
                setNewCatDesc('');
                loadData();
                setProcessing(null);
                setTimeout(() => setMessage(''), 3000);
            },
            (error) => {
                toast.showError("Error al crear la categoría. Probablemente ya existe.");
                setProcessing(null);
            }
        );
    };

    const handleEditDirect = (e) => {
        e.preventDefault();
        if (!editingCat || !editingCat.name.trim()) return;

        setProcessing(editingCat.id);
        CategoryService.update(editingCat.id, editingCat).then(
            () => {
                setMessage("✅ Categoría actualizada correctamente.");
                setShowEditModal(false);
                setEditingCat(null);
                loadData();
                setProcessing(null);
                setTimeout(() => setMessage(''), 3000);
            },
            (error) => {
                toast.showError("Error al actualizar la categoría.");
                setProcessing(null);
            }
        );
    };

    const confirmDeleteDirect = (cat) => {
        setCategoryToDelete(cat);
        setShowDeleteModal(true);
    };

    const handleDeleteDirect = () => {
        if (!categoryToDelete) return;
        const id = categoryToDelete.id;
        setProcessing(id);
        CategoryService.delete(id).then(
            () => {
                setMessage("✅ Categoría eliminada correctamente.");
                loadData();
                setProcessing(null);
                setShowDeleteModal(false);
                setCategoryToDelete(null);
                setTimeout(() => setMessage(''), 3000);
            },
            (error) => {
                toast.showError("No se pudo eliminar la categoría.");
                setProcessing(null);
                setShowDeleteModal(false);
                setCategoryToDelete(null);
            }
        );
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <Badge bg="success-soft" className="text-success rounded-pill px-3">Aprobada</Badge>;
            case 'REJECTED': return <Badge bg="danger-soft" className="text-danger rounded-pill px-3">Rechazada</Badge>;
            default: return <Badge bg="warning-soft" className="text-warning rounded-pill px-3">Pendiente</Badge>;
        }
    };

    const filteredCategories = categories.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Layout>
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                    <Spinner animation="border" variant="primary" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Container fluid className="py-4 px-md-5">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div>
                        <h2 className="fw-bold text-dark mb-1">
                            <FaTags className="text-primary me-2" /> Centro de Categorías Maestro
                        </h2>
                        <p className="text-muted small mb-0">
                            Gestiona el árbol de categorías global y modera las sugerencias de las tiendas.
                        </p>
                    </div>
                    <Button 
                        variant="primary" 
                        className="rounded-pill px-4 shadow-sm fw-bold"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <FaPlus className="me-2" /> Nueva Categoría Global
                    </Button>
                </div>

                {message && (
                    <Alert variant={message.includes('✅') ? 'success' : 'danger'} className="rounded-4 border-0 shadow-sm mb-4">
                        {message}
                    </Alert>
                )}

                {error && (
                    <Alert variant="danger" className="rounded-4 border-0 shadow-sm mb-4">
                        {error}
                    </Alert>
                )}

                <Row className="g-4">
                    <Col lg={7}>
                        <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                            <Card.Header className="bg-white border-0 py-3 px-4 fw-bold text-dark d-flex align-items-center">
                                <FaLayerGroup className="text-primary me-2" /> Moderación de Propuestas
                            </Card.Header>
                            <Card.Body className="p-0">
                                {suggestions.length === 0 ? (
                                    <div className="text-center py-5 text-muted bg-light-soft">
                                        <FaInfoCircle size={40} className="mb-3 opacity-25" />
                                        <p>No hay sugerencias pendientes de revisión.</p>
                                    </div>
                                ) : (
                                    <Table hover responsive className="mb-0 align-middle">
                                        <thead className="bg-light-soft text-muted smaller text-uppercase">
                                            <tr>
                                                <th className="ps-4 py-3">Sugerida</th>
                                                <th>Origen</th>
                                                <th>Estado</th>
                                                <th className="text-end pe-4">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {suggestions.map((s) => (
                                                <tr key={s.id} className="border-bottom-0">
                                                    <td className="ps-4 py-3">
                                                        <div className="fw-bold text-dark">{s.name}</div>
                                                        <div className="text-muted smaller">ID: #{s.id}</div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="bg-light p-1 rounded-circle"><FaStore size={10} className="text-muted" /></div>
                                                            <span className="small text-muted">Tienda: {s.storeId}</span>
                                                        </div>
                                                    </td>
                                                    <td>{getStatusBadge(s.status)}</td>
                                                    <td className="text-end pe-4">
                                                        {s.status === 'PENDING' && (
                                                            <div className="d-flex gap-2 justify-content-end">
                                                                <Button 
                                                                    variant="success" 
                                                                    size="sm" 
                                                                    className="rounded-pill px-3 fw-bold shadow-sm"
                                                                    onClick={() => handleApprove(s.id)}
                                                                    disabled={processing === s.id}
                                                                >
                                                                    {processing === s.id ? <Spinner size="sm" animation="border" /> : <FaCheck />}
                                                                </Button>
                                                                <Button 
                                                                    variant="outline-primary" 
                                                                    size="sm" 
                                                                    className="rounded-pill px-3 fw-bold"
                                                                    onClick={() => openMergeModal(s)}
                                                                    disabled={processing === s.id}
                                                                    title="Fusionar con existente"
                                                                >
                                                                    <FaRandom />
                                                                </Button>
                                                                <Button 
                                                                    variant="outline-danger" 
                                                                    size="sm" 
                                                                    className="rounded-pill px-3 fw-bold"
                                                                    onClick={() => handleReject(s.id)}
                                                                    disabled={processing === s.id}
                                                                >
                                                                    <FaTimes />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={5}>
                        <Card className="border-0 shadow-sm rounded-4 overflow-hidden sticky-top" style={{ top: '20px' }}>
                            <Card.Header className="bg-white border-0 py-3 px-4 fw-bold text-dark d-flex flex-column gap-3">
                                <div className="d-flex align-items-center">
                                    <FaTags className="text-primary me-2" /> Árbol Maestro ({categories.length})
                                </div>
                                <InputGroup size="sm" className="shadow-sm rounded-3 overflow-hidden">
                                    <InputGroup.Text className="bg-white border-end-0"><FaSearch className="text-muted" /></InputGroup.Text>
                                    <Form.Control 
                                        placeholder="Buscar categoría..." 
                                        className="border-start-0 ps-0"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                                    <Table hover className="mb-0 align-middle">
                                        <tbody className="border-top-0">
                                            {filteredCategories.map((c) => (
                                                <tr key={c.id}>
                                                    <td className="ps-4 py-3">
                                                        <div className="d-flex align-items-center justify-content-between">
                                                            <div className="small fw-semibold text-dark">
                                                                <span className="p-1 bg-primary rounded-circle me-2" style={{ display: 'inline-block', width: '6px', height: '6px' }}></span>
                                                                {c.name}
                                                            </div>
                                                            <div className="d-flex gap-2">
                                                                <Button 
                                                                    variant="link" 
                                                                    className="text-primary p-0" 
                                                                    size="sm"
                                                                    onClick={() => { setEditingCat({...c}); setShowEditModal(true); }}
                                                                    disabled={processing === c.id}
                                                                >
                                                                    <FaEdit size={12} />
                                                                </Button>
                                                                <Button 
                                                                    variant="link" 
                                                                    className="text-danger p-0" 
                                                                    size="sm"
                                                                    onClick={() => confirmDeleteDirect(c)}
                                                                    disabled={processing === c.id}
                                                                >
                                                                    {processing === c.id ? <Spinner size="sm" animation="border" /> : <FaTrash size={12} />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredCategories.length === 0 && (
                                                <tr>
                                                    <td className="text-center py-4 text-muted small">No se encontraron categorías.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* Merge Modal */}
            <Modal scrollable show={showMergeModal} onHide={() => setShowMergeModal(false)} centered className="border-0">
                <Modal.Header closeButton className="border-0 bg-light-soft">
                    <Modal.Title className="fw-bold h5 mt-2">Fusionar Categoría</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <div className="text-center mb-4">
                        <div className="bg-warning-soft text-warning p-3 rounded-circle d-inline-block mb-3">
                            <FaRandom size={30} />
                        </div>
                        <p className="text-muted small">
                            La propuesta <b>"{selectedSuggestion?.name}"</b> será reemplazada por una categoría ya existente.
                        </p>
                    </div>
                    
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold">Selecciona Categoría Destino</Form.Label>
                        <Form.Select
                            value={targetCategoryId}
                            onChange={(e) => setTargetCategoryId(e.target.value)}
                            className="rounded-3 shadow-sm border-light"
                        >
                            <option value="">Buscar categoría...</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Button
                        variant="primary"
                        className="w-100 rounded-pill py-2 mt-3 fw-bold shadow-sm"
                        onClick={handleMerge}
                        disabled={!targetCategoryId || processing === selectedSuggestion?.id}
                    >
                        {processing === selectedSuggestion?.id ? <Spinner size="sm" animation="border" /> : "Confirmar Fusión"}
                    </Button>
                </Modal.Body>
            </Modal>

            {/* Create Category Modal */}
            <Modal scrollable show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Nueva Categoría Maestro</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form onSubmit={handleCreateDirect}>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Nombre de la Categoría</Form.Label>
                            <Form.Control 
                                type="text"
                                required
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                                placeholder="Ej: Lácteos, Electrónica..."
                                className="rounded-3"
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold">Descripción (Opcional)</Form.Label>
                            <Form.Control 
                                as="textarea"
                                rows={2}
                                value={newCatDesc}
                                onChange={(e) => setNewCatDesc(e.target.value)}
                                placeholder="Breve descripción global..."
                                className="rounded-3"
                            />
                        </Form.Group>
                        <Button 
                            variant="primary" 
                            type="submit" 
                            className="w-100 rounded-pill py-2 fw-bold"
                            disabled={processing === 'create'}
                        >
                            {processing === 'create' ? <Spinner size="sm" animation="border" /> : "Crear Categoría Global"}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Edit Category Modal */}
            <Modal scrollable show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Editar Categoría Maestro</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {editingCat && (
                        <Form onSubmit={handleEditDirect}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Nombre de la Categoría</Form.Label>
                                <Form.Control 
                                    type="text"
                                    required
                                    value={editingCat.name}
                                    onChange={(e) => setEditingCat({...editingCat, name: e.target.value})}
                                    className="rounded-3"
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold">Descripción (Opcional)</Form.Label>
                                <Form.Control 
                                    as="textarea"
                                    rows={2}
                                    value={editingCat.description || ''}
                                    onChange={(e) => setEditingCat({...editingCat, description: e.target.value})}
                                    className="rounded-3"
                                />
                            </Form.Group>
                            <Button 
                                variant="primary" 
                                type="submit" 
                                className="w-100 rounded-pill py-2 fw-bold"
                                disabled={processing === editingCat.id}
                            >
                                {processing === editingCat.id ? <Spinner size="sm" animation="border" /> : "Guardar Cambios"}
                            </Button>
                        </Form>
                    )}
                </Modal.Body>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Body className="text-center p-5">
                    <div className="mb-4">
                        <div className="rounded-circle bg-danger bg-opacity-10 d-inline-flex p-4">
                            <FaTrash size={40} className="text-danger" />
                        </div>
                    </div>
                    <h4 className="fw-bold mb-3">¿Eliminar Categoría?</h4>
                    <p className="text-secondary mb-4">
                        ¿Seguro que deseas eliminar la categoría <strong>"{categoryToDelete?.name}"</strong>? Esto afectará a todos los productos que la utilicen en las tiendas.
                    </p>
                    <div className="d-flex justify-content-center gap-3">
                        <Button variant="outline-secondary" className="px-4 rounded-pill fw-bold" onClick={() => setShowDeleteModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="danger" className="px-4 rounded-pill fw-bold" onClick={handleDeleteDirect} disabled={processing === categoryToDelete?.id}>
                            {processing === categoryToDelete?.id ? <Spinner size="sm" animation="border" /> : 'Sí, Eliminar'}
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            <style>{`
                .bg-success-soft { background-color: rgba(16, 185, 129, 0.1); }
                .bg-danger-soft { background-color: rgba(239, 68, 68, 0.1); }
                .bg-warning-soft { background-color: rgba(245, 158, 11, 0.1); }
                .bg-light-soft { background-color: rgba(0, 0, 0, 0.02); }
                .smaller { font-size: 0.75rem; }
            `}</style>
        </Layout>
    );
};

export default AdminCategorySuggestionsPage;
