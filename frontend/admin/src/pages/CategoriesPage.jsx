import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Card, Badge } from 'react-bootstrap';
import { FaPlus, FaTags, FaTrash } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import CategoryService from '../services/category.service';

const CategoriesPage = () => {
    const [categories, setCategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = () => {
        CategoryService.getAll().then(
            (res) => setCategories(res.data),
            (err) => console.error('Error loading categories', err)
        );
    };

    const handleCreate = (e) => {
        e.preventDefault();
        CategoryService.create({ name, description }).then(
            () => {
                setMessage('✅ Categoría creada correctamente');
                setShowModal(false);
                loadCategories();
                setName('');
                setDescription('');
                setTimeout(() => setMessage(''), 3000);
            },
            (error) => {
                setMessage('❌ Error creando categoría');
                setTimeout(() => setMessage(''), 3000);
            }
        );
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
            CategoryService.delete(id).then(
                () => {
                    setMessage('✅ Categoría eliminada');
                    loadCategories();
                    setTimeout(() => setMessage(''), 3000);
                },
                (error) => {
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
                        <h2 className="fw-bold text-dark"><FaTags className="me-2" />Categorías de Productos</h2>
                        <Button variant="primary" onClick={() => setShowModal(true)}>
                            <FaPlus className="me-2" /> Nueva Categoría
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
                                    <h4>Sin Categorías</h4>
                                    <p>Crea categorías para organizar tus productos</p>
                                </div>
                            ) : (
                                <Table hover responsive>
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="border-0">Nombre</th>
                                            <th className="border-0">Descripción</th>
                                            <th className="border-0 text-end">Acciones</th>
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
                                                <td className="text-end">
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDelete(cat.id)}
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Container>

                {/* Create Category Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold text-dark">
                            <FaTags className="me-2" />Nueva Categoría
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleCreate}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre *</Form.Label>
                                <Form.Control
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Lácteos, Abarrotes, Bebidas"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Descripción</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descripción opcional de la categoría"
                                />
                            </Form.Group>
                            <Button variant="primary" type="submit" className="w-100 py-2">
                                <FaPlus className="me-2" />Crear Categoría
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default CategoriesPage;
