import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { FaUserPlus, FaUserTie, FaToggleOn, FaToggleOff, FaTrash } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import StaffService from '../services/staff.service';

const StaffPage = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState(null);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [formError, setFormError] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = () => {
        setLoading(true);
        StaffService.getStaff()
            .then(response => {
                setStaff(response.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError("Error al cargar empleados.");
                setLoading(false);
            });
    };

    const handleCreate = (e) => {
        e.preventDefault();
        setFormError('');
        
        if (!formData.username || !formData.email || !formData.password) {
            setFormError("Todos los campos son obligatorios.");
            return;
        }

        if (formData.password.length < 6) {
            setFormError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setCreating(true);
        StaffService.createStaff(formData.username, formData.email, formData.password)
            .then(response => {
                setStaff([...staff, response.data]);
                setShowModal(false);
                setFormData({ username: '', email: '', password: '' });
                setCreating(false);
            })
            .catch(err => {
                const msg = err.response?.data?.message || "Error al crear cajero.";
                if (msg.includes("Límite")) {
                    setFormError(
                        <div className="d-flex flex-column text-start">
                            <span className="fw-bold mb-2">⚠️ {msg}</span>
                            <span className="small text-dark">Para solicitar un aumento de límite, reporta tu pago (Transferencia/PagoMóvil) en la sección Configuración.</span>
                        </div>
                    );
                } else {
                    setFormError(msg);
                }
                setCreating(false);
            });
    };

    const handleToggleStatus = (id) => {
        setProcessing(id);
        StaffService.toggleStaffStatus(id)
            .then(response => {
                setStaff(staff.map(u => u.id === id ? response.data : u));
                setProcessing(null);
            })
            .catch(err => {
                console.error(err);
                alert("Error al actualizar el estado del cajero.");
                setProcessing(null);
            });
    };

    const confirmDelete = (staff) => {
        setStaffToDelete(staff);
        setShowDeleteModal(true);
    };

    const handleDelete = () => {
        if (!staffToDelete) return;
        const id = staffToDelete.id;
        
        setProcessing(id);
        StaffService.deleteStaff(id)
            .then(() => {
                setStaff(staff.filter(u => u.id !== id));
                setProcessing(null);
                setShowDeleteModal(false);
                setStaffToDelete(null);
            })
            .catch(err => {
                const msg = err.response?.data?.message || "Error al eliminar el cajero.";
                setError(msg);
                setProcessing(null);
                setShowDeleteModal(false);
                setStaffToDelete(null);
                // Reload staff to reflect the suspension
                loadStaff();
                setTimeout(() => setError(null), 8000);
            });
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
                    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
                        <h2 className="mb-0 d-flex align-items-center text-primary fw-bold">
                            <FaUserTie className="me-3" /> Mis Empleados (Cajeros)
                        </h2>
                        <Button variant="primary" className="rounded-pill px-4 py-2 mt-3 mt-md-0 shadow-sm" onClick={() => setShowModal(true)}>
                            <FaUserPlus className="me-2" /> Nuevo Cajero
                        </Button>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">Usuario</th>
                                        <th>Email</th>
                                        <th>Rol</th>
                                        <th>Estado</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staff.length > 0 ? staff.map(u => (
                                        <tr key={u.id}>
                                            <td className="ps-4 fw-bold">{u.username}</td>
                                            <td className="text-muted">{u.email}</td>
                                            <td><Badge bg="info">Cajero</Badge></td>
                                            <td>
                                                <Badge bg={u.enabled ? 'success' : 'danger'} className="rounded-pill px-3 py-2">
                                                    {u.enabled ? 'Activo' : 'Suspendido'}
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                <Button 
                                                    variant={u.enabled ? "outline-danger" : "outline-success"}
                                                    size="sm"
                                                    className="rounded-pill px-3 me-2"
                                                    onClick={() => handleToggleStatus(u.id)}
                                                    disabled={processing === u.id}
                                                >
                                                    {processing === u.id ? <Spinner size="sm" animation="border" /> : (
                                                        u.enabled ? <><FaToggleOff className="me-1"/> Suspender</> : <><FaToggleOn className="me-1"/> Reactivar</>
                                                    )}
                                                </Button>
                                                <Button 
                                                    variant="outline-danger"
                                                    size="sm"
                                                    className="rounded-pill px-3"
                                                    onClick={() => confirmDelete(u)}
                                                    disabled={processing === u.id}
                                                >
                                                    <FaTrash />
                                                </Button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-5 text-muted">
                                                No tienes empleados registrados. Haz clic en "Nuevo Cajero" para agregar uno.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Container>
            </div>

            <Modal scrollable show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">Crear Nuevo Cajero</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreate}>
                    <Modal.Body className="p-4">
                        {formError && <Alert variant="danger" className="small">{formError}</Alert>}
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Nombre de Usuario</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="Ej: cajero1" 
                                value={formData.username}
                                onChange={e => setFormData({...formData, username: e.target.value})}
                                required 
                            />
                            <Form.Text className="text-muted">Debe ser único en toda la plataforma.</Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Correo Electrónico</Form.Label>
                            <Form.Control 
                                type="email" 
                                placeholder="cajero1@mitienda.com" 
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                required 
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Contraseña</Form.Label>
                            <Form.Control 
                                type="password" 
                                placeholder="Mínimo 6 caracteres" 
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                                required 
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 bg-light">
                        <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button variant="primary" type="submit" className="rounded-pill px-4" disabled={creating}>
                            {creating ? <Spinner size="sm" animation="border" /> : 'Guardar Cajero'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Body className="text-center p-5">
                    <div className="mb-4">
                        <div className="rounded-circle bg-danger bg-opacity-10 d-inline-flex p-4">
                            <FaTrash size={40} className="text-danger" />
                        </div>
                    </div>
                    <h4 className="fw-bold mb-3">¿Eliminar Cajero?</h4>
                    <p className="text-secondary mb-4">
                        Estás a punto de eliminar a <strong>{staffToDelete?.username}</strong>. Si este cajero tiene ventas registradas, será suspendido en lugar de ser eliminado por motivos de auditoría.
                    </p>
                    <div className="d-flex justify-content-center gap-3">
                        <Button variant="outline-secondary" className="px-4 rounded-pill fw-bold" onClick={() => setShowDeleteModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="danger" className="px-4 rounded-pill fw-bold" onClick={handleDelete} disabled={processing === staffToDelete?.id}>
                            {processing === staffToDelete?.id ? <Spinner size="sm" animation="border" /> : 'Sí, Eliminar Cajero'}
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default StaffPage;
