import React, { useState, useEffect } from "react";
import { Container, Table, Button, Modal, Form, Alert } from "react-bootstrap";
import Sidebar from "../components/Sidebar";
import SupplierService from "../services/supplier.service";
import { FaPlus, FaTruck } from "react-icons/fa";

const SupplierPage = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState("");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    useEffect(() => { loadSuppliers(); }, []);

    const loadSuppliers = () => {
        SupplierService.getAll().then(res => setSuppliers(res.data), err => console.error(err));
    };

    const handleCreate = (e) => {
        e.preventDefault();
        SupplierService.create({ name, email, phone }).then(
            () => {
                setMessage("Proveedor creado correctamente");
                setShowModal(false);
                loadSuppliers();
                setName(""); setEmail(""); setPhone("");
                setTimeout(() => setMessage(""), 3000);
            },
            (error) => setMessage("Error creando proveedor")
        );
    };

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4 bg-light" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="text-dark fw-bold">Proveedores</h2>
                        <Button variant="primary" onClick={() => setShowModal(true)}>
                            <FaPlus className="me-2" /> Nuevo Proveedor
                        </Button>
                    </div>

                    {message && <Alert variant="info" className="shadow-sm border-0">{message}</Alert>}

                    <div className="glass-panel p-4 bg-white shadow-sm border-0">
                        {suppliers.length === 0 ? (
                            <div className="text-center py-5 text-secondary">
                                <FaTruck size={50} className="mb-3 opacity-25" />
                                <h4>Sin Proveedores</h4>
                                <p>Registra tus proveedores para gestionar compras.</p>
                            </div>
                        ) : (
                            <Table hover responsive className="align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="border-0">Nombre</th>
                                        <th className="border-0">Email</th>
                                        <th className="border-0 text-end">Teléfono</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suppliers.map((s) => (
                                        <tr key={s.id}>
                                            <td className="fw-bold">{s.name}</td>
                                            <td>{s.email || '-'}</td>
                                            <td className="text-end">{s.phone || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </div>
                </Container>

                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold text-dark">Nuevo Proveedor</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleCreate}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre Empresa</Form.Label>
                                <Form.Control type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Teléfono</Form.Label>
                                <Form.Control type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </Form.Group>
                            <Button variant="primary" type="submit" className="w-100 py-2">Guardar</Button>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default SupplierPage;
