import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Alert } from 'react-bootstrap';
import { FaUsers, FaUserShield, FaStore, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';

const AdminUsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        setLoading(true);
        AdminService.getAllUsers().then(
            (response) => {
                setUsers(response.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading users", error);
                setError("No se pudieron cargar los usuarios.");
                setLoading(false);
            }
        );
    };

    const handleToggleUser = (userId) => {
        setProcessing(userId);
        AdminService.toggleUser(userId).then(
            () => {
                setUsers(users.map(u =>
                    u.id === userId ? { ...u, enabled: !u.enabled } : u
                ));
                setProcessing(null);
            },
            (error) => {
                console.error("Error toggling user", error);
                alert("Error al cambiar el estado del usuario");
                setProcessing(null);
            }
        );
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'ROLE_ADMIN': return <Badge bg="dark"><FaUserShield className="me-1" /> Super Admin</Badge>;
            case 'ROLE_MANAGER': return <Badge bg="primary"><FaStore className="me-1" /> Manager</Badge>;
            case 'ROLE_CLIENT': return <Badge bg="secondary">Cliente</Badge>;
            default: return <Badge bg="light" text="dark">{role}</Badge>;
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
                        <FaUsers className="me-3 text-primary" />
                        Gestión Global de Usuarios
                    </h2>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">ID</th>
                                        <th>Usuario</th>
                                        <th>Rol</th>
                                        <th>Empresa Asociada</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map((u) => (
                                        <tr key={u.id}>
                                            <td className="ps-4 text-muted small">#{u.id}</td>
                                            <td>
                                                <div className="fw-bold">{u.username}</div>
                                            </td>
                                            <td>{getRoleBadge(u.role)}</td>
                                            <td>
                                                {u.company ? (
                                                    <div>
                                                        <span className="fw-bold">{u.company.name}</span>
                                                        <div className="small text-muted">ID: {u.company.id}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted italic">N/A</span>
                                                )}
                                            </td>
                                            <td>
                                                <Badge bg={u.enabled ? 'success' : 'danger'} className="rounded-pill">
                                                    {u.enabled ? 'Activo' : 'Desactivado'}
                                                </Badge>
                                            </td>
                                            <td>
                                                {u.role !== 'ROLE_ADMIN' && (
                                                    <Button
                                                        variant={u.enabled ? "outline-danger" : "outline-success"}
                                                        size="sm"
                                                        className="rounded-pill px-3"
                                                        onClick={() => handleToggleUser(u.id)}
                                                        disabled={processing === u.id}
                                                    >
                                                        {processing === u.id ? (
                                                            <Spinner size="sm" animation="border" />
                                                        ) : (
                                                            u.enabled ? <><FaToggleOn className="me-1" /> Desactivar</> : <><FaToggleOff className="me-1" /> Activar</>
                                                        )}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-5">
                                                <p className="text-muted">No hay usuarios registrados.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Container>
            </div>
        </div>
    );
};

export default AdminUsersPage;
