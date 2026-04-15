import React, { useState, useEffect } from "react";
import { Container, Table, Button, Modal, Form, Alert, Badge, Pagination } from "react-bootstrap";
import Layout from "../components/Layout";
import SupplierService from "../services/supplier.service";
import { FaPlus, FaTruck, FaSort, FaSortUp, FaSortDown, FaEnvelope, FaPhone, FaSearch } from "react-icons/fa";

const SupplierPage = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState("");

    // Form State
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // Pagination & Search State
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [sortBy, setSortBy] = useState("id");
    const [sortDir, setSortDir] = useState("desc");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setCurrentPage(0);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const loadSuppliers = () => {
        const params = {
            page: currentPage,
            size: pageSize,
            sort: `${sortBy},${sortDir}`,
            q: debouncedSearchQuery || undefined
        };

        SupplierService.getAll(params).then(
            (response) => {
                // If it's a paginated response
                if (response.data.suppliers) {
                    const { suppliers, totalPages, totalItems } = response.data;
                    setSuppliers(suppliers);
                    setTotalPages(totalPages);
                    setTotalItems(totalItems);
                } else {
                    // Fallback for old/unpaginated responses (should not happen after update)
                    setSuppliers(Array.isArray(response.data) ? response.data : []);
                    setTotalPages(1);
                    setTotalItems(response.data.length || 0);
                }
            },
            (error) => {
                console.error("Error loading suppliers", error);
            }
        );
    };

    useEffect(() => {
        loadSuppliers();
    }, [currentPage, pageSize, sortBy, sortDir, debouncedSearchQuery]);

    const handleCreate = (e) => {
        e.preventDefault();
        SupplierService.create({ name, email, phone }).then(
            () => {
                setMessage("✅ Proveedor creado correctamente");
                setShowModal(false);
                loadSuppliers();
                setName(""); setEmail(""); setPhone("");
                setTimeout(() => setMessage(""), 3000);
            },
            () => {
                setMessage("❌ Error creando proveedor");
                setTimeout(() => setMessage(""), 5000);
            }
        );
    };

    const handleSort = (field) => {
        const isAsc = sortBy === field && sortDir === "asc";
        setSortDir(isAsc ? "desc" : "asc");
        setSortBy(field);
        setCurrentPage(0);
    };

    const renderSortIcon = (field) => {
        if (sortBy !== field) return <FaSort className="ms-1 text-muted opacity-50" size={10} />;
        return sortDir === "asc" ? <FaSortUp className="ms-1 text-primary" size={12} /> : <FaSortDown className="ms-1 text-primary" size={12} />;
    };

    return (
        <Layout>
            <Container fluid>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div>
                        <h2 className="display-6 fw-bold mb-0 text-gradient">Proveedores</h2>
                        <p className="text-secondary mb-0">Gestiona tus contactos comerciales y de abastecimiento.</p>
                    </div>
                    <Button variant="primary" className="px-4 py-2 shadow-sm rounded-pill" onClick={() => setShowModal(true)}>
                        <FaPlus className="me-2" /> Nuevo Proveedor
                    </Button>
                </div>

                {message && <Alert variant="info" className="border-0 shadow-sm rounded-4 mb-4">{message}</Alert>}

                {/* Search Bar */}
                <div className="mb-4">
                    <div className="glass-card-admin p-3 border-0 shadow-sm d-flex align-items-center">
                        <div className="position-relative flex-grow-1">
                            <Form.Control
                                type="text"
                                placeholder="🔍 Buscar proveedor por nombre, email o teléfono..."
                                className="border-0 bg-transparent shadow-none fs-5 py-2"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {searchQuery && (
                            <Button variant="link" className="text-secondary p-0 me-2" onClick={() => setSearchQuery("")}>
                                Limpiar
                            </Button>
                        )}
                    </div>
                </div>

                <div className="glass-card-admin p-0 overflow-hidden border-0 shadow-sm">
                    {suppliers.length === 0 ? (
                        <div className="text-center py-5 text-secondary">
                            <FaTruck size={50} className="mb-3 opacity-25" />
                            <h4 className="fw-bold">No se encontraron proveedores</h4>
                            <p>Registra tus proveedores para gestionar tus órdenes de compra.</p>
                        </div>
                    ) : (
                        <>
                            <Table hover responsive className="align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="border-0 text-secondary small text-uppercase ps-4 pointer-cursor" style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                                            Proveedor {renderSortIcon('name')}
                                        </th>
                                        <th className="border-0 text-secondary small text-uppercase pointer-cursor" style={{ cursor: 'pointer' }} onClick={() => handleSort('email')}>
                                            Email {renderSortIcon('email')}
                                        </th>
                                        <th className="border-0 text-secondary small text-uppercase text-end pe-4 pointer-cursor" style={{ cursor: 'pointer' }} onClick={() => handleSort('phone')}>
                                            Teléfono {renderSortIcon('phone')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suppliers.map((s) => (
                                        <tr key={s.id}>
                                            <td className="ps-4 py-3">
                                                <div className="d-flex align-items-center">
                                                    <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-3" style={{ width: 40, height: 40 }}>
                                                        <FaTruck />
                                                    </div>
                                                    <span className="fw-bold text-dark">{s.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                {s.email ? (
                                                    <div className="d-flex align-items-center gap-2">
                                                        <FaEnvelope className="text-muted small" />
                                                        <span>{s.email}</span>
                                                    </div>
                                                ) : <span className="text-muted small">No registrado</span>}
                                            </td>
                                            <td className="text-end pe-4">
                                                {s.phone ? (
                                                    <Badge bg="light" className="text-dark border fw-normal px-3 py-2">
                                                        <FaPhone className="me-2 text-secondary small" />
                                                        {s.phone}
                                                    </Badge>
                                                ) : <span className="text-muted small">No registrado</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {/* Pagination Footer */}
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 border-top bg-light">
                                <div className="text-muted small mb-3 mb-md-0">
                                    Mostrando <b>{suppliers.length}</b> de <b>{totalItems}</b> proveedores
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <Pagination size="sm" className="mb-0">
                                        <Pagination.First disabled={currentPage === 0} onClick={() => setCurrentPage(0)} />
                                        <Pagination.Prev disabled={currentPage === 0} onClick={() => setCurrentPage(currentPage - 1)} />
                                        {[...Array(totalPages)].map((_, i) => (
                                            <Pagination.Item key={i} active={i === currentPage} onClick={() => setCurrentPage(i)}>
                                                {i + 1}
                                            </Pagination.Item>
                                        ))}
                                        <Pagination.Next disabled={currentPage === totalPages - 1} onClick={() => setCurrentPage(currentPage + 1)} />
                                        <Pagination.Last disabled={currentPage === totalPages - 1} onClick={() => setCurrentPage(totalPages - 1)} />
                                    </Pagination>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Container>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold text-dark">Nuevo Proveedor</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form onSubmit={handleCreate}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Nombre Empresa / Razón Social *</Form.Label>
                            <Form.Control 
                                type="text" 
                                required 
                                placeholder="Ej: Distribuidora Global S.A."
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Email de Contacto</Form.Label>
                            <Form.Control 
                                type="email" 
                                placeholder="ventas@proveedor.com"
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="fw-bold small">Teléfono / WhatsApp</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="+58 412 0000000"
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)} 
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit" className="w-100 py-2 fw-bold shadow-sm">
                            Guardar Proveedor
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Layout>
    );
};

export default SupplierPage;
