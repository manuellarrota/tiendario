import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Card, Badge } from 'react-bootstrap';
import { FaPlus, FaUsers, FaEdit, FaTrash, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import CustomerService from '../services/customer.service';

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState(null);
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        filterCustomers();
    }, [customers, searchTerm]);

    const loadCustomers = () => {
        CustomerService.getAll().then(
            (res) => setCustomers(res.data),
            (err) => console.error('Error loading customers', err)
        );
    };

    const filterCustomers = () => {
        if (!searchTerm) {
            setFilteredCustomers(customers);
        } else {
            const filtered = customers.filter(c =>
                c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone?.includes(searchTerm)
            );
            setFilteredCustomers(filtered);
        }
    };

    const handleCreate = (e) => {
        e.preventDefault();
        const customerData = { name, email, phone, address };

        if (editMode) {
            CustomerService.update(currentCustomer.id, customerData).then(
                () => {
                    setMessage('✅ Cliente actualizado correctamente');
                    resetForm();
                    loadCustomers();
                    setTimeout(() => setMessage(''), 3000);
                },
                (error) => {
                    setMessage('❌ Error actualizando cliente');
                    setTimeout(() => setMessage(''), 3000);
                }
            );
        } else {
            CustomerService.create(customerData).then(
                () => {
                    setMessage('✅ Cliente creado correctamente');
                    resetForm();
                    loadCustomers();
                    setTimeout(() => setMessage(''), 3000);
                },
                (error) => {
                    const errorMsg = error.response?.data?.message || 'Error creando cliente';
                    setMessage('❌ ' + errorMsg);
                    setTimeout(() => setMessage(''), 3000);
                }
            );
        }
    };

    const handleEdit = (customer) => {
        setEditMode(true);
        setCurrentCustomer(customer);
        setName(customer.name);
        setEmail(customer.email || '');
        setPhone(customer.phone || '');
        setAddress(customer.address || '');
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
            CustomerService.delete(id).then(
                () => {
                    setMessage('✅ Cliente eliminado');
                    loadCustomers();
                    setTimeout(() => setMessage(''), 3000);
                },
                (error) => {
                    setMessage('❌ Error eliminando cliente');
                    setTimeout(() => setMessage(''), 3000);
                }
            );
        }
    };

    const resetForm = () => {
        setShowModal(false);
        setEditMode(false);
        setCurrentCustomer(null);
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
    };

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4 bg-light" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="fw-bold text-dark"><FaUsers className="me-2" />Clientes</h2>
                        <Button variant="primary" onClick={() => setShowModal(true)}>
                            <FaPlus className="me-2" /> Nuevo Cliente
                        </Button>
                    </div>

                    {message && (
                        <Alert variant={message.includes('✅') ? 'success' : 'danger'}>
                            {message}
                        </Alert>
                    )}

                    {/* Search Bar */}
                    <Card className="border-0 shadow-sm mb-3">
                        <Card.Body>
                            <Form.Control
                                type="text"
                                placeholder="🔍 Buscar por nombre, email o teléfono..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </Card.Body>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            {filteredCustomers.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <FaUsers size={50} className="mb-3 opacity-25" />
                                    <h4>Sin Clientes</h4>
                                    <p>Registra tus clientes para gestionar mejor tus ventas</p>
                                </div>
                            ) : (
                                <Table hover responsive>
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="border-0">Nombre</th>
                                            <th className="border-0">Email</th>
                                            <th className="border-0">Teléfono</th>
                                            <th className="border-0">Dirección</th>
                                            <th className="border-0 text-end">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCustomers.map((customer) => (
                                            <tr key={customer.id}>
                                                <td className="fw-bold">
                                                    <FaUsers className="me-2 text-primary" />
                                                    {customer.name}
                                                </td>
                                                <td>
                                                    {customer.email ? (
                                                        <>
                                                            <FaEnvelope className="me-2 text-muted" />
                                                            {customer.email}
                                                        </>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    {customer.phone ? (
                                                        <>
                                                            <FaPhone className="me-2 text-muted" />
                                                            {customer.phone}
                                                        </>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    {customer.address ? (
                                                        <>
                                                            <FaMapMarkerAlt className="me-2 text-muted" />
                                                            {customer.address}
                                                        </>
                                                    ) : '-'}
                                                </td>
                                                <td className="text-end">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => handleEdit(customer)}
                                                    >
                                                        <FaEdit />
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDelete(customer.id)}
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}

                            {filteredCustomers.length > 0 && (
                                <div className="mt-3 text-muted">
                                    <small>Total: {filteredCustomers.length} cliente(s)</small>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Container>

                {/* Create/Edit Customer Modal */}
                <Modal show={showModal} onHide={resetForm} centered>
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold text-dark">
                            <FaUsers className="me-2" />
                            {editMode ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                                    placeholder="Nombre completo del cliente"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="cliente@ejemplo.com"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Teléfono</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1 234 567 8900"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Dirección</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Dirección completa"
                                />
                            </Form.Group>
                            <Button variant="primary" type="submit" className="w-100 py-2">
                                <FaPlus className="me-2" />
                                {editMode ? 'Actualizar Cliente' : 'Crear Cliente'}
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default CustomersPage;
