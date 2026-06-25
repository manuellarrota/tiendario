import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Alert, OverlayTrigger, Tooltip, Form, Row, Col, Pagination } from 'react-bootstrap';
import { FaUsers, FaUserShield, FaStore, FaToggleOn, FaToggleOff, FaSearch, FaFilter } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import { useToast } from '../components/ToastContext';

const AdminUsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(null);
    
    // Filtros, búsqueda y paginado
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;
    
    const toast = useToast();

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

    useEffect(() => {
        loadUsers();
    }, []);

    const handleToggleUser = (userId) => {
        setProcessing(userId);
        AdminService.toggleUser(userId).then(
            () => {
                setUsers(users.map(u =>
                    u.id === userId ? { ...u, enabled: !u.enabled } : u
                ));
                toast.showSuccess("Estado del usuario actualizado exitosamente.");
            },
            (error) => {
                console.error("Error toggling user", error);
                toast.showError("Error al cambiar el estado del usuario. Intenta de nuevo.");
            }
        ).finally(() => setProcessing(null));
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'ROLE_ADMIN': return <Badge bg="dark"><FaUserShield className="me-1" /> Super Admin</Badge>;
            case 'ROLE_MANAGER': return <Badge bg="primary"><FaStore className="me-1" /> Gestor</Badge>;
            case 'ROLE_CLIENT': return <Badge bg="secondary">Cliente</Badge>;
            default: return <Badge bg="light" text="dark">{role}</Badge>;
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                    <Spinner animation="border" variant="primary" />
                </div>
            </Layout>
        );
    }

    const filteredUsers = users.filter(u => {
        if (filterRole !== 'ALL' && u.role !== filterRole) return false;
        if (filterStatus !== 'ALL') {
            const isEnabled = filterStatus === 'ACTIVE';
            if (u.enabled !== isEnabled) return false;
        }
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            return (u.username?.toLowerCase().includes(lowerSearch) || 
                    u.company?.name?.toLowerCase().includes(lowerSearch) ||
                    u.id.toString().includes(lowerSearch));
        }
        return true;
    });

    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const indexOfLast = currentPage * usersPerPage;
    const indexOfFirst = indexOfLast - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirst, Math.min(indexOfLast, filteredUsers.length));

    // Si la pagina actual se queda vacia por los filtros, regresamos a la pagina 1
    if (currentPage > 1 && currentUsers.length === 0 && filteredUsers.length > 0) {
        setCurrentPage(1);
    }

    return (
        <Layout>
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto' }}>
                <Container className="py-4">
                    <h2 className="mb-4 d-flex align-items-center">
                        <FaUsers className="me-3 text-primary" />
                        Gestión Global de Usuarios
                    </h2>

                    {error && <Alert variant="danger">{error}</Alert>}

                    {/* Filtros */}
                    <Card className="border-0 shadow-sm rounded-4 mb-4">
                        <Card.Body className="p-4">
                            <Row className="g-3">
                                <Col md={4}>
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Búsqueda</Form.Label>
                                    <div className="position-relative">
                                        <FaSearch className="position-absolute top-50 translate-middle-y text-muted ms-3" />
                                        <Form.Control
                                            type="text"
                                            placeholder="Buscar por usuario, empresa o ID..."
                                            className="rounded-3 border-light bg-light ps-5"
                                            value={searchTerm}
                                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                        />
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Rol</Form.Label>
                                    <Form.Select
                                        className="rounded-3 border-light bg-light"
                                        value={filterRole}
                                        onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
                                    >
                                        <option value="ALL">Todos los Roles</option>
                                        <option value="ROLE_ADMIN">Super Admin</option>
                                        <option value="ROLE_MANAGER">Gestor</option>
                                        <option value="ROLE_CLIENT">Cliente</option>
                                    </Form.Select>
                                </Col>
                                <Col md={4}>
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Estado</Form.Label>
                                    <Form.Select
                                        className="rounded-3 border-light bg-light"
                                        value={filterStatus}
                                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                                    >
                                        <option value="ALL">Cualquier Estado</option>
                                        <option value="ACTIVE">Activos</option>
                                        <option value="INACTIVE">Desactivados</option>
                                    </Form.Select>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

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
                                    {currentUsers.length > 0 ? currentUsers.map((u) => (
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
                                                    <OverlayTrigger overlay={<Tooltip>{u.enabled ? "Desactivar acceso al sistema" : "Activar acceso al sistema"}</Tooltip>}>
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
                                                    </OverlayTrigger>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-5">
                                                <p className="text-muted">No se encontraron usuarios.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-between align-items-center p-4 border-top bg-white">
                                    <small className="text-muted">Mostrando {indexOfFirst + 1} - {Math.min(indexOfLast, filteredUsers.length)} de {filteredUsers.length} usuarios</small>
                                    <Pagination className="mb-0" size="sm">
                                        <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                                        <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
                                        {[...Array(totalPages)].map((_, idx) => (
                                            <Pagination.Item key={idx + 1} active={idx + 1 === currentPage} onClick={() => setCurrentPage(idx + 1)}>
                                                {idx + 1}
                                            </Pagination.Item>
                                        ))}
                                        <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
                                        <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                                    </Pagination>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Container>
            </div>
        </Layout>
    );
};

export default AdminUsersPage;
