import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Button, Modal, Row, Col, Alert } from 'react-bootstrap';
import { FaHistory, FaCheckCircle, FaExclamationTriangle, FaEye, FaCalculator, FaMoneyBillWave, FaCreditCard, FaUniversity } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import ShiftService from '../services/shift.service';

const ShiftHistoryPage = () => {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedShift, setSelectedShift] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [observation, setObservation] = useState("");
    const [error, setError] = useState("");

    const fetchShifts = () => {
        setLoading(true);
        ShiftService.getHistory().then(
            (res) => {
                setShifts(res.data);
                setLoading(false);
            },
            () => {
                setError("Error al cargar el historial de turnos.");
                setLoading(false);
            }
        );
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    const handleVerify = () => {
        ShiftService.verifyShift(selectedShift.id, observation).then(() => {
            fetchShifts();
            setShowModal(false);
            setObservation("");
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'OPEN': return <Badge bg="success">ABIERTO</Badge>;
            case 'CLOSED': return <Badge bg="warning" className="text-dark">POR VERIFICAR</Badge>;
            case 'VERIFIED': return <Badge bg="primary">VERIFICADO</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const calculateDifference = (expected, reported) => {
        const diff = (reported || 0) - (expected || 0);
        if (Math.abs(diff) < 0.01) return <span className="text-success">CUADRA</span>;
        return <span className={diff > 0 ? "text-primary" : "text-danger"}>{diff > 0 ? "+" : ""}{diff.toFixed(2)}</span>;
    };

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2><FaHistory className="me-2 text-primary" /> Auditoría de Cajas (Turnos)</h2>
                    <Button variant="outline-primary" onClick={fetchShifts}>Actualizar</Button>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <Card className="shadow-sm border-0 rounded-4">
                    <Card.Body className="p-0">
                        <Table hover responsive className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">Usuario</th>
                                    <th>Apertura</th>
                                    <th>Cierre</th>
                                    <th>Estado</th>
                                    <th className="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.map(s => (
                                    <tr key={s.id} className="align-middle">
                                        <td className="ps-4 fw-bold">{s.user.username}</td>
                                        <td>{new Date(s.startTime).toLocaleString()}</td>
                                        <td>{s.endTime ? new Date(s.endTime).toLocaleString() : '---'}</td>
                                        <td>{getStatusBadge(s.status)}</td>
                                        <td className="text-end pe-4">
                                            <Button variant="light" size="sm" className="rounded-pill px-3" onClick={() => {setSelectedShift(s); setShowModal(true);}}>
                                                <FaEye className="me-1" /> Ver Detalle
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {shifts.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5 text-muted">No hay registros de turnos.</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>

                <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                    {selectedShift && (
                        <>
                            <Modal.Header closeButton className="border-0 bg-light">
                                <Modal.Title className="fw-bold">Detalle del Turno #{selectedShift.id}</Modal.Title>
                            </Modal.Header>
                            <Modal.Body className="p-4">
                                <Row className="mb-4 text-center">
                                    <Col>
                                        <div className="text-muted small">Cajero</div>
                                        <div className="fw-bold fs-5">{selectedShift.user.username}</div>
                                    </Col>
                                    <Col>
                                        <div className="text-muted small">Estado</div>
                                        <div>{getStatusBadge(selectedShift.status)}</div>
                                    </Col>
                                    <Col>
                                        <div className="text-muted small">Base Inicial</div>
                                        <div className="fw-bold text-primary">${selectedShift.initialCash?.toFixed(2)}</div>
                                    </Col>
                                </Row>

                                <Table bordered hover className="text-center shadow-sm rounded-3 overflow-hidden">
                                    <thead className="bg-dark text-white">
                                        <tr>
                                            <th>Método</th>
                                            <th>Esperado (Sistema)</th>
                                            <th>Reportado (Cajero)</th>
                                            <th>Diferencia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="text-start ps-3 fw-bold"><FaMoneyBillWave className="text-success me-2"/> Efectivo</td>
                                            <td>${selectedShift.expectedCash?.toFixed(2)}</td>
                                            <td>${selectedShift.reportedCash?.toFixed(2)}</td>
                                            <td>{calculateDifference(selectedShift.expectedCash, selectedShift.reportedCash)}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-start ps-3 fw-bold"><FaCreditCard className="text-info me-2"/> Tarjeta</td>
                                            <td>${selectedShift.expectedCard?.toFixed(2)}</td>
                                            <td>${selectedShift.reportedCard?.toFixed(2)}</td>
                                            <td>{calculateDifference(selectedShift.expectedCard, selectedShift.reportedCard)}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-start ps-3 fw-bold"><FaUniversity className="text-warning me-2"/> Transf.</td>
                                            <td>${selectedShift.expectedTransfer?.toFixed(2)}</td>
                                            <td>${selectedShift.reportedTransfer?.toFixed(2)}</td>
                                            <td>{calculateDifference(selectedShift.expectedTransfer, selectedShift.reportedTransfer)}</td>
                                        </tr>
                                        <tr className="bg-light fw-bold">
                                            <td className="text-start ps-3">📱 Pago Móvil</td>
                                            <td>${selectedShift.expectedMobile?.toFixed(2)}</td>
                                            <td>${selectedShift.reportedMobile?.toFixed(2)}</td>
                                            <td>{calculateDifference(selectedShift.expectedMobile, selectedShift.reportedMobile)}</td>
                                        </tr>
                                    </tbody>
                                </Table>

                                {selectedShift.observation && (
                                    <div className="mt-4 p-3 bg-light rounded-3 border">
                                        <div className="fw-bold small mb-1">Notas del Cajero:</div>
                                        <div className="italic text-muted">{selectedShift.observation}</div>
                                    </div>
                                )}

                                {selectedShift.status === 'CLOSED' && (
                                    <div className="mt-4 border-top pt-4">
                                        <h6 className="fw-bold mb-3">Verificación de Gerencia</h6>
                                        <Alert variant="info" className="py-2 small">Al verificar, confirmas que has auditado físicamente el dinero de este turno.</Alert>
                                        <Form.Group className="mb-3">
                                            <Form.Control as="textarea" rows={2} placeholder="Opcional: Nota de auditoría..." value={observation} onChange={e => setObservation(e.target.value)} />
                                        </Form.Group>
                                        <Button variant="primary" className="w-100 py-3 rounded-4 fw-bold" onClick={handleVerify}>
                                            <FaCheckCircle className="me-2" /> MARCAR COMO VERIFICADO Y CERRAR AUDITORÍA
                                        </Button>
                                    </div>
                                )}
                            </Modal.Body>
                        </>
                    )}
                </Modal>
            </div>
        </div>
    );
};

export default ShiftHistoryPage;
