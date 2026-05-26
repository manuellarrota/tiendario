import React, { useState } from 'react';
import { Modal, Button, Form, Spinner, Row, Col, Alert, Badge, Table, ProgressBar } from 'react-bootstrap';
import { FaCloudUploadAlt, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaCog, FaFileExcel } from 'react-icons/fa';
import InventoryService from '../services/inventory.service';

const InventoryImportWizard = ({ show, onHide }) => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [fileId, setFileId] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Mapping is now strict based on the exact template format
    const fixedMappingInt = {
        sku: 0,
        name: 1,
        category: 2,
        variant: 3,
        price: 4,
        costPrice: 5,
        stock: 6,
        minStock: 7,
        description: 8
    };

    const [mode, setMode] = useState('ANEXAR');

    const [previewData, setPreviewData] = useState(null);

    const handleClose = () => {
        setStep(1);
        setFile(null);
        setFileId(null);
        setHeaders([]);
        setMode('ANEXAR');
        setPreviewData(null);
        setError(null);
        onHide();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const extractError = (err) => {
        if (err.response) {
            const status = err.response.status;
            const msg = err.response.data?.message
                || err.response.data?.error
                || (typeof err.response.data === 'string' ? err.response.data : null)
                || err.message;
            return `Error ${status}: ${msg}`;
        }
        if (err.request) return "No se recibió respuesta del servidor. Verifica tu conexión.";
        return err.message || "Error desconocido.";
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Por favor, selecciona un archivo Excel primero.");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const res = await InventoryService.uploadImportFile(file);
            setFileId(res.data.fileId);
            setHeaders(res.data.headers || []);
            setHeaders(res.data.headers || []);
            setStep(2); // Skip mapping, go straight to mode selection
        } catch (err) {
            setError(extractError(err));
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async () => {
        setError(null);
        setLoading(true);

        try {
            const res = await InventoryService.getImportPreview(fileId, fixedMappingInt, mode);
            setPreviewData(res.data);
            setStep(3); // Go to Preview Step
        } catch (err) {
            setError(extractError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        setError(null);
        setLoading(true);

        try {
            await InventoryService.executeImport(fileId, fixedMappingInt, mode);
            setStep(4); // Go to Success Step
        } catch (err) {
            setError(extractError(err));
        } finally {
            setLoading(false);
        }
    };

    const renderStepProgressBar = () => (
        <div className="mb-4">
            <ProgressBar now={(step / 4) * 100} variant="primary" style={{ height: '8px' }} />
            <div className="d-flex justify-content-between mt-2 text-muted small">
                <span className={step >= 1 ? 'fw-bold text-primary' : ''}>Subir</span>
                <span className={step >= 2 ? 'fw-bold text-primary' : ''}>Modo</span>
                <span className={step >= 3 ? 'fw-bold text-primary' : ''}>Preview</span>
                <span className={step >= 4 ? 'fw-bold text-primary' : ''}>Procesar</span>
            </div>
        </div>
    );

    return (
        <Modal show={show} onHide={step === 4 || loading ? null : handleClose} size="lg" backdrop="static" centered>
            <Modal.Header closeButton={step !== 4 && !loading}>
                <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                    <FaCloudUploadAlt className="text-primary" /> Importación Masiva de Inventario
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                {renderStepProgressBar()}

                {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                {step === 1 && (
                    <div className="text-center py-5">
                        <div className="mb-4 text-muted">
                            <FaFileExcel size={48} className="text-success mb-3" /><br/>
                            Sube tu archivo Excel (.xlsx o .xls) con tu inventario.
                        </div>
                        <input type="file" accept=".xlsx, .xls" className="form-control mb-3" onChange={handleFileChange} />
                        <Button onClick={handleUpload} disabled={!file || loading} className="px-4 py-2 rounded-pill shadow-sm">
                            {loading ? <Spinner size="sm" /> : "Analizar Archivo"}
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h5 className="mb-4">Modo de Importación</h5>
                        <p className="text-muted small">¿Qué deberíamos hacer con los productos que ya existen en tu sistema?</p>

                        <div className="d-flex flex-column gap-3 mb-4">
                            <label className={`border p-3 rounded cursor-pointer ${mode === 'ANEXAR' ? 'border-primary bg-primary bg-opacity-10' : ''}`} onClick={() => setMode('ANEXAR')}>
                                <div className="d-flex gap-2 align-items-center">
                                    <Form.Check type="radio" checked={mode === 'ANEXAR'} readOnly />
                                    <span className="fw-bold">Anexar Stock</span>
                                </div>
                                <p className="text-muted small ms-4 mb-0 mt-1">Suma el stock del Excel al stock existente. Actualiza el resto de la información (precios, nombre) si se proporcionan.</p>
                            </label>

                            <label className={`border p-3 rounded cursor-pointer ${mode === 'ACTUALIZAR' ? 'border-primary bg-primary bg-opacity-10' : ''}`} onClick={() => setMode('ACTUALIZAR')}>
                                <div className="d-flex gap-2 align-items-center">
                                    <Form.Check type="radio" checked={mode === 'ACTUALIZAR'} readOnly />
                                    <span className="fw-bold">Sobrescribir (Actualizar)</span>
                                </div>
                                <p className="text-muted small ms-4 mb-0 mt-1">Reemplaza el stock actual y demás campos mapeados con los valores exactos del Excel. Productos nuevos se crean.</p>
                            </label>

                            <label className={`border p-3 rounded cursor-pointer ${mode === 'SOLO_STOCK' ? 'border-primary bg-primary bg-opacity-10' : ''}`} onClick={() => setMode('SOLO_STOCK')}>
                                <div className="d-flex gap-2 align-items-center">
                                    <Form.Check type="radio" checked={mode === 'SOLO_STOCK'} readOnly />
                                    <span className="fw-bold">Actualizar Solo Stock</span>
                                </div>
                                <p className="text-muted small ms-4 mb-0 mt-1">Ignora nombres, precios o categorías. Solo ajusta el stock actual a lo que diga el Excel. Ignora SKUs que no existan.</p>
                            </label>
                        </div>

                        <div className="d-flex justify-content-between mt-4">
                            <Button variant="light" onClick={() => setStep(1)} disabled={loading}>Volver</Button>
                            <Button variant="primary" onClick={handlePreview} disabled={loading}>
                                {loading ? <Spinner size="sm" /> : "Generar Vista Previa"}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && previewData && (
                    <div>
                        <h5 className="mb-4">Resumen de Importación</h5>

                        <Row className="g-3 mb-4">
                            <Col sm={3}>
                                <div className="bg-light p-3 rounded text-center border">
                                    <h3 className="mb-0 text-primary">{previewData.totalRows}</h3>
                                    <small className="text-muted">Total Filas</small>
                                </div>
                            </Col>
                            <Col sm={3}>
                                <div className="bg-success bg-opacity-10 p-3 rounded text-center border border-success">
                                    <h3 className="mb-0 text-success">{previewData.newProducts}</h3>
                                    <small className="text-success">Nuevos</small>
                                </div>
                            </Col>
                            <Col sm={3}>
                                <div className="bg-warning bg-opacity-10 p-3 rounded text-center border border-warning">
                                    <h3 className="mb-0 text-warning">{previewData.modifiedProducts}</h3>
                                    <small className="text-warning">Modificados</small>
                                </div>
                            </Col>
                            <Col sm={3}>
                                <div className="bg-danger bg-opacity-10 p-3 rounded text-center border border-danger">
                                    <h3 className="mb-0 text-danger">{previewData.conflicts}</h3>
                                    <small className="text-danger">Errores/Ignorados</small>
                                </div>
                            </Col>
                        </Row>

                        {previewData.sampleConflicts && previewData.sampleConflicts.length > 0 && (
                            <Alert variant="danger" className="py-2 small">
                                <span className="fw-bold"><FaExclamationTriangle className="me-2" />Algunos problemas encontrados:</span>
                                <ul className="mb-0 mt-2">
                                    {previewData.sampleConflicts.map((c, i) => <li key={i}>{c.error}</li>)}
                                </ul>
                            </Alert>
                        )}

                        <div className="d-flex justify-content-between mt-4">
                            <Button variant="light" onClick={() => setStep(2)} disabled={loading}>Volver</Button>
                            <Button variant="primary" onClick={handleExecute} disabled={loading} className="px-4">
                                {loading ? <Spinner size="sm" /> : "Confirmar e Importar"}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="text-center py-5">
                        <FaCheckCircle size={64} className="text-success mb-3" />
                        <h4 className="fw-bold">¡Importación en Proceso!</h4>
                        <p className="text-muted">
                            El archivo se está procesando en segundo plano.<br/>
                            Los productos aparecerán en tu inventario pronto.
                        </p>
                        <Button variant="outline-secondary" className="mt-4 rounded-pill" onClick={handleClose}>
                            Cerrar Ventana
                        </Button>
                    </div>
                )}

            </Modal.Body>
        </Modal>
    );
};

export default InventoryImportWizard;
