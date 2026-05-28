import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Dropdown, Alert, Form } from 'react-bootstrap';
import { FaBuilding, FaUsers, FaEdit, FaCheck, FaTimes, FaEye, FaInfoCircle, FaMapMarkerAlt, FaPhone, FaCalendarAlt, FaShoppingCart, FaMoneyBillWave, FaBox, FaCashRegister, FaChartLine } from 'react-icons/fa';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import StoreLocationMap from '../components/StoreLocationMap';
import { Modal, Row, Col } from 'react-bootstrap';
import { useToast } from '../components/ToastContext';

const AdminCompaniesPage = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updating, setUpdating] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const toast = useToast();
    const ITEMS_PER_PAGE = 10;

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewCompany, setViewCompany] = useState(null);
    const [companyKpis, setCompanyKpis] = useState(null);
    const [loadingKpis, setLoadingKpis] = useState(false);

    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editPosition, setEditPosition] = useState(null);
    const [editPlan, setEditPlan] = useState('BASIC');
    const [editStatus, setEditStatus] = useState('TRIAL');
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
                toast.showSuccess("Estado actualizado exitosamente.");
            },
            (error) => {
                console.error("Error updating company", error);
                toast.showError("Error al actualizar el estado de la suscripción.");
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
        setEditStatus(company.subscriptionStatus || 'TRIAL');
        setEditHasBilling(company.hasElectronicBilling || false);
        setEditExtraRegisters(company.extraRegisters || 0);
        setShowEditModal(true);
    };

    const handleViewClick = (company) => {
        setViewCompany(company);
        setShowViewModal(true);
        setCompanyKpis(null);
        setLoadingKpis(true);
        AdminService.getCompanyKpis(company.id).then(
            res => {
                setCompanyKpis(res.data);
                setLoadingKpis(false);
            },
            err => {
                console.error("Error loading KPIs", err);
                setLoadingKpis(false);
            }
        );
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
                    status: editStatus,
                    hasElectronicBilling: editHasBilling,
                    extraRegisters: editExtraRegisters
                };
                AdminService.updateCompanySubscription(selectedCompany.id, subData).then(
                    () => {
                        setCompanies(companies.map(c =>
                            c.id === selectedCompany.id ? { ...c, ...data, subscriptionPlan: editPlan, subscriptionStatus: editStatus, hasElectronicBilling: editHasBilling, extraRegisters: editExtraRegisters } : c
                        ));
                        setShowEditModal(false);
                        setSaveError('');
                        setSaving(false);
                        toast.showSuccess("Empresa actualizada correctamente.");
                    },
                    (error) => {
                        console.error("Error updating subscription details", error);
                        setSaveError('No se pudo actualizar el plan. Los datos básicos sí fueron guardados.');
                        setSaving(false);
                        toast.showError("Error al actualizar la suscripción.");
                    }
                );
            },
            (error) => {
                console.error("Error updating company", error);
                toast.showError("❌ Error al actualizar los datos de la empresa.");
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
                                                    <Button variant="outline-info" size="sm" className="rounded-pill" onClick={() => handleViewClick(company)}>
                                                        <FaEye className="me-1" /> Detalle
                                                    </Button>
                                                    <Button variant="outline-primary" size="sm" className="rounded-pill" onClick={() => handleEditClick(company)}>
                                                        <FaEdit className="me-1" /> Editar
                                                    </Button>
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
                                    <Form.Label className="small fw-bold">Estado</Form.Label>
                                    <Form.Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="rounded-3">
                                        <option value="TRIAL">PRUEBA</option>
                                        <option value="PAID">ACTIVO (PAGADO)</option>
                                        <option value="PAST_DUE">VENCIDO</option>
                                        <option value="SUSPENDED">SUSPENDIDO</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Plan</Form.Label>
                                    <Form.Select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} className="rounded-3">
                                        <option value="BASIC">Básico (1 Caja)</option>
                                        <option value="MEDIUM">Profesional (3 Cajas)</option>
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

            {/* View Company Modal */}
            <Modal scrollable show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered>
                <Modal.Header closeButton className="border-0 bg-light">
                    <Modal.Title className="fw-bold d-flex align-items-center">
                        <FaBuilding className="me-2 text-primary" />
                        Detalles de la Empresa
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {viewCompany && (
                        <div className="d-flex flex-column gap-4">
                            <div className="d-flex align-items-center gap-3 border-bottom pb-3">
                                <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', fontSize: '24px' }}>
                                    {viewCompany.name ? viewCompany.name.charAt(0).toUpperCase() : <FaBuilding />}
                                </div>
                                <div>
                                    <h4 className="mb-0 fw-bold">{viewCompany.name}</h4>
                                    <small className="text-muted">ID: #{viewCompany.id} {viewCompany.rif ? `| RIF: ${viewCompany.rif}` : ''}</small>
                                </div>
                            </div>
                            
                            <Row>
                                <Col md={6}>
                                    <h6 className="fw-bold text-muted mb-3"><FaInfoCircle className="me-2" />Información General</h6>
                                    <p className="mb-2"><strong>Descripción:</strong> {viewCompany.description || 'No especificada'}</p>
                                    <p className="mb-2"><strong><FaPhone className="me-2 text-muted" />Teléfono:</strong> {viewCompany.phoneNumber || 'No especificado'}</p>
                                    <p className="mb-2"><strong><FaMapMarkerAlt className="me-2 text-muted" />Dirección:</strong> {viewCompany.address || 'No especificada'}</p>
                                    <p className="mb-0"><strong>Moneda Base:</strong> {viewCompany.baseCurrency || 'USD'} | <strong>Zona Horaria:</strong> {viewCompany.timezone}</p>
                                </Col>
                                <Col md={6}>
                                    <h6 className="fw-bold text-muted mb-3"><FaUsers className="me-2" />Estado y Suscripción</h6>
                                    <p className="mb-2">
                                        <strong>Estado:</strong>{' '}
                                        <Badge bg={viewCompany.subscriptionStatus === 'PAID' ? 'success' : viewCompany.subscriptionStatus === 'TRIAL' ? 'warning' : viewCompany.subscriptionStatus === 'PAST_DUE' ? 'danger' : 'secondary'} className="rounded-pill">
                                            {viewCompany.subscriptionStatus === 'PAID' ? 'ACTIVO (PAGADO)' : 
                                             viewCompany.subscriptionStatus === 'TRIAL' ? 'PRUEBA' : 
                                             viewCompany.subscriptionStatus === 'PAST_DUE' ? 'VENCIDO' : 
                                             viewCompany.subscriptionStatus === 'SUSPENDED' ? 'SUSPENDIDO' : 
                                             viewCompany.subscriptionStatus}
                                        </Badge>
                                    </p>
                                    <p className="mb-2"><strong>Plan:</strong> {viewCompany.subscriptionPlan || 'BASIC'}</p>
                                    <p className="mb-2"><strong>Cajas Extra Facturadas:</strong> {viewCompany.billedExtraRegisters || 0}</p>
                                    <p className="mb-0"><strong>Facturación Electrónica:</strong> {viewCompany.hasElectronicBilling ? 'Sí' : 'No'}</p>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={12}>
                                    <h6 className="fw-bold text-muted mb-3"><FaCalendarAlt className="me-2" />Fechas Importantes</h6>
                                    <div className="d-flex gap-4">
                                        <div>
                                            <small className="text-muted d-block">Inicio de Prueba</small>
                                            <strong>{viewCompany.trialStartDate ? new Date(viewCompany.trialStartDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <small className="text-muted d-block">Fin de Suscripción/Prueba</small>
                                            <strong>{viewCompany.subscriptionEndDate ? new Date(viewCompany.subscriptionEndDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</strong>
                                        </div>
                                    </div>
                                </Col>
                            </Row>

                            <hr className="my-2" />

                            <Row>
                                <Col md={12}>
                                    <h6 className="fw-bold text-muted mb-3"><FaChartLine className="me-2" />KPIs y Rendimiento</h6>
                                    {loadingKpis ? (
                                        <div className="d-flex align-items-center gap-2 text-muted">
                                            <Spinner animation="border" size="sm" /> <span>Cargando métricas...</span>
                                        </div>
                                    ) : companyKpis ? (
                                        <Row className="g-3">
                                            <Col md={4} sm={6}>
                                                <Card className="bg-light border-0 shadow-sm h-100">
                                                    <Card.Body className="p-3 text-center">
                                                        <FaShoppingCart className="text-primary mb-2 fs-4" />
                                                        <h4 className="fw-bold mb-1">{companyKpis.totalSales}</h4>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Transacciones Exitosas</small>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                            <Col md={4} sm={6}>
                                                <Card className="bg-light border-0 shadow-sm h-100">
                                                    <Card.Body className="p-3 text-center">
                                                        <FaMoneyBillWave className="text-success mb-2 fs-4" />
                                                        <h4 className="fw-bold mb-1 text-success">${companyKpis.totalRevenue?.toFixed(2) || '0.00'}</h4>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Volumen Ventas (USD)</small>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                            <Col md={4} sm={6}>
                                                <Card className="bg-light border-0 shadow-sm h-100">
                                                    <Card.Body className="p-3 text-center">
                                                        <FaBox className="text-info mb-2 fs-4" />
                                                        <h4 className="fw-bold mb-1">{companyKpis.totalProducts}</h4>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Productos en Catálogo</small>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                            <Col md={6} sm={6}>
                                                <Card className="bg-light border-0 shadow-sm h-100">
                                                    <Card.Body className="p-3 text-center">
                                                        <FaCashRegister className="text-warning mb-2 fs-4" />
                                                        <h4 className="fw-bold mb-1">{companyKpis.totalRegisters}</h4>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Cajas Registradoras</small>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                            <Col md={6} sm={6}>
                                                <Card className="bg-light border-0 shadow-sm h-100">
                                                    <Card.Body className="p-3 text-center">
                                                        <FaUsers className="text-secondary mb-2 fs-4" />
                                                        <h4 className="fw-bold mb-1">{companyKpis.totalUsers}</h4>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Usuarios (Staff)</small>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        </Row>
                                    ) : (
                                        <div className="text-muted small">No se pudieron cargar los KPIs.</div>
                                    )}
                                </Col>
                            </Row>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowViewModal(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </Layout>
    );
};

export default AdminCompaniesPage;
