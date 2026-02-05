import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import AuthService from '../services/auth.service';
import DashboardService from '../services/dashboard.service';
import CompanyService from '../services/company.service';
import PaymentService from '../services/payment.service';
import AdminService from '../services/admin.service';
import { FaRocket, FaGem, FaUsers, FaStore, FaChartLine, FaGlobe, FaReceipt, FaMoneyBillWave, FaClock, FaCheckCircle, FaTimesCircle, FaCog } from 'react-icons/fa';

const DashboardHome = () => {
    const user = AuthService.getCurrentUser();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingPayment, setProcessingPayment] = useState(false);

    const isSuperAdmin = user?.roles?.includes('ROLE_ADMIN');
    const isPremium = user?.subscriptionStatus === 'PAID' || user?.subscriptionStatus === 'TRIAL';
    const isBlocked = user?.subscriptionStatus === 'PAST_DUE' || user?.subscriptionStatus === 'SUSPENDED';

    useEffect(() => {
        setLoading(true);

        // If blocked, stop loading immediately to show the blocked UI, 
        // unless we want to try fetching anyway (backend might block).
        // Best UX: Don't fetch if valid session says we are blocked.
        if (!isSuperAdmin && isBlocked) {
            setLoading(false);
            return;
        }

        if (isSuperAdmin) {
            AdminService.getGlobalStats().then(
                (response) => {
                    setSummary(response.data);
                    setLoading(false);
                },
                (error) => {
                    console.error("Error loading admin stats", error);
                    setLoading(false);
                }
            );
        } else {
            DashboardService.getSummary().then(
                (response) => {
                    setSummary(response.data);
                    setLoading(false);
                },
                (error) => {
                    console.error("Error loading dashboard", error);
                    setLoading(false); // Stop loading even on error
                    if (error.response && error.response.status !== 403) {
                        setError("No se pudo cargar el resumen.");
                    }
                }
            );
        }
    }, [isSuperAdmin, isBlocked]);

    const handleSubscriptionChange = (type) => {
        if (type === 'upgrade') {
            setProcessingPayment(true);
            PaymentService.simulateSuccess().then(
                (res) => {
                    // Update local storage user object to reflect new status immediately
                    const updatedUser = { ...user, subscriptionStatus: 'PAID' };
                    localStorage.setItem("user", JSON.stringify(updatedUser));

                    // Force a small delay to show processing state then reload
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                },
                (err) => {
                    console.error("Payment simulation error:", err);
                    setError("Error procesando el pago. Intente nuevamente.");
                    setProcessingPayment(false);
                }
            );
        } else {
            // Downgrade logic remains creating a free plan
            CompanyService.downgradeSubscription().then(
                () => {
                    const updatedUser = { ...user, subscriptionStatus: 'FREE' };
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                    window.location.reload();
                },
                (err) => setError("Error al cambiar plan.")
            );
        }
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
                {isBlocked && !isSuperAdmin ? (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center p-5">
                        <div className="glass-card-admin p-5 border-0 shadow-lg rounded-5" style={{ maxWidth: '600px' }}>
                            <div className="mb-4" style={{ fontSize: '4rem' }}>⏳</div>
                            <h1 className="fw-bold mb-3 text-dark">Tu período de prueba ha vencido</h1>
                            <p className="text-secondary mb-4 lead">
                                Tu tienda se encuentra temporalmente suspendida por falta de pago.
                                Para continuar gestionando tu negocio y aparecer en el marketplace como tienda activa, por favor regulariza tu suscripción.
                            </p>
                            <div className="d-grid gap-3 d-sm-flex justify-content-center">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="rounded-pill px-5 py-3 shadow"
                                    onClick={() => handleSubscriptionChange('upgrade')}
                                    disabled={processingPayment}
                                >
                                    {processingPayment ? <><Spinner animation="border" size="sm" className="me-2" /> Procesando...</> : 'Regularizar Pago'}
                                </Button>
                            </div>
                            <small className="text-muted d-block mt-4">
                                Si ya realizaste el pago, espera unos minutos a que el administrador lo valide.
                            </small>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 mb-md-5 gap-3">
                            <div>
                                <h2 className="display-6 fw-bold mb-0 text-gradient">Panel de Control</h2>
                                <p className="text-secondary mb-0">Gestiona tu negocio en tiempo real.</p>
                            </div>
                            {!isPremium && !isSuperAdmin && (
                                <div className="premium-badge-v1 py-2 px-3 fw-bold">Plan Gratuito</div>
                            )}
                            {isSuperAdmin && (
                                <div className="premium-badge-v1 bg-dark text-white py-2 px-3 fw-bold">Super Admin</div>
                            )}
                        </div>

                        {error && <Alert variant="danger" className="border-0 shadow-sm rounded-4">{error}</Alert>}

                        {isSuperAdmin ? (
                            <Row className="g-4">
                                {/* Row 1: Users & Companies Growth */}
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0">
                                        <Card.Body className="d-flex flex-column justify-content-center p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Empresas</span>
                                            <h1 className="display-5 fw-bold text-dark mb-1">{summary?.totalCompanies || 0}</h1>
                                            <small className="text-muted fw-medium"><FaStore className="me-1" /> Tenants Registrados</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0">
                                        <Card.Body className="d-flex flex-column justify-content-center p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Usuarios</span>
                                            <h1 className="display-5 fw-bold text-primary mb-1">{summary?.totalUsers || 0}</h1>
                                            <small className="text-muted fw-medium"><FaUsers className="me-1" /> Totales</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0">
                                        <Card.Body className="d-flex flex-column justify-content-center p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">MRR Estimado</span>
                                            <h1 className="display-5 fw-bold text-success mb-1">${Number(summary?.mrr || 0).toLocaleString()}</h1>
                                            <small className="text-muted fw-medium"><FaMoneyBillWave className="me-1" /> Ingresos Recurrentes</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0">
                                        <Card.Body className="d-flex flex-column justify-content-center p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Tiendas Activas</span>
                                            <h1 className="display-5 fw-bold text-info mb-1">{summary?.activeShops || 0}</h1>
                                            <small className="text-muted fw-medium"><FaClock className="me-1" /> Últimos 30 días</small>
                                        </Card.Body>
                                    </Card>
                                </Col>

                                {/* Row 2: Sales & Performance */}
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0">
                                        <Card.Body className="d-flex flex-column justify-content-center p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">GMV Global</span>
                                            <h1 className="display-5 fw-bold text-success mb-1">${Number(summary?.globalGmv || 0).toLocaleString()}</h1>
                                            <small className="text-muted fw-medium"><FaGlobe className="me-1" /> Ventas Totales</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0">
                                        <Card.Body className="d-flex flex-column justify-content-center p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Pedidos Totales</span>
                                            <h1 className="display-5 fw-bold text-dark mb-1">{summary?.totalOrders || 0}</h1>
                                            <small className="text-muted fw-medium"><FaReceipt className="me-1" /> Transacciones</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0">
                                        <Card.Body className="d-flex flex-column justify-content-center p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Ticket Promedio</span>
                                            <h1 className="display-5 fw-bold text-warning mb-1">${Number(summary?.globalAov || 0).toLocaleString()}</h1>
                                            <small className="text-muted fw-medium"><FaChartLine className="me-1" /> Global AOV</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0">
                                        <Card.Body className="d-flex flex-column justify-content-center p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Suscripciones</span>
                                            <div className="d-flex align-items-center gap-3">
                                                <div>
                                                    <h3 className="mb-0 fw-bold">{summary?.paidPlanCount || 0}</h3>
                                                    <small className="text-success">Premium</small>
                                                </div>
                                                <div className="vr"></div>
                                                <div>
                                                    <h3 className="mb-0 fw-bold">{summary?.freePlanCount || 0}</h3>
                                                    <small className="text-secondary">Free</small>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        ) : (
                            <>
                                <Row className="g-4">
                                    {/* Primary Metric Grid */}
                                    <Col md={isPremium ? 3 : 6}>
                                        <Card className="glass-card-admin h-100 border-0">
                                            <Card.Body className="d-flex flex-column justify-content-center p-4">
                                                <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Inventario Total</span>
                                                <h1 className="display-4 fw-bold mb-1 text-dark">{summary?.totalProducts || 0}</h1>
                                                <small className="text-muted fw-medium">Productos Activos</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    {isPremium ? (
                                        <>
                                            <Col md={3}>
                                                <Card className="glass-card-admin h-100 border-0">
                                                    <Card.Body className="d-flex flex-column justify-content-center p-4">
                                                        <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Ventas Hoy</span>
                                                        <h1 className="display-4 fw-bold text-primary mb-1">${Number(summary?.revenueToday || 0).toLocaleString()}</h1>
                                                        <small className="text-muted fw-medium">{summary?.salesCountToday || 0} transacciones</small>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                            <Col md={3}>
                                                <Card className="glass-card-admin h-100 border-0">
                                                    <Card.Body className="d-flex flex-column justify-content-center p-4">
                                                        <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Rendimiento</span>
                                                        <h1 className="display-4 fw-bold text-info mb-1">{Number(summary?.averageMargin || 0).toFixed(2)}%</h1>
                                                        <small className="text-muted fw-medium">Margen Promedio</small>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                            <Col md={3}>
                                                <Card className="glass-card-admin h-100 border-0">
                                                    <Card.Body className="d-flex flex-column justify-content-center p-4">
                                                        <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Alertas Stock</span>
                                                        <h1 className="display-4 fw-bold text-danger mb-1">{summary?.lowStockCount || 0}</h1>
                                                        <small className="text-muted fw-medium">Críticos por agotar</small>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        </>
                                    ) : (
                                        <Col md={6}>
                                            <Card className="border-0 shadow-lg h-100 overflow-hidden" style={{ borderRadius: '24px', background: 'var(--primary-gradient)' }}>
                                                <Card.Body className="d-flex flex-column align-items-center justify-content-center p-5 text-white text-center">
                                                    <div className="mb-3" style={{ fontSize: '2.5rem' }}>🎯</div>
                                                    <h3 className="text-white mb-2 fw-bold">Analítica Premium</h3>
                                                    <p className="text-white opacity-75 mb-4">Calculamos tus márgenes y tendencias en tiempo real para que vendas más.</p>
                                                    <button
                                                        className="btn btn-light rounded-pill px-5 py-2 fw-bold text-primary shadow"
                                                        onClick={() => handleSubscriptionChange('upgrade')}
                                                        disabled={processingPayment}
                                                    >
                                                        {processingPayment ? <><Spinner animation="border" size="sm" className="me-2" /> Actualizando...</> : <><FaGem className="me-2" /> Actualizar Ahora</>}
                                                    </button>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    )}
                                </Row>

                                <Row className="g-4 mt-1">
                                    <Col lg={3} md={6}>
                                        <Card className="glass-card-admin h-100 border-0">
                                            <Card.Body className="d-flex align-items-center p-3">
                                                <div className="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                                                    <FaClock className="text-warning h4 mb-0" />
                                                </div>
                                                <div>
                                                    <h3 className="mb-0 fw-bold">{summary?.pendingOrders || 0}</h3>
                                                    <small className="text-muted">Pendientes</small>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col lg={3} md={6}>
                                        <Card className="glass-card-admin h-100 border-0">
                                            <Card.Body className="d-flex align-items-center p-3">
                                                <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3">
                                                    <FaCog className="text-info h4 mb-0" />
                                                </div>
                                                <div>
                                                    <h3 className="mb-0 fw-bold">{summary?.processingOrders || 0}</h3>
                                                    <small className="text-muted">Procesando</small>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col lg={3} md={6}>
                                        <Card className="glass-card-admin h-100 border-0">
                                            <Card.Body className="d-flex align-items-center p-3">
                                                <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                                                    <FaCheckCircle className="text-success h4 mb-0" />
                                                </div>
                                                <div>
                                                    <h3 className="mb-0 fw-bold">{summary?.completedOrders || 0}</h3>
                                                    <small className="text-muted">Completadas</small>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col lg={3} md={6}>
                                        <Card className="glass-card-admin h-100 border-0">
                                            <Card.Body className="d-flex align-items-center p-3">
                                                <div className="rounded-circle bg-danger bg-opacity-10 p-3 me-3">
                                                    <FaTimesCircle className="text-danger h4 mb-0" />
                                                </div>
                                                <div>
                                                    <h3 className="mb-0 fw-bold">{summary?.cancelledOrders || 0}</h3>
                                                    <small className="text-muted">Canceladas</small>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </>
                        )}

                        {!isSuperAdmin && isPremium && (
                            <div className="mt-5 text-center">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="rounded-pill px-4 opacity-50"
                                    onClick={() => handleSubscriptionChange('downgrade')}
                                >
                                    Simular Regreso a Plan Gratis (Solo Pruebas)
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DashboardHome;
