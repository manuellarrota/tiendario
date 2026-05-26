import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Dropdown, Alert, Form } from 'react-bootstrap';
import { FaBuilding, FaUsers, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import StoreLocationMap from '../components/StoreLocationMap';
import { Modal, Row, Col } from 'react-bootstrap';

const AdminCompaniesPage = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updating, setUpdating] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editPosition, setEditPosition] = useState(null);
    const [editPlan, setEditPlan] = useState('BASIC');
    const [editHasBilling, setEditHasBilling] = useState(false);
    const [editExtraRegisters, setEditExtraRegisters] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

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

    useEffect(() => {
        loadCompanies();
    }, []);

    const handleStatusChange = (companyId, newStatus) => {
        setUpdating(companyId);
        AdminService.updateCompanySubscription(companyId, { status: newStatus }).then(
            () => {
                setCompanies(companies.map(c =>
                    c.id === companyId ? { ...c, subscriptionStatus: newStatus } : c
                ));
                setUpdating(null);
            },
            (error) => {
                console.error("Error updating company", error);
                setError("Error al actualizar el estado de la suscripción.");
                setUpdating(null);
            }
        );
    };

    const handleEditClick = (company) => {
        setSelectedCompany(company);
        setEditName(company.name || '');
        setEditPhone(company.phoneNumber || '');
        setEditDescription(company.description || '');
        setEditAddress(company.address || '');
        setEditPosition({ lat: company.latitude, lng: company.longitude });
        setEditPlan(company.subscriptionPlan || 'BASIC');
        setEditHasBilling(company.hasElectronicBilling || false);
        setEditExtraRegisters(company.extraRegisters || 0);
        setShowEditModal(true);
    };

    const handleUpdateCompany = (e) => {
        e.preventDefault();
        setSaving(true);
        const data = {
            name: editName,
            phoneNumber: editPhone,
            description: editDescription,
            address: editAddress,
            latitude: editPosition?.lat || 0,
            longitude: editPosition?.lng || 0
        };

        AdminService.updateCompany(selectedCompany.id, data).then(
            () => {
                // Update subscription data as well
                const subData = {
                    plan: editPlan,
                    hasElectronicBilling: editHasBilling,
                    extraRegisters: editExtraRegisters
                };
                AdminService.updateCompanySubscription(selectedCompany.id, subData).then(
                    () => {
                        setCompanies(companies.map(c =>
                            c.id === selectedCompany.id ? { ...c, ...data, subscriptionPlan: editPlan, hasElectronicBilling: editHasBilling, extraRegisters: editExtraRegisters } : c
                        ));
                        setShowEditModal(false);
                        setSaveError('');
                        setSaving(false);
                    },
                    (error) => {
                        console.error("Error updating subscription details", error);
                        setSaveError('No se pudo actualizar el plan. Los datos básicos sí fueron guardados.');
                        setSaving(false);
                    }
                );
            },
            (error) => {
                console.error("Error updating company", error);
                alert("❌ Error al actualizar los datos de la empresa.");
                setSaving(false);
            }
        );
    };

    if (loading) {
        return (
            <Layout>
                <div className="d-flex align-items-center justify-content-center h-100">
                    <Spinner animation="border" variant="primary" />
                </div>
            </Layout>
        );
    }

    const filteredCompanies = companies.filter(company =>
        (company.name && company.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (company.id && company.id.toString().includes(searchTerm))
    );

    const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <Layout>
            <Container className="py-2">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <h2 className="mb-0 d-flex align-items-center">
                        <FaBuilding className="me-3 text-primary" />
                        Gestión de Empresas (Tiendas)
                    </h2>
                    <div style={{ width: '100%', maxWidth: '300px' }}>
                        <Form.Control
                            type="text"
                            placeholder="Buscar por ID o nombre..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="rounded-pill shadow-sm bg-white"
                        />
                    </div>
                </div>

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
                                {paginatedCompanies.map((company) => (
                                    <tr key={company.id}>
                                        <td className="ps-4 fw-bold text-muted">#{company.id}</td>
                                        <td>
                                            <div className="fw-bold fs-5">{company.name}</div>
                                        </td>
                                            <td>
                                                <Badge
                                                    bg={company.subscriptionStatus === 'PAID' ? 'success' : company.subscriptionStatus === 'TRIAL' ? 'warning' : 'secondary'}
                                                    className="px-3 py-2 rounded-pill mb-1"
                                                >
                                                    {company.subscriptionStatus === 'PAID' ? '💎 ' + (company.subscriptionPlan || 'PREMIUM') : 
                                                     company.subscriptionStatus === 'TRIAL' ? '⏱️ PRUEBA' : 
                                                     company.subscriptionStatus === 'PAST_DUE' ? '⚠️ VENCIDO' : company.subscriptionStatus}
                                                </Badge>
                                                {company.hasElectronicBilling && <Badge bg="info" className="ms-1 rounded-pill">Facturación ✅</Badge>}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <Button variant="outline-primary" size="sm" className="rounded-pill" onClick={() => handleEditClick(company)}>
                                                        <FaEdit className="me-1" /> Editar
                                                    </Button>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant="outline-secondary" size="sm" className="rounded-pill" id={`dropdown-${company.id}`} disabled={updating === company.id}>
                                                            {updating === company.id ? <Spinner size="sm" animation="border" /> : <><FaUsers className="me-1" /> Plan</>}
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item onClick={() => handleStatusChange(company.id, 'PAID')}>
                                                                <span className="text-success fw-bold">PREMIUM</span> (Pago activo)
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => handleStatusChange(company.id, 'TRIAL')}>
                                                                <span className="text-warning fw-bold">PRUEBA</span> (Onboarding)
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => handleStatusChange(company.id, 'PAST_DUE')}>
                                                                <span className="text-danger fw-bold">VENCIDO</span> (Bloqueado)
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        {filteredCompanies.length > 0 && (
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 border-top gap-3">
                                <small className="text-muted">Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredCompanies.length)} de {filteredCompanies.length} empresas</small>
                                <div className="d-flex gap-2">
                                    <Button variant="outline-primary" size="sm" className="rounded-pill px-3" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
                                    <div className="d-flex align-items-center px-3 bg-light rounded-pill fw-bold text-primary">{currentPage} de {totalPages || 1}</div>
                                    <Button variant="outline-primary" size="sm" className="rounded-pill px-3" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</Button>
                                </div>
                            </div>
                        )}
                        {filteredCompanies.length === 0 && (
                            <div className="text-center py-5">
                                <p className="text-muted mb-0">No se encontraron empresas que coincidan con tu búsqueda.</p>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>

            {/* Edit Company Modal */}
            <Modal scrollable show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Editar Datos de Tienda</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {saveError && (
                        <Alert variant="danger" className="rounded-3 small py-2 mb-3" onClose={() => setSaveError('')} dismissible>
                            {saveError}
                        </Alert>
                    )}
                    <Form onSubmit={handleUpdateCompany}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Nombre de la Empresa</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        required
                                        className="rounded-3"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Teléfono</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        className="rounded-3"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Plan</Form.Label>
                                    <Form.Select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} className="rounded-3">
                                        <option value="BASIC">Básico (1 Caja)</option>
                                        <option value="MEDIUM">Medium (3 Cajas)</option>
                                        <option value="PREMIUM">Premium (5 Cajas)</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Cajas Extra (+)</Form.Label>
                                    <Form.Control type="number" min="0" value={editExtraRegisters} onChange={(e) => setEditExtraRegisters(e.target.value)} className="rounded-3" />
                                </Form.Group>
                            </Col>
                            <Col md={4} className="d-flex align-items-end">
                                <Form.Group className="mb-2">
                                    <Form.Check 
                                        type="switch" 
                                        id="billing-switch" 
                                        label={<span className="small fw-bold ms-1">Facturación Elec.</span>}
                                        checked={editHasBilling} 
                                        onChange={(e) => setEditHasBilling(e.target.checked)} 
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Descripción</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="rounded-3"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Dirección Física</Form.Label>
                            <Form.Control
                                type="text"
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                required
                                className="rounded-3"
                            />
                        </Form.Group>

                        <div className="mb-3">
                            <Form.Label className="small fw-bold">Ubicación en el Mapa</Form.Label>
                            <StoreLocationMap 
                                address={editAddress} 
                                onLocationDetected={setEditPosition} 
                                height="250px"
                            />
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="light" className="rounded-pill px-4" onClick={() => setShowEditModal(false)}>
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit" className="rounded-pill px-4 fw-bold shadow-sm" disabled={saving}>
                                {saving ? <Spinner size="sm" animation="border" className="me-2" /> : <FaCheck className="me-2" />}
                                Guardar Cambios
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Layout>
    );
};

export default AdminCompaniesPage;
