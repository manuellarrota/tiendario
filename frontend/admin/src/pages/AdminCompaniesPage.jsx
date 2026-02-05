import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Dropdown, Alert } from 'react-bootstrap';
import { FaBuilding, FaUsers, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';

const AdminCompaniesPage = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updating, setUpdating] = useState(null);

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = () => {
        setLoading(true);
        AdminService.getAllCompanies().then(
            (response) => {
                setCompanies(response.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading companies", error);
                setError("No se pudieron cargar las empresas. Verifica tu conexión.");
                setLoading(false);
            }
        );
    };

    const handleStatusChange = (companyId, newStatus) => {
        setUpdating(companyId);
        AdminService.updateCompanySubscription(companyId, newStatus).then(
            () => {
                setCompanies(companies.map(c =>
                    c.id === companyId ? { ...c, subscriptionStatus: newStatus } : c
                ));
                setUpdating(null);
            },
            (error) => {
                console.error("Error updating company", error);
                alert("Error al actualizar el estado");
                setUpdating(null);
            }
        );
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
                        <FaBuilding className="me-3 text-primary" />
                        Gestión de Empresas (Tenants)
                    </h2>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">ID</th>
                                        <th>Nombre Empresa</th>
                                        <th>Plan Actual</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map((company) => (
                                        <tr key={company.id}>
                                            <td className="ps-4 fw-bold text-muted">#{company.id}</td>
                                            <td>
                                                <div className="fw-bold fs-5">{company.name}</div>
                                            </td>
                                            <td>
                                                <Badge
                                                    bg={company.subscriptionStatus === 'PAID' ? 'success' : 'secondary'}
                                                    className="px-3 py-2 rounded-pill"
                                                >
                                                    {company.subscriptionStatus}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Dropdown>
                                                    <Dropdown.Toggle variant="outline-primary" size="sm" className="rounded-pill" id={`dropdown-${company.id}`} disabled={updating === company.id}>
                                                        {updating === company.id ? <Spinner size="sm" animation="border" /> : <><FaEdit className="me-1" /> Cambiar Plan</>}
                                                    </Dropdown.Toggle>

                                                    <Dropdown.Menu>
                                                        <Dropdown.Item onClick={() => handleStatusChange(company.id, 'FREE')}>
                                                            <span className="text-secondary fw-bold">FREE</span> (Gratis)
                                                        </Dropdown.Item>
                                                        <Dropdown.Item onClick={() => handleStatusChange(company.id, 'PAID')}>
                                                            <span className="text-success fw-bold">PAID</span> (Premium)
                                                        </Dropdown.Item>
                                                        <Dropdown.Item onClick={() => handleStatusChange(company.id, 'PAST_DUE')}>
                                                            <span className="text-danger fw-bold">PAST_DUE</span> (Vencido)
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            {companies.length === 0 && (
                                <div className="text-center py-5">
                                    <p className="text-muted">No hay empresas registradas aún.</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Container>
            </div>
        </div>
    );
};

export default AdminCompaniesPage;
