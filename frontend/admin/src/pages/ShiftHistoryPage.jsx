import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Button, Modal, Row, Col, Alert, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaHistory, FaCheckCircle, FaExclamationTriangle, FaEye, FaCalculator, FaMoneyBillWave, FaCreditCard, FaUniversity } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import ShiftService from '../services/shift.service';
import PublicService from '../services/public.service';

const ShiftHistoryPage = () => {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedShift, setSelectedShift] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [observation, setObservation] = useState("");
    const [verifyError, setVerifyError] = useState("");
    const [error, setError] = useState("");
    const [platformConfig, setPlatformConfig] = useState(null);

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
        PublicService.getPlatformConfig().then(res => setPlatformConfig(res.data)).catch(err => console.error(err));
    }, []);

    const handleVerify = (hasIssues = false) => {
        setVerifyError("");
        if (hasIssues && !observation.trim()) {
            setVerifyError("Debe ingresar una nota de auditoría explicando el descuadre antes de continuar.");
            return;
        }
        ShiftService.verifyShift(selectedShift.id, observation, hasIssues).then(() => {
            fetchShifts();
            setShowModal(false);
            setVerifyError("");
        }).catch(err => {
            console.error(err);
            setVerifyError(err.response?.data?.message || "Error al verificar turno.");
        });
    };

    const getStatusBadge = (s) => {
        let badge;
        switch (s.status) {
            case 'OPEN': badge = <Badge bg="success">ABIERTO</Badge>; break;
            case 'CLOSED': badge = <Badge bg="warning" className="text-dark">POR VERIFICAR</Badge>; break;
            case 'VERIFIED': badge = <Badge bg="primary">VERIFICADO</Badge>; break;
            case 'VERIFIED_WITH_ISSUES': badge = <Badge bg="warning" text="dark">VERIFICADO (CON DESCUADRE)</Badge>; break;
            default: badge = <Badge bg="secondary">{s.status}</Badge>;
        }

        return (
            <div className="d-flex align-items-center gap-2 justify-content-center">
                {badge}
                {s.observation && (
                    <OverlayTrigger placement="top" overlay={<Tooltip>{s.observation}</Tooltip>}>
                        <div style={{cursor: 'help'}}><FaExclamationTriangle className="text-muted" size={14}/></div>
                    </OverlayTrigger>
                )}
            </div>
        );
    };

    const renderDifference = (s) => {
        if (s.status === 'OPEN') return <span className="text-muted">—</span>;
        
        const expected = s.expectedCash || 0;
        const reported = s.reportedCash || 0;
        const diff = reported - expected;
        
        if (diff === 0) return <span className="text-success small fw-bold"><FaCheckCircle className="me-1"/> Exacto</span>;
        if (diff < 0) return <span className="text-danger small fw-bold">{diff.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}</span>;
        return <span className="text-warning small fw-bold text-dark">+{diff.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}</span>;
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
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <Card className="shadow-sm border-0 rounded-4">
                    <Card.Body className="p-0">
                        <Table hover responsive className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">Usuario</th>
                                    <th>Caja</th>
                                    <th>Apertura</th>
                                    <th>Cierre</th>
                                    <th className="text-center">Descuadre Efectivo</th>
                                    <th className="text-center">Estado</th>
                                    <th className="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.map(s => (
                                    <tr key={s.id} className="align-middle table-row-hover" onClick={() => {setSelectedShift(s); setShowModal(true);}} style={{ cursor: 'pointer' }}>
                                        <td className="ps-4 fw-bold">{s.user.username}</td>
                                        <td>
                                            <span className="badge bg-light text-dark border fw-normal">{s.cashRegister?.name || '—'}</span>
                                        </td>
                                        <td>{new Date(s.startTime).toLocaleString()}</td>
                                        <td>{s.endTime ? new Date(s.endTime).toLocaleString() : '---'}</td>
                                        <td className="text-center align-middle">{renderDifference(s)}</td>
                                        <td className="text-center align-middle">{getStatusBadge(s)}</td>
                                        <td className="text-end pe-4" onClick={(e) => e.stopPropagation()}>
                                            <OverlayTrigger overlay={<Tooltip>Ver detalle del turno</Tooltip>}>
                                                <Button variant="light" size="sm" className="rounded-pill px-3" onClick={() => {setSelectedShift(s); setShowModal(true);}}>
                                                    <FaEye className="me-1" /> Ver Detalle
                                                </Button>
                                            </OverlayTrigger>
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

                <Modal scrollable show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
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
                                        <div className="text-muted small">Caja</div>
                                        <div className="fw-bold fs-5">{selectedShift.cashRegister?.name || '—'}</div>
                                    </Col>
                                    <Col>
                                        <div className="text-muted small">Estado</div>
                                        <div>{getStatusBadge(selectedShift)}</div>
                                    </Col>
                                    <Col>
                                        <div className="text-muted small">Base Inicial</div>
                                        <div className="fw-bold text-primary mb-1">{selectedShift.initialCash?.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}</div>
                                        {selectedShift.declarations?.filter(d => d.declarationType === 'OPENING').length > 0 && (
                                            <div className="small border-top pt-1 mt-1">
                                                {selectedShift.declarations.filter(d => d.declarationType === 'OPENING').map(d => (
                                                    <div key={d.id} className="text-muted d-flex justify-content-between px-2" style={{fontSize: '0.75rem'}}>
                                                        <span className="fw-bold">{d.currencyCode}</span>
                                                        <span>{parseFloat(d.declaredAmount).toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
                                            <td>
                                                {selectedShift.expectedCash?.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}
                                                {selectedShift.totalChangeGiven > 0 && (
                                                    <div className="text-danger small mt-1" style={{ fontSize: '0.75rem' }}>
                                                        (Incluye -{selectedShift.totalChangeGiven.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'} en Vueltos)
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="fw-bold">{selectedShift.reportedCash?.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}</div>
                                                {selectedShift.declarations?.filter(d => d.declarationType === 'CLOSING' && d.method === 'CASH').length > 0 && (
                                                    <div className="mt-1">
                                                        {selectedShift.declarations.filter(d => d.declarationType === 'CLOSING' && d.method === 'CASH').map(d => (
                                                            <div key={d.id} className="text-muted text-center" style={{fontSize: '0.75rem'}}>
                                                                <Badge bg="light" text="dark" className="me-1 border">{d.currencyCode}</Badge>
                                                                {parseFloat(d.declaredAmount).toLocaleString(undefined, {minimumFractionDigits:2})}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="align-middle">{calculateDifference(selectedShift.expectedCash, selectedShift.reportedCash)}</td>
                                        </tr>
                                        <tr>
                                            <td className="ps-3"><FaCreditCard className="text-info me-2" /> Tarjeta</td>
                                            <td>{selectedShift.expectedCard?.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}</td>
                                            <td>
                                                <div className="fw-bold">{selectedShift.reportedCard?.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}</div>
                                                {selectedShift.declarations?.filter(d => d.declarationType === 'CLOSING' && d.method === 'CARD').length > 0 && (
                                                    <div className="mt-1">
                                                        {selectedShift.declarations.filter(d => d.declarationType === 'CLOSING' && d.method === 'CARD').map(d => (
                                                            <div key={d.id} className="text-muted text-center" style={{fontSize: '0.75rem'}}>
                                                                <Badge bg="light" text="dark" className="me-1 border">{d.currencyCode}</Badge>
                                                                {parseFloat(d.declaredAmount).toLocaleString(undefined, {minimumFractionDigits:2})}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="align-middle">{calculateDifference(selectedShift.expectedCard, selectedShift.reportedCard)}</td>
                                        </tr>
                                        <tr>
                                            <td className="ps-3"><FaUniversity className="text-warning me-2" /> Transferencia</td>
                                            <td>{selectedShift.expectedTransfer?.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}</td>
                                            <td>
                                                <div className="fw-bold">{selectedShift.reportedTransfer?.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}</div>
                                                {selectedShift.declarations?.filter(d => d.declarationType === 'CLOSING' && d.method === 'TRANSFER').length > 0 && (
                                                    <div className="mt-1">
                                                        {selectedShift.declarations.filter(d => d.declarationType === 'CLOSING' && d.method === 'TRANSFER').map(d => (
                                                            <div key={d.id} className="text-muted text-center" style={{fontSize: '0.75rem'}}>
                                                                <Badge bg="light" text="dark" className="me-1 border">{d.currencyCode}</Badge>
                                                                {parseFloat(d.declaredAmount).toLocaleString(undefined, {minimumFractionDigits:2})}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="align-middle">{calculateDifference(selectedShift.expectedTransfer, selectedShift.reportedTransfer)}</td>
                                        </tr>
                                        <tr>
                                            <td className="ps-3">📱 Pago Móvil</td>
                                            <td>{selectedShift.expectedMobile?.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}</td>
                                            <td>
                                                <div className="fw-bold">{selectedShift.reportedMobile?.toFixed(2)} {platformConfig?.baseCurrencyCode || 'USD'}</div>
                                                {selectedShift.declarations?.filter(d => d.declarationType === 'CLOSING' && d.method === 'MOBILE_PAYMENT').length > 0 && (
                                                    <div className="mt-1">
                                                        {selectedShift.declarations.filter(d => d.declarationType === 'CLOSING' && d.method === 'MOBILE_PAYMENT').map(d => (
                                                            <div key={d.id} className="text-muted text-center" style={{fontSize: '0.75rem'}}>
                                                                <Badge bg="light" text="dark" className="me-1 border">{d.currencyCode}</Badge>
                                                                {parseFloat(d.declaredAmount).toLocaleString(undefined, {minimumFractionDigits:2})}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="align-middle">{calculateDifference(selectedShift.expectedMobile, selectedShift.reportedMobile)}</td>
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
                                        {verifyError && <Alert variant="danger" className="py-2 small fw-bold">{verifyError}</Alert>}
                                        <Form.Group className="mb-3">
                                            <Form.Control as="textarea" rows={2} placeholder="Opcional: Nota de auditoría..." value={observation} onChange={e => setObservation(e.target.value)} />
                                        </Form.Group>
                                        <Button variant="success" className="w-100 py-2 mb-2 rounded-4 fw-bold" onClick={() => handleVerify(false)}>
                                            <FaCheckCircle className="me-2" /> MARCAR COMO VERIFICADO (TODO CUADRA)
                                        </Button>
                                        <Button variant="warning" className="w-100 py-2 rounded-4 fw-bold text-dark" onClick={() => handleVerify(true)}>
                                            <FaExclamationTriangle className="me-2" /> REGISTRAR DESCUADRE (SOBRANTE/FALTANTE)
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
