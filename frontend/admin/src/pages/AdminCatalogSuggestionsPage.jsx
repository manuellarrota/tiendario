import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Badge, Row, Col, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import AdminService from '../services/admin.service';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import { useToast } from '../components/ToastContext';
import { FaCheck, FaTimes, FaImage, FaStore, FaBoxOpen, FaInfoCircle, FaCalendarAlt } from 'react-icons/fa';

const AdminCatalogSuggestionsPage = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);
    const toast = useToast();

    useEffect(() => {
        loadSuggestions();
    }, []);

    const loadSuggestions = () => {
        setLoading(true);
        AdminService.getCatalogSuggestions().then(
            (res) => {
                setSuggestions(res.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading suggestions", error);
                toast.showError("Error al cargar las sugerencias");
                setLoading(false);
            }
        );
    };

    const handleApprove = (id) => {
        setActionId(id);
        AdminService.approveCatalogSuggestion(id).then(
            () => {
                setSuggestions(suggestions.filter(s => s.id !== id));
                setActionId(null);
            },
            (error) => {
                console.error("Error approving suggestion", error);
                toast.showError("Error al aprobar la sugerencia.");
                setActionId(null);
            }
        );
    };

    const handleReject = (id) => {
        setActionId(id);
        AdminService.rejectCatalogSuggestion(id).then(
            () => {
                setSuggestions(suggestions.filter(s => s.id !== id));
                setActionId(null);
            },
            (error) => {
                console.error("Error rejecting suggestion", error);
                toast.showError("Error al rechazar la sugerencia.");
                setActionId(null);
            }
        );
    };

    const formatUrl = (url) => {
        if (!url) return 'https://via.placeholder.com/150?text=Sin+Imagen';
        return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}${url}`;
    };

    return (
        <Layout>
            <Container fluid className="py-4 px-md-5">
                <div className="d-flex flex-column mb-4">
                    <h2 className="fw-bold text-dark mb-1">
                        <FaImage className="text-primary me-2" /> Sugerencias de Catálogo
                    </h2>
                    <p className="text-muted small">
                        Modera los cambios de imágenes y descripciones propuestos por los dueños de tiendas.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="text-muted mt-2">Cargando sugerencias...</p>
                    </div>
                ) : suggestions.length === 0 ? (
                    <Alert variant="info" className="rounded-4 border-0 shadow-sm d-flex align-items-center p-4">
                        <FaInfoCircle className="me-3 fs-4" />
                        <div>
                            <div className="fw-bold">No hay sugerencias pendientes</div>
                            <div className="small">Todas las propuestas han sido revisadas.</div>
                        </div>
                    </Alert>
                ) : (
                    <div className="row g-4">
                        {suggestions.map((sug) => (
                            <div key={sug.id} className="col-12">
                                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                                    <Card.Header className="bg-white border-0 py-3 px-4">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="bg-light p-2 rounded-circle">
                                                    <FaStore className="text-primary" />
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-dark">{sug.companyName}</div>
                                                    <div className="text-muted smaller d-flex align-items-center gap-1">
                                                        <FaCalendarAlt size={10} /> {new Date(sug.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge bg="indigo-soft" className="text-indigo rounded-pill px-3">
                                                SKU: {sug.catalogProduct?.sku}
                                            </Badge>
                                        </div>
                                    </Card.Header>
                                    <Card.Body className="p-4 bg-light-soft">
                                        <Row className="g-4">
                                            <Col md={5}>
                                                <div className="p-3 bg-white rounded-4 h-100 border border-light">
                                                    <div className="text-xs font-bold text-uppercase text-muted mb-3 d-flex align-items-center gap-2">
                                                        <span className="p-1 bg-secondary rounded-circle"></span> Datos Actuales
                                                    </div>
                                                    <div className="text-center mb-3">
                                                        <img 
                                                            src={formatUrl(sug.catalogProduct?.imageUrl)}
                                                            alt="Current" 
                                                            className="img-fluid rounded-3 border bg-white"
                                                            style={{ height: '140px', width: '140px', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                    <div className="fw-bold text-dark text-center">{sug.catalogProduct?.name}</div>
                                                    <div className="text-muted smaller text-center mt-1">{sug.catalogProduct?.category?.name || 'Sin Categoría'}</div>
                                                </div>
                                            </Col>
                                            
                                            <Col md={2} className="d-flex align-items-center justify-content-center">
                                                <div className="bg-white p-2 rounded-circle shadow-sm border">
                                                    <FaBoxOpen className="text-indigo fs-4" />
                                                </div>
                                            </Col>

                                            <Col md={5}>
                                                <div className="p-3 bg-indigo-soft rounded-4 h-100 border border-indigo-subtle">
                                                    <div className="text-xs font-bold text-uppercase text-indigo mb-3 d-flex align-items-center gap-2">
                                                        <span className="p-1 bg-indigo rounded-circle"></span> Sugerencia Nueva
                                                    </div>
                                                    <div className="text-center mb-3">
                                                        <img 
                                                            src={formatUrl(sug.suggestedImageUrl)}
                                                            alt="Suggested" 
                                                            className="img-fluid rounded-3 border border-indigo-subtle shadow-sm bg-white"
                                                            style={{ height: '140px', width: '140px', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                    <div className="fw-bold text-indigo text-center">{sug.suggestedName}</div>
                                                    <div className="text-muted smaller text-center mt-1">Nombre propuesto por la tienda</div>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                    <Card.Footer className="bg-white border-0 py-3 px-4 d-flex justify-content-end gap-2">
                                        <OverlayTrigger overlay={<Tooltip>Rechazar Sugerencia</Tooltip>}>
                                            <Button 
                                                variant="outline-danger" 
                                                className="rounded-pill px-4" 
                                                onClick={() => handleReject(sug.id)}
                                                disabled={actionId === sug.id}
                                            >
                                                {actionId === sug.id ? <Spinner size="sm" animation="border" /> : <><FaTimes className="me-2" /> Rechazar</>}
                                            </Button>
                                        </OverlayTrigger>
                                        <OverlayTrigger overlay={<Tooltip>Aprobar y Actualizar Catálogo Global</Tooltip>}>
                                            <Button 
                                                variant="primary" 
                                                className="rounded-pill px-4 shadow-sm fw-bold" 
                                                onClick={() => handleApprove(sug.id)}
                                                disabled={actionId === sug.id}
                                            >
                                                {actionId === sug.id ? <Spinner size="sm" animation="border" /> : <><FaCheck className="me-2" /> Aprobar y Actualizar Catálogo</>}
                                            </Button>
                                        </OverlayTrigger>
                                    </Card.Footer>
                                </Card>
                            </div>
                        ))}
                    </div>
                )}
            </Container>

            <style>{`
                .bg-indigo-soft { background-color: rgba(79, 70, 229, 0.05); }
                .bg-light-soft { background-color: rgba(0, 0, 0, 0.02); }
                .text-indigo { color: #4f46e5; }
                .border-indigo-subtle { border-color: rgba(79, 70, 229, 0.2) !important; }
                .smaller { font-size: 0.75rem; }
                .text-xs { font-size: 0.65rem; }
            `}</style>
        </Layout>
    );
};

export default AdminCatalogSuggestionsPage;
