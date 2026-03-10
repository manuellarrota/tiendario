import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { FaTags, FaCheckCircle, FaTimesCircle, FaRandom } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import CategorySuggestionService from '../services/category-suggestion.service';
import CategoryService from '../services/category.service';

const AdminCategorySuggestionsPage = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [targetCategoryId, setTargetCategoryId] = useState('');
    const [processing, setProcessing] = useState(null);

    const loadData = () => {
        setLoading(true);
        Promise.all([
            CategorySuggestionService.getAll(),
            CategoryService.getAll()
        ]).then(
            ([suggestionsRes, categoriesRes]) => {
                setSuggestions(suggestionsRes.data.sort((a, b) => b.id - a.id));
                setCategories(categoriesRes.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading data", error);
                setError("No se pudieron cargar las sugerencias de categorías.");
                setLoading(false);
            }
        );
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleApprove = (id) => {
        if (window.confirm("¿Aprobar esta categoría globalmente?")) {
            setProcessing(id);
            CategorySuggestionService.approve(id).then(
                () => {
                    setMessage("✅ Sugerencia aprobada. Nueva categoría creada.");
                    loadData();
                    setProcessing(null);
                    setTimeout(() => setMessage(''), 3000);
                },
                (error) => {
                    alert("❌ Error al aprobar.");
                    setProcessing(null);
                }
            );
        }
    };

    const handleReject = (id) => {
        if (window.confirm("¿Rechazar esta sugerencia? Los productos de la tienda la seguirán teniendo pero no será global.")) {
            setProcessing(id);
            CategorySuggestionService.reject(id).then(
                () => {
                    setMessage("✅ Sugerencia rechazada.");
                    loadData();
                    setProcessing(null);
                    setTimeout(() => setMessage(''), 3000);
                },
                (error) => {
                    alert("❌ Error al rechazar.");
                    setProcessing(null);
                }
            );
        }
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
                alert("❌ Error al fusionar la sugerencia.");
                setProcessing(null);
            }
        );
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <Badge bg="success">Aprobada</Badge>;
            case 'REJECTED': return <Badge bg="danger">Rechazada</Badge>;
            default: return <Badge bg="warning" text="dark">Pendiente</Badge>;
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
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                        <h2 className="mb-0 d-flex align-items-center">
                            <FaTags className="me-3 text-primary" />
                            Sugerencias de Categorías
                        </h2>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {message && <Alert variant={message.includes('✅') ? 'success' : 'danger'}>{message}</Alert>}

                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                        <Card.Body className="p-0">
                            {suggestions.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <FaTags size={40} className="mb-3 opacity-50" />
                                    <h5>No hay sugerencias de categorías reportadas.</h5>
                                </div>
                            ) : (
                                <Table hover responsive className="mb-0 align-middle">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4">ID</th>
                                            <th>Categoría Sugerida</th>
                                            <th>ID Tienda Solicitante</th>
                                            <th>Estado</th>
                                            <th className="text-end pe-4">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {suggestions.map((s) => (
                                            <tr key={s.id}>
                                                <td className="ps-4 text-muted small">#{s.id}</td>
                                                <td>
                                                    <div className="fw-bold">{s.name}</div>
                                                </td>
                                                <td>Tienda ID: {s.storeId}</td>
                                                <td>{getStatusBadge(s.status)}</td>
                                                <td className="text-end pe-4">
                                                    {s.status === 'PENDING' && (
                                                        <div className="d-flex gap-2 justify-content-end">
                                                            <Button
                                                                variant="success"
                                                                size="sm"
                                                                className="rounded-pill d-flex align-items-center"
                                                                onClick={() => handleApprove(s.id)}
                                                                disabled={processing === s.id}
                                                            >
                                                                {processing === s.id ? <Spinner size="sm" animation="border" /> : <><FaCheckCircle className="me-1" /> Aprobar</>}
                                                            </Button>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="rounded-pill d-flex align-items-center"
                                                                onClick={() => openMergeModal(s)}
                                                                disabled={processing === s.id}
                                                            >
                                                                <FaRandom className="me-1" /> Fusionar
                                                            </Button>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                className="rounded-pill d-flex align-items-center"
                                                                onClick={() => handleReject(s.id)}
                                                                disabled={processing === s.id}
                                                            >
                                                                <FaTimesCircle className="me-1" /> Rechazar
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

                    <h4 className="fw-bold mb-4 mt-5"><FaTags className="me-2" />Categorías Aprobadas (Globales)</h4>
                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">Nombre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((c) => (
                                        <tr key={c.id}>
                                            <td className="ps-4 fw-bold text-primary">{c.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Container>

                {/* Merge Modal */}
                <Modal show={showMergeModal} onHide={() => setShowMergeModal(false)} centered>
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold">Fusionar Categoría</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Alert variant="warning" className="small">
                            El nombre sugerido <b>"{selectedSuggestion?.name}"</b> será reemplazado por la categoría global elegida.
                            Todos los productos de la tienda que lo usan serán reasignados.
                        </Alert>
                        <Form.Group>
                            <Form.Label>Selecciona la categoría global de destino</Form.Label>
                            <Form.Select
                                value={targetCategoryId}
                                onChange={(e) => setTargetCategoryId(e.target.value)}
                            >
                                <option value="">Selecciona...</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Button
                            variant="primary"
                            className="w-100 mt-4 fw-bold"
                            onClick={handleMerge}
                            disabled={!targetCategoryId || processing === selectedSuggestion?.id}
                        >
                            Confirmar Fusión
                        </Button>
                    </Modal.Body>
                </Modal>

            </div>
        </div>
    );
};

export default AdminCategorySuggestionsPage;
