import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Spinner, Dropdown, Alert, Form, Nav, Tab } from 'react-bootstrap';
import { FaBuilding, FaUsers, FaEdit, FaCheck, FaTimes, FaEye, FaInfoCircle, FaMapMarkerAlt, FaPhone, FaCalendarAlt, FaShoppingCart, FaMoneyBillWave, FaBox, FaCashRegister, FaChartLine, FaBan, FaHistory, FaWrench } from 'react-icons/fa';
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
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
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

    // ── Asistencia Técnica ──────────────────────────────────────────────────
    const [assistTab, setAssistTab] = useState('sales');
    // Ventas
    const [companySales, setCompanySales] = useState([]);
    const [salesPage, setSalesPage] = useState(0);
    const [salesTotalPages, setSalesTotalPages] = useState(0);
    const [salesLoading, setSalesLoading] = useState(false);
    // Compras
    const [companyPurchases, setCompanyPurchases] = useState([]);
    const [purchasesPage, setPurchasesPage] = useState(0);
    const [purchasesTotalPages, setPurchasesTotalPages] = useState(0);
    const [purchasesLoading, setPurchasesLoading] = useState(false);
    // Productos
    const [companyProducts, setCompanyProducts] = useState([]);
    const [productsPage, setProductsPage] = useState(0);
    const [productsTotalPages, setProductsTotalPages] = useState(0);
    const [productsLoading, setProductsLoading] = useState(false);
    // Historial
    const [auditLog, setAuditLog] = useState([]);
    const [auditLoading, setAuditLoading] = useState(false);
    // Modal Edición
    const [showEditRecordModal, setShowEditRecordModal] = useState(false);
    const [editRecord, setEditRecord] = useState(null); // { type: 'sale'|'purchase'|'product', data: {} }
    const [editRecordForm, setEditRecordForm] = useState({});
    const [editRecordReason, setEditRecordReason] = useState('');
    const [editRecordLoading, setEditRecordLoading] = useState(false);
    const [editRecordError, setEditRecordError] = useState('');
    // Modal Anulación
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidRecord, setVoidRecord] = useState(null); // { type, id }
    const [voidReason, setVoidReason] = useState('');
    const [voidConfirmCheck, setVoidConfirmCheck] = useState(false);
    const [voidLoading, setVoidLoading] = useState(false);
    const [voidError, setVoidError] = useState('');

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
        setAssistTab('sales');
        // Reset assist state
        setCompanySales([]); setSalesPage(0);
        setCompanyPurchases([]); setPurchasesPage(0);
        setCompanyProducts([]); setProductsPage(0);
        setAuditLog([]);
        AdminService.getCompanyKpis(company.id).then(
            res => { setCompanyKpis(res.data); setLoadingKpis(false); },
            err => { console.error('Error loading KPIs', err); setLoadingKpis(false); }
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
                        toast.showSuccess('Empresa actualizada correctamente.');
                    },
                    (error) => {
                        console.error('Error updating subscription details', error);
                        setSaveError('No se pudo actualizar el plan. Los datos básicos sí fueron guardados.');
                        setSaving(false);
                        toast.showError('Error al actualizar la suscripción.');
                    }
                );
            },
            (error) => {
                console.error('Error updating company', error);
                toast.showError('❌ Error al actualizar los datos de la empresa.');
                setSaving(false);
            }
        );
    };

    // ── Helpers de Asistencia Técnica ──────────────────────────────────────
    const loadSales = (page = 0) => {
        if (!viewCompany) return;
        setSalesLoading(true);
        AdminService.getCompanySales(viewCompany.id, page).then(
            res => { setCompanySales(res.data.content || []); setSalesTotalPages(res.data.totalPages || 0); setSalesLoading(false); },
            () => setSalesLoading(false)
        );
    };

    const loadPurchases = (page = 0) => {
        if (!viewCompany) return;
        setPurchasesLoading(true);
        AdminService.getCompanyPurchases(viewCompany.id, page).then(
            res => { setCompanyPurchases(res.data.content || []); setPurchasesTotalPages(res.data.totalPages || 0); setPurchasesLoading(false); },
            () => setPurchasesLoading(false)
        );
    };

    const loadProducts = (page = 0) => {
        if (!viewCompany) return;
        setProductsLoading(true);
        AdminService.getCompanyProducts(viewCompany.id, page).then(
            res => { setCompanyProducts(res.data.content || []); setProductsTotalPages(res.data.totalPages || 0); setProductsLoading(false); },
            () => setProductsLoading(false)
        );
    };

    const loadAuditLog = () => {
        if (!viewCompany) return;
        setAuditLoading(true);
        AdminService.getCompanyAuditLog(viewCompany.id).then(
            res => { setAuditLog(res.data.content || []); setAuditLoading(false); },
            () => setAuditLoading(false)
        );
    };

    const handleAssistTabSelect = (tab) => {
        setAssistTab(tab);
        if (tab === 'sales' && companySales.length === 0) loadSales(0);
        if (tab === 'purchases' && companyPurchases.length === 0) loadPurchases(0);
        if (tab === 'products' && companyProducts.length === 0) loadProducts(0);
        if (tab === 'history') loadAuditLog();
    };

    const openEditRecord = (type, record) => {
        setEditRecord({ type, data: record });
        if (type === 'sale') setEditRecordForm({ totalAmount: record.totalAmount, paymentMethod: record.paymentMethod, customerName: record.customerName, customerPhone: record.customerPhone, customerCedula: record.customerCedula });
        if (type === 'purchase') setEditRecordForm({ total: record.total, invoiceNumber: record.invoiceNumber || '', paymentMethod: record.paymentMethod });
        if (type === 'product') setEditRecordForm({ name: record.name, category: record.category || '', price: record.price, description: record.description || '' });
        setEditRecordReason('');
        setEditRecordError('');
        setShowEditRecordModal(true);
    };

    const handleSaveRecord = () => {
        setEditRecordLoading(true);
        setEditRecordError('');
        const { type, data } = editRecord;
        const payload = { ...editRecordForm, reason: editRecordReason };
        let promise;
        if (type === 'sale') promise = AdminService.patchCompanySale(viewCompany.id, data.id, payload);
        else if (type === 'purchase') promise = AdminService.patchCompanyPurchase(viewCompany.id, data.id, payload);
        else promise = AdminService.patchCompanyProduct(viewCompany.id, data.id, payload);
        promise.then(
            () => {
                setEditRecordLoading(false);
                setShowEditRecordModal(false);
                toast.showSuccess('Registro actualizado correctamente.');
                if (type === 'sale') loadSales(salesPage);
                if (type === 'purchase') loadPurchases(purchasesPage);
                if (type === 'product') loadProducts(productsPage);
                loadAuditLog();
            },
            err => {
                setEditRecordLoading(false);
                setEditRecordError(err.response?.data?.message || 'Error al actualizar.');
            }
        );
    };

    const openVoidRecord = (type, record) => {
        setVoidRecord({ type, id: record.id, name: type === 'product' ? record.name : `#${record.id}` });
        setVoidReason('');
        setVoidConfirmCheck(false);
        setVoidError('');
        setShowVoidModal(true);
    };

    const handleVoidRecord = () => {
        if (voidReason.trim().length < 10) { setVoidError('El motivo debe tener al menos 10 caracteres.'); return; }
        if (!voidConfirmCheck) { setVoidError('Debes confirmar que entiendes el impacto de esta acción.'); return; }
        setVoidLoading(true);
        setVoidError('');
        const { type, id } = voidRecord;
        const promise = type === 'sale'
            ? AdminService.voidCompanySale(viewCompany.id, id, voidReason)
            : AdminService.voidCompanyPurchase(viewCompany.id, id, voidReason);
        promise.then(
            () => {
                setVoidLoading(false);
                setShowVoidModal(false);
                toast.showSuccess('Registro anulado correctamente. Stock actualizado.');
                if (type === 'sale') loadSales(salesPage);
                if (type === 'purchase') loadPurchases(purchasesPage);
                loadAuditLog();
            },
            err => {
                setVoidLoading(false);
                setVoidError(err.response?.data?.message || 'Error al anular.');
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

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedCompanies = (companies) => {
        if (!sortConfig.key) return companies;
        
        return [...companies].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortedCompanies = getSortedCompanies(filteredCompanies);
    const totalPages = Math.ceil(sortedCompanies.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCompanies = sortedCompanies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const renderSortIcon = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
        }
        return ' ↕';
    };

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
                                    <th className="ps-4" style={{cursor: 'pointer'}} onClick={() => handleSort('id')}>ID{renderSortIcon('id')}</th>
                                    <th style={{cursor: 'pointer'}} onClick={() => handleSort('name')}>Nombre Empresa{renderSortIcon('name')}</th>
                                    <th style={{cursor: 'pointer'}} onClick={() => handleSort('subscriptionPlan')}>Plan Actual{renderSortIcon('subscriptionPlan')}</th>
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

            {/* View Company Modal — con Tabs */}
            <Modal scrollable show={showViewModal} onHide={() => setShowViewModal(false)} size="xl" centered>
                <Modal.Header closeButton className="border-0 bg-light">
                    <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                        <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                            {viewCompany?.name?.charAt(0).toUpperCase() || <FaBuilding />}
                        </div>
                        {viewCompany?.name}
                        <small className="text-muted fs-6 fw-normal ms-1">#{viewCompany?.id}</small>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    {viewCompany && (
                        <Tab.Container defaultActiveKey="info">
                            <Nav variant="tabs" className="px-3 pt-2 border-bottom bg-light">
                                <Nav.Item>
                                    <Nav.Link eventKey="info"><FaInfoCircle className="me-1" />Información</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="kpis"><FaChartLine className="me-1" />KPIs</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="assist" onClick={() => { if (companySales.length === 0) loadSales(0); }}>
                                        <FaWrench className="me-1" />Asistencia Técnica
                                    </Nav.Link>
                                </Nav.Item>
                            </Nav>
                            <Tab.Content>

                                {/* ── Tab: Información ─────────────────────────── */}
                                <Tab.Pane eventKey="info" className="p-4">
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
                                                    {viewCompany.subscriptionStatus === 'PAID' ? 'ACTIVO (PAGADO)' : viewCompany.subscriptionStatus === 'TRIAL' ? 'PRUEBA' : viewCompany.subscriptionStatus === 'PAST_DUE' ? 'VENCIDO' : viewCompany.subscriptionStatus === 'SUSPENDED' ? 'SUSPENDIDO' : viewCompany.subscriptionStatus}
                                                </Badge>
                                            </p>
                                            <p className="mb-2"><strong>Plan:</strong> {viewCompany.subscriptionPlan || 'BASIC'}</p>
                                            <p className="mb-2"><strong>Cajas Extra Facturadas:</strong> {viewCompany.billedExtraRegisters || 0}</p>
                                            <p className="mb-0"><strong>Facturación Electrónica:</strong> {viewCompany.hasElectronicBilling ? 'Sí' : 'No'}</p>
                                        </Col>
                                    </Row>
                                    <hr />
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
                                </Tab.Pane>

                                {/* ── Tab: KPIs ────────────────────────────────── */}
                                <Tab.Pane eventKey="kpis" className="p-4">
                                    {loadingKpis ? (
                                        <div className="d-flex align-items-center gap-2 text-muted"><Spinner animation="border" size="sm" /><span>Cargando métricas...</span></div>
                                    ) : companyKpis ? (
                                        <Row className="g-3">
                                            <Col md={4} sm={6}><Card className="bg-light border-0 shadow-sm h-100"><Card.Body className="p-3 text-center"><FaShoppingCart className="text-primary mb-2 fs-4" /><h4 className="fw-bold mb-1">{companyKpis.totalSales}</h4><small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Transacciones Exitosas</small></Card.Body></Card></Col>
                                            <Col md={4} sm={6}><Card className="bg-light border-0 shadow-sm h-100"><Card.Body className="p-3 text-center"><FaMoneyBillWave className="text-success mb-2 fs-4" /><h4 className="fw-bold mb-1 text-success">${companyKpis.totalRevenue?.toFixed(2) || '0.00'}</h4><small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Volumen Ventas (USD)</small></Card.Body></Card></Col>
                                            <Col md={4} sm={6}><Card className="bg-light border-0 shadow-sm h-100"><Card.Body className="p-3 text-center"><FaBox className="text-info mb-2 fs-4" /><h4 className="fw-bold mb-1">{companyKpis.totalProducts}</h4><small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Productos en Catálogo</small></Card.Body></Card></Col>
                                            <Col md={6} sm={6}><Card className="bg-light border-0 shadow-sm h-100"><Card.Body className="p-3 text-center"><FaCashRegister className="text-warning mb-2 fs-4" /><h4 className="fw-bold mb-1">{companyKpis.totalRegisters}</h4><small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Cajas Registradoras</small></Card.Body></Card></Col>
                                            <Col md={6} sm={6}><Card className="bg-light border-0 shadow-sm h-100"><Card.Body className="p-3 text-center"><FaUsers className="text-secondary mb-2 fs-4" /><h4 className="fw-bold mb-1">{companyKpis.totalUsers}</h4><small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Usuarios (Staff)</small></Card.Body></Card></Col>
                                        </Row>
                                    ) : <div className="text-muted small">No se pudieron cargar los KPIs.</div>}
                                </Tab.Pane>

                                {/* ── Tab: Asistencia Técnica ───────────────────── */}
                                <Tab.Pane eventKey="assist">
                                    <Nav variant="pills" className="px-3 pt-3 gap-1" activeKey={assistTab} onSelect={handleAssistTabSelect}>
                                        <Nav.Item><Nav.Link eventKey="sales" className="small px-3 py-1"><FaShoppingCart className="me-1" />Ventas</Nav.Link></Nav.Item>
                                        <Nav.Item><Nav.Link eventKey="purchases" className="small px-3 py-1"><FaBox className="me-1" />Compras</Nav.Link></Nav.Item>
                                        <Nav.Item><Nav.Link eventKey="products" className="small px-3 py-1"><FaMoneyBillWave className="me-1" />Productos</Nav.Link></Nav.Item>
                                        <Nav.Item><Nav.Link eventKey="history" className="small px-3 py-1"><FaHistory className="me-1" />Historial</Nav.Link></Nav.Item>
                                    </Nav>

                                    {/* Sub-tab: Ventas */}
                                    {assistTab === 'sales' && (
                                        <div className="p-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <small className="text-muted">Ventas de la empresa (más recientes primero)</small>
                                                <Button size="sm" variant="outline-secondary" className="rounded-pill" onClick={() => loadSales(salesPage)}>↻ Refrescar</Button>
                                            </div>
                                            {salesLoading ? <div className="text-center py-3"><Spinner size="sm" /></div> : (
                                                <Table hover size="sm" responsive className="mb-2 align-middle small">
                                                    <thead className="table-light"><tr><th>#ID</th><th>Fecha</th><th>Cliente</th><th>Método</th><th>Monto</th><th>Status</th><th>Acciones</th></tr></thead>
                                                    <tbody>
                                                        {companySales.length === 0 ? <tr><td colSpan={7} className="text-center text-muted py-3">Sin ventas registradas</td></tr> : companySales.map(s => (
                                                            <tr key={s.id}>
                                                                <td className="fw-bold text-muted">#{s.id}</td>
                                                                <td>{s.date ? new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                                <td>{s.customerName || s.customerEmail || '-'}</td>
                                                                <td><Badge bg="secondary" className="rounded-pill">{s.paymentMethod || '-'}</Badge></td>
                                                                <td className="fw-bold">${Number(s.totalAmount || 0).toFixed(2)}</td>
                                                                <td><Badge bg={s.status === 'PAID' ? 'success' : s.status === 'CANCELLED' ? 'danger' : 'warning'} className="rounded-pill">{s.status}</Badge></td>
                                                                <td>
                                                                    <div className="d-flex gap-1">
                                                                        <Button size="sm" variant="outline-primary" className="rounded-pill py-0" onClick={() => openEditRecord('sale', s)} disabled={s.status === 'CANCELLED'}><FaEdit /></Button>
                                                                        <Button size="sm" variant="outline-danger" className="rounded-pill py-0" onClick={() => openVoidRecord('sale', s)} disabled={s.status === 'CANCELLED'}><FaBan /></Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            )}
                                            {salesTotalPages > 1 && (
                                                <div className="d-flex justify-content-center gap-2">
                                                    <Button size="sm" variant="outline-secondary" disabled={salesPage === 0} onClick={() => { setSalesPage(p => p - 1); loadSales(salesPage - 1); }}>‹ Ant</Button>
                                                    <span className="small text-muted align-self-center">{salesPage + 1} / {salesTotalPages}</span>
                                                    <Button size="sm" variant="outline-secondary" disabled={salesPage >= salesTotalPages - 1} onClick={() => { setSalesPage(p => p + 1); loadSales(salesPage + 1); }}>Sig ›</Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab: Compras */}
                                    {assistTab === 'purchases' && (
                                        <div className="p-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <small className="text-muted">Compras a proveedores (más recientes primero)</small>
                                                <Button size="sm" variant="outline-secondary" className="rounded-pill" onClick={() => loadPurchases(purchasesPage)}>↻ Refrescar</Button>
                                            </div>
                                            {purchasesLoading ? <div className="text-center py-3"><Spinner size="sm" /></div> : (
                                                <Table hover size="sm" responsive className="mb-2 align-middle small">
                                                    <thead className="table-light"><tr><th>#ID</th><th>Fecha</th><th>Proveedor</th><th>Factura</th><th>Moneda</th><th>Total</th><th>Acciones</th></tr></thead>
                                                    <tbody>
                                                        {companyPurchases.length === 0 ? <tr><td colSpan={7} className="text-center text-muted py-3">Sin compras registradas</td></tr> : companyPurchases.map(p => (
                                                            <tr key={p.id}>
                                                                <td className="fw-bold text-muted">#{p.id}</td>
                                                                <td>{p.date ? new Date(p.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                                                                <td>{p.supplier?.name || '-'}</td>
                                                                <td><small className="text-muted">{p.invoiceNumber || '—'}</small></td>
                                                                <td><Badge bg="info" className="rounded-pill">{p.currencyCode || 'USD'}</Badge></td>
                                                                <td className="fw-bold">${Number(p.total || 0).toFixed(2)}</td>
                                                                <td>
                                                                    <div className="d-flex gap-1">
                                                                        <Button size="sm" variant="outline-primary" className="rounded-pill py-0" onClick={() => openEditRecord('purchase', p)}><FaEdit /></Button>
                                                                        <Button size="sm" variant="outline-danger" className="rounded-pill py-0" onClick={() => openVoidRecord('purchase', p)}><FaBan /></Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            )}
                                            {purchasesTotalPages > 1 && (
                                                <div className="d-flex justify-content-center gap-2">
                                                    <Button size="sm" variant="outline-secondary" disabled={purchasesPage === 0} onClick={() => { setPurchasesPage(p => p - 1); loadPurchases(purchasesPage - 1); }}>‹ Ant</Button>
                                                    <span className="small text-muted align-self-center">{purchasesPage + 1} / {purchasesTotalPages}</span>
                                                    <Button size="sm" variant="outline-secondary" disabled={purchasesPage >= purchasesTotalPages - 1} onClick={() => { setPurchasesPage(p => p + 1); loadPurchases(purchasesPage + 1); }}>Sig ›</Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab: Productos */}
                                    {assistTab === 'products' && (
                                        <div className="p-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <small className="text-muted">Catálogo de productos de la empresa</small>
                                                <Button size="sm" variant="outline-secondary" className="rounded-pill" onClick={() => loadProducts(productsPage)}>↻ Refrescar</Button>
                                            </div>
                                            {productsLoading ? <div className="text-center py-3"><Spinner size="sm" /></div> : (
                                                <Table hover size="sm" responsive className="mb-2 align-middle small">
                                                    <thead className="table-light"><tr><th>#ID</th><th>Nombre</th><th>Categoría</th><th>SKU</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead>
                                                    <tbody>
                                                        {companyProducts.length === 0 ? <tr><td colSpan={7} className="text-center text-muted py-3">Sin productos registrados</td></tr> : companyProducts.map(prod => (
                                                            <tr key={prod.id}>
                                                                <td className="fw-bold text-muted">#{prod.id}</td>
                                                                <td className="fw-semibold">{prod.name}</td>
                                                                <td><small className="text-muted">{prod.category || '—'}</small></td>
                                                                <td><code className="small">{prod.sku || '—'}</code></td>
                                                                <td>${Number(prod.price || 0).toFixed(2)}</td>
                                                                <td><Badge bg={prod.stock <= (prod.minStock || 0) ? 'danger' : 'success'} className="rounded-pill">{prod.stock}</Badge></td>
                                                                <td>
                                                                    <Button size="sm" variant="outline-primary" className="rounded-pill py-0" onClick={() => openEditRecord('product', prod)}><FaEdit /></Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            )}
                                            {productsTotalPages > 1 && (
                                                <div className="d-flex justify-content-center gap-2">
                                                    <Button size="sm" variant="outline-secondary" disabled={productsPage === 0} onClick={() => { setProductsPage(p => p - 1); loadProducts(productsPage - 1); }}>‹ Ant</Button>
                                                    <span className="small text-muted align-self-center">{productsPage + 1} / {productsTotalPages}</span>
                                                    <Button size="sm" variant="outline-secondary" disabled={productsPage >= productsTotalPages - 1} onClick={() => { setProductsPage(p => p + 1); loadProducts(productsPage + 1); }}>Sig ›</Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab: Historial */}
                                    {assistTab === 'history' && (
                                        <div className="p-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <small className="text-muted">Cambios realizados por el Super Admin sobre esta empresa</small>
                                                <Button size="sm" variant="outline-secondary" className="rounded-pill" onClick={loadAuditLog}>↻ Refrescar</Button>
                                            </div>
                                            {auditLoading ? <div className="text-center py-3"><Spinner size="sm" /></div> : (
                                                <Table hover size="sm" responsive className="mb-2 align-middle small">
                                                    <thead className="table-light"><tr><th>Fecha</th><th>Admin</th><th>Tipo</th><th>Acción</th><th>Campo</th><th>Antes</th><th>Después</th><th>Motivo</th></tr></thead>
                                                    <tbody>
                                                        {auditLog.length === 0 ? <tr><td colSpan={8} className="text-center text-muted py-3">Sin cambios registrados aún</td></tr> : auditLog.map(entry => (
                                                            <tr key={entry.id}>
                                                                <td className="text-muted">{entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                                <td className="fw-semibold">{entry.adminUsername}</td>
                                                                <td><Badge bg="secondary" className="rounded-pill">{entry.entityType} #{entry.entityId}</Badge></td>
                                                                <td><Badge bg={entry.actionType === 'VOID' ? 'danger' : 'primary'} className="rounded-pill">{entry.actionType}</Badge></td>
                                                                <td><small className="text-muted">{entry.fieldChanged || '—'}</small></td>
                                                                <td><small className="text-danger">{entry.oldValue || '—'}</small></td>
                                                                <td><small className="text-success">{entry.newValue || '—'}</small></td>
                                                                <td><small className="text-muted fst-italic" title={entry.reason}>{entry.reason ? entry.reason.substring(0, 30) + (entry.reason.length > 30 ? '...' : '') : '—'}</small></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            )}
                                        </div>
                                    )}
                                </Tab.Pane>

                            </Tab.Content>
                        </Tab.Container>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowViewModal(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal: Editar Registro */}
            <Modal show={showEditRecordModal} onHide={() => setShowEditRecordModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold fs-6">
                        <FaEdit className="me-2 text-primary" />
                        Editar {editRecord?.type === 'sale' ? 'Venta' : editRecord?.type === 'purchase' ? 'Compra' : 'Producto'} #{editRecord?.data?.id}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editRecordError && <Alert variant="danger" className="small py-2 rounded-3">{editRecordError}</Alert>}
                    <Alert variant="info" className="small py-2 rounded-3 mb-3">
                        ℹ️ Solo puedes corregir errores de tipeo. Para cambiar la moneda o cantidades, utiliza la opción <strong>Anular</strong>.
                    </Alert>
                    {editRecord?.type === 'sale' && (
                        <>
                            <Form.Group className="mb-2"><Form.Label className="small fw-bold">Monto Total</Form.Label><Form.Control size="sm" type="number" step="0.01" value={editRecordForm.totalAmount || ''} onChange={e => setEditRecordForm(f => ({ ...f, totalAmount: e.target.value }))} /></Form.Group>
                            <Form.Group className="mb-2"><Form.Label className="small fw-bold">Método de Pago</Form.Label>
                                <Form.Select size="sm" value={editRecordForm.paymentMethod || ''} onChange={e => setEditRecordForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                                    <option value="CASH">CASH</option><option value="CARD">CARD</option><option value="TRANSFER">TRANSFER</option><option value="MOBILE_PAYMENT">MOBILE_PAYMENT</option><option value="MIXED">MIXED</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-2"><Form.Label className="small fw-bold">Nombre Cliente</Form.Label><Form.Control size="sm" value={editRecordForm.customerName || ''} onChange={e => setEditRecordForm(f => ({ ...f, customerName: e.target.value }))} /></Form.Group>
                            <Form.Group className="mb-2"><Form.Label className="small fw-bold">Teléfono Cliente</Form.Label><Form.Control size="sm" value={editRecordForm.customerPhone || ''} onChange={e => setEditRecordForm(f => ({ ...f, customerPhone: e.target.value }))} /></Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="small fw-bold">Cédula Cliente</Form.Label><Form.Control size="sm" value={editRecordForm.customerCedula || ''} onChange={e => setEditRecordForm(f => ({ ...f, customerCedula: e.target.value }))} /></Form.Group>
                        </>
                    )}
                    {editRecord?.type === 'purchase' && (
                        <>
                            <Form.Group className="mb-2"><Form.Label className="small fw-bold">Total</Form.Label><Form.Control size="sm" type="number" step="0.01" value={editRecordForm.total || ''} onChange={e => setEditRecordForm(f => ({ ...f, total: e.target.value }))} /></Form.Group>
                            <Form.Group className="mb-2"><Form.Label className="small fw-bold">Nº Factura</Form.Label><Form.Control size="sm" value={editRecordForm.invoiceNumber || ''} onChange={e => setEditRecordForm(f => ({ ...f, invoiceNumber: e.target.value }))} /></Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="small fw-bold">Método de Pago</Form.Label>
                                <Form.Select size="sm" value={editRecordForm.paymentMethod || ''} onChange={e => setEditRecordForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                                    <option value="CASH">CASH</option><option value="CARD">CARD</option><option value="TRANSFER">TRANSFER</option><option value="MOBILE_PAYMENT">MOBILE_PAYMENT</option>
                                </Form.Select>
                            </Form.Group>
                        </>
                    )}
                    {editRecord?.type === 'product' && (
                        <>
                            <Form.Group className="mb-2"><Form.Label className="small fw-bold">Nombre</Form.Label><Form.Control size="sm" value={editRecordForm.name || ''} onChange={e => setEditRecordForm(f => ({ ...f, name: e.target.value }))} /></Form.Group>
                            <Form.Group className="mb-2"><Form.Label className="small fw-bold">Categoría</Form.Label><Form.Control size="sm" value={editRecordForm.category || ''} onChange={e => setEditRecordForm(f => ({ ...f, category: e.target.value }))} /></Form.Group>
                            <Form.Group className="mb-2"><Form.Label className="small fw-bold">Precio</Form.Label><Form.Control size="sm" type="number" step="0.01" value={editRecordForm.price || ''} onChange={e => setEditRecordForm(f => ({ ...f, price: e.target.value }))} /></Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="small fw-bold">Descripción</Form.Label><Form.Control size="sm" as="textarea" rows={2} value={editRecordForm.description || ''} onChange={e => setEditRecordForm(f => ({ ...f, description: e.target.value }))} /></Form.Group>
                        </>
                    )}
                    <Form.Group><Form.Label className="small fw-bold">Motivo del cambio <span className="text-muted">(opcional)</span></Form.Label>
                        <Form.Control size="sm" as="textarea" rows={2} placeholder="Ej: Error de tipeo en el monto..." value={editRecordReason} onChange={e => setEditRecordReason(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="light" size="sm" className="rounded-pill" onClick={() => setShowEditRecordModal(false)}>Cancelar</Button>
                    <Button variant="primary" size="sm" className="rounded-pill" onClick={handleSaveRecord} disabled={editRecordLoading}>
                        {editRecordLoading ? <Spinner size="sm" /> : <><FaCheck className="me-1" />Guardar</>}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal: Anular Registro */}
            <Modal show={showVoidModal} onHide={() => setShowVoidModal(false)} centered>
                <Modal.Header closeButton className="border-0 bg-danger bg-opacity-10">
                    <Modal.Title className="fw-bold fs-6 text-danger"><FaBan className="me-2" />Anular {voidRecord?.type === 'sale' ? 'Venta' : 'Compra'} {voidRecord?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {voidError && <Alert variant="danger" className="small py-2 rounded-3">{voidError}</Alert>}
                    <Alert variant="warning" className="small py-2 rounded-3 mb-3">
                        ⚠️ <strong>Esta acción modifica el inventario.</strong> {voidRecord?.type === 'sale' ? 'El stock de los productos se restaurará.' : 'El stock sumado por esta compra se descontará.'} Esta operación no se puede deshacer.
                    </Alert>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold">Motivo de la anulación <span className="text-danger">*</span></Form.Label>
                        <Form.Control as="textarea" rows={3} placeholder="Describe el motivo (mínimo 10 caracteres)..." value={voidReason} onChange={e => setVoidReason(e.target.value)} className={`rounded-3 ${voidReason.length > 0 && voidReason.length < 10 ? 'is-invalid' : ''}`} />
                        <small className="text-muted">{voidReason.length}/10 caracteres mínimo</small>
                    </Form.Group>
                    <Form.Check type="checkbox" id="void-confirm-check" checked={voidConfirmCheck} onChange={e => setVoidConfirmCheck(e.target.checked)}
                        label={<span className="small fw-bold">Entiendo que esta acción modifica el inventario y no se puede deshacer</span>}
                    />
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="light" size="sm" className="rounded-pill" onClick={() => setShowVoidModal(false)}>Cancelar</Button>
                    <Button variant="danger" size="sm" className="rounded-pill" onClick={handleVoidRecord} disabled={voidLoading || voidReason.length < 10 || !voidConfirmCheck}>
                        {voidLoading ? <Spinner size="sm" /> : <><FaBan className="me-1" />Confirmar Anulación</>}
                    </Button>
                </Modal.Footer>
            </Modal>

        </Layout>
    );
};

export default AdminCompaniesPage;

