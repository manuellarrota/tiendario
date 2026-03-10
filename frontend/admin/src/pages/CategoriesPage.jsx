import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Card, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaPlus, FaTags, FaTrash } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import CategoryService from '../services/category.service';
import CategorySuggestionService from '../services/category-suggestion.service';
import AuthService from '../services/auth.service';

const CategoriesPage = () => {
    const [categories, setCategories] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);

    const user = AuthService.getCurrentUser();
    const isSuperAdmin = user?.roles?.includes('ROLE_ADMIN');

    const loadData = () => {
        CategoryService.getAll().then(
            (res) => setCategories(res.data),
            (err) => console.error('Error loading categories', err)
        );

        // Store managers see their own suggestions
        if (!isSuperAdmin) {
            CategorySuggestionService.getAll().then(
                (res) => setSuggestions(res.data),
                (err) => console.error('Error loading suggestions', err)
            );
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = (e) => {
        e.preventDefault();
        setIsSuggesting(true);

        if (isSuperAdmin) {
            // Admins create global categories directly
            CategoryService.create({ name, description }).then(
                () => {
                    setMessage('✅ Categoría global creada correctamente.');
                    setShowModal(false);
                    loadData();
                    setName('');
                    setDescription('');
                    setIsSuggesting(false);
                    setTimeout(() => setMessage(''), 4000);
                },
                (error) => {
                    const msg = (error.response && error.response.data && error.response.data.message) || '❌ Error creando categoría';
                    setMessage(msg);
                    setIsSuggesting(false);
                }
            );
        } else {
            // Managers suggest categories
            CategorySuggestionService.suggest(name).then(
                () => {
                    setMessage('✅ Categoría sugerida correctamente. Estará pendiente de aprobación.');
                    setShowModal(false);
                    loadData();
                    setName('');
                    setDescription('');
                    setIsSuggesting(false);
                    setTimeout(() => setMessage(''), 4000);
                },
                (error) => {
                    const msg = (error.response && error.response.data && error.response.data.message) || '❌ Error sugiriendo categoría';
                    setMessage(msg);
                    setIsSuggesting(false);
                }
            );
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
            CategoryService.delete(id).then(
                () => {
                    setMessage('✅ Categoría eliminada');
                    loadData();
                    setTimeout(() => setMessage(''), 3000);
                },
                () => {
                    setMessage('❌ Error eliminando categoría');
                    setTimeout(() => setMessage(''), 3000);
                }
            );
        }
    };

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4 bg-light" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="fw-bold text-dark"><FaTags className="me-2" />Categorías Globales</h2>
                        <Button variant="primary" onClick={() => { setShowModal(true); setName(''); setDescription(''); }}>
                            <FaPlus className="me-2" /> {isSuperAdmin ? 'Nueva Categoría Global' : 'Sugerir Categoría Nueva'}
                        </Button>
                    </div>

                    {message && (
                        <Alert variant={message.includes('✅') ? 'success' : 'danger'}>
                            {message}
                        </Alert>
                    )}

                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            {categories.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <FaTags size={50} className="mb-3 opacity-25" />
                                    <h4>Sin Categorías Globales</h4>
                                    <p>{isSuperAdmin ? 'Crea categorías para organizar el catálogo global.' : 'No hay categorías globales aún. Puedes sugerir una nueva.'}</p>
                                </div>
                            ) : (
                                <Table hover responsive>
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="border-0">Nombre</th>
                                            <th className="border-0">Descripción</th>
                                            {isSuperAdmin && <th className="border-0 text-end">Acciones</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categories.map((cat) => (
                                            <tr key={cat.id}>
                                                <td className="fw-bold">
                                                    <Badge bg="primary" className="me-2">
                                                        <FaTags />
                                                    </Badge>
                                                    {cat.name}
                                                </td>
                                                <td className="text-muted">{cat.description || '-'}</td>
                                                {isSuperAdmin && (
                                                    <td className="text-end">
                                                        <OverlayTrigger overlay={<Tooltip>Eliminar Categoría</Tooltip>}>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleDelete(cat.id)}
                                                            >
                                                                <FaTrash />
                                                            </Button>
                                                        </OverlayTrigger>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Suggestions Section (For Store Managers only) */}
                    {!isSuperAdmin && suggestions.length > 0 && (
                        <div className="mt-5">
                            <h4 className="fw-bold text-dark mb-4"><FaTags className="me-2 text-warning" />Tus Sugerencias de Categorías</h4>
                            <Card className="border-0 shadow-sm">
                                <Card.Body>
                                    <Table hover responsive>
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="border-0">Nombre de Sugerencia</th>
                                                <th className="border-0 text-center">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {suggestions.map((s) => (
                                                <tr key={s.id}>
                                                    <td className="fw-bold">{s.name}</td>
                                                    <td className="text-center">
                                                        {s.status === 'PENDING' && <Badge bg="warning" text="dark">Pendiente</Badge>}
                                                        {s.status === 'APPROVED' && <Badge bg="success">Aprobada</Badge>}
                                                        {s.status === 'REJECTED' && <Badge bg="danger">Rechazada</Badge>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </div>
                    )}
                </Container>

                {/* Suggest Category Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold text-dark">
                            <FaTags className="me-2" />{isSuperAdmin ? 'Nueva Categoría Global' : 'Sugerir Categoría'}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {!isSuperAdmin && (
                            <Alert variant="info" className="small">
                                Esta categoría será sugerida a nivel global. Podrás usarla en tu inventario de inmediato mientras un administrador la procesa.
                            </Alert>
                        )}
                        <Form onSubmit={handleCreate}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre de la Categoría *</Form.Label>
                                <Form.Control
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Lácteos, Abarrotes, Bebidas"
                                />
                            </Form.Group>

                            {isSuperAdmin && (
                                <Form.Group className="mb-3">
                                    <Form.Label>Descripción (Opcional)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Descripción breve de la categoría"
                                    />
                                </Form.Group>
                            )}

                            <Button variant="primary" type="submit" className="w-100 py-2" disabled={isSuggesting}>
                                {isSuggesting ? (isSuperAdmin ? 'Creando...' : 'Enviando...') : (
                                    <>{isSuperAdmin ? <FaPlus className="me-2" /> : null}{isSuperAdmin ? 'Crear Categoría Global' : 'Enviar Sugerencia'}</>
                                )}
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default CategoriesPage;
