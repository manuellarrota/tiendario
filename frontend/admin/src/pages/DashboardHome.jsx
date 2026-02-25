import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button, Badge, Modal, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
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
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '20.00',
        paymentMethod: 'Pago Móvil / Transferencia',
        reference: '',
        notes: ''
    });
    const [paymentStatus, setPaymentStatus] = useState({ loading: false, success: false, error: '' });

    const isSuperAdmin = user?.roles?.includes('ROLE_ADMIN');
    const isPremium = user?.subscriptionStatus === 'PAID' || user?.subscriptionStatus === 'TRIAL';

    // Calculate days remaining for trial
    const getDaysRemaining = () => {
        if (!summary?.subscriptionEndDate) return 0;
        const end = new Date(summary.subscriptionEndDate);
        const now = new Date();
        const diff = end - now;
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const daysLeft = getDaysRemaining();
    const isTrial = user?.subscriptionStatus === 'TRIAL';
    const isTrialExpired = isTrial && daysLeft <= 0;

    const isBlocked = user?.subscriptionStatus === 'PAST_DUE' || user?.subscriptionStatus === 'SUSPENDED' || isTrialExpired;

    useEffect(() => {
        loadData();

        // 30 Seconds Polling for live updates
        const interval = setInterval(() => {
            loadData(true); // silent refresh
        }, 30000);

        return () => clearInterval(interval);
    }, [isSuperAdmin, isBlocked]);

    const loadData = (silent = false) => {
        if (!silent) setLoading(true);

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
                    setLoading(false);
                    if (error.response && error.response.status !== 403) {
                        setError("No se pudo cargar el resumen.");
                    }
                }
            );
        }
    };

    const handleSubscriptionChange = (type) => {
        if (type === 'upgrade' || type === 'trial') {
            setProcessingPayment(true);
            PaymentService.simulateSuccess().then(
                (res) => {
                    const nextStatus = type === 'trial' ? 'TRIAL' : 'PAID';
                    const updatedUser = { ...user, subscriptionStatus: nextStatus };
                    localStorage.setItem("user", JSON.stringify(updatedUser)); // Immediate feedback

                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                },
                (err) => {
                    console.error("Payment simulation error:", err);
                    setError("Error procesando la solicitud. Intente nuevamente.");
                    setProcessingPayment(false);
                }
            );
        } else if (type === 'manual') {
            setShowPaymentModal(true);
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

    const handleManualPaymentSubmit = (e) => {
        e.preventDefault();
        setPaymentStatus({ loading: true, success: false, error: '' });

        PaymentService.submitPayment(paymentForm).then(
            (res) => {
                setPaymentStatus({ loading: false, success: true, error: '' });
                setTimeout(() => {
                    setShowPaymentModal(false);
                    setPaymentStatus({ loading: false, success: false, error: '' });
                }, 3000);
            },
            (err) => {
                setPaymentStatus({ loading: false, success: false, error: err.response?.data?.message || 'Error al enviar el comprobante' });
            }
        );
    };

    const renderTooltip = (props, text) => (
        <Tooltip id={`tooltip-${Math.random()}`} {...props}>
            {text}
        </Tooltip>
    );

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
        <Layout isSuperAdmin={isSuperAdmin} isBlocked={isBlocked}>
            <Container fluid className="p-0">
                {isBlocked && !isSuperAdmin ? (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center p-5">
                        <div className="glass-card-admin p-5 border-0 shadow-lg rounded-5" style={{ maxWidth: '600px' }}>
                            <div className="mb-4" style={{ fontSize: '4rem' }}>{isTrialExpired ? '⌛' : '⏳'}</div>
                            <h1 className="fw-bold mb-3 text-dark">{isTrialExpired ? 'Tu período de prueba ha finalizado' : 'Tu cuenta está suspendida'}</h1>
                            <p className="text-secondary mb-4 lead">
                                {isTrialExpired
                                    ? 'Esperamos que hayas disfrutado de las herramientas Pro. Para continuar gestionando tu inventario y ventas, por favor elige un plan.'
                                    : 'Tu tienda se encuentra temporalmente suspendida por falta de pago. Para continuar gestionando tu negocio, por favor regulariza tu suscripción.'}
                            </p>
                            <div className="d-grid gap-3 d-sm-flex justify-content-center">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="rounded-pill px-5 py-3 shadow"
                                    onClick={() => {
                                        const pricingSection = document.getElementById('pricing-section');
                                        if (pricingSection) pricingSection.scrollIntoView({ behavior: 'smooth' });
                                        else handleSubscriptionChange('upgrade');
                                    }}
                                    disabled={processingPayment}
                                >
                                    {processingPayment ? <><Spinner animation="border" size="sm" className="me-2" /> Procesando...</> : 'Elegir Plan / Regularizar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {isTrial && !isTrialExpired && (
                            <Alert variant="info" className="border-0 shadow-sm rounded-4 mb-4 d-flex align-items-center justify-content-between p-3" style={{ background: 'linear-gradient(90deg, #eef2ff 0%, #f5f3ff 100%)', color: '#4338ca', borderLeft: '5px solid #6366f1 !important' }}>
                                <div className="d-flex align-items-center">
                                    <div className="bg-white p-2 rounded-3 me-3 shadow-sm" style={{ fontSize: '1.2rem' }}>🚀</div>
                                    <div>
                                        <h6 className="mb-0 fw-bold">¡Modo Prueba Activo! Acceso Pro Ilimitado</h6>
                                        <small className="opacity-75">Te quedan <strong>{daysLeft} días</strong> para transformar tu negocio. ¡Usa todas las funciones sin límites!</small>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <OverlayTrigger placement="bottom" overlay={(props) => renderTooltip(props, "Informa un pago realizado por transferencia o depósito para activar tu plan.")}>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            className="rounded-pill px-3 fw-bold border-2"
                                            onClick={() => handleSubscriptionChange('manual')}
                                        >
                                            Informar Pago
                                        </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger placement="bottom" overlay={(props) => renderTooltip(props, "Mira nuestros planes y elige el que mejor se adapte a tu negocio.")}>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            className="rounded-pill px-4 fw-bold shadow-sm"
                                            onClick={() => {
                                                const pricingSection = document.getElementById('pricing-section');
                                                if (pricingSection) pricingSection.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                        >
                                            Suscribirme Ahora
                                        </Button>
                                    </OverlayTrigger>
                                </div>
                            </Alert>
                        )}
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
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-primary">
                                        <Card.Body className="p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Empresas Totales</span>
                                            <h1 className="display-5 fw-bold text-dark mb-1">{summary?.totalCompanies || 0}</h1>
                                            <div className="d-flex align-items-center gap-2">
                                                <Badge bg="success" className="rounded-pill px-2 py-1">
                                                    {summary?.conversionRate || 0}% de Pago
                                                </Badge>
                                                <small className="text-muted fw-medium">Tasa Conversión</small>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-info">
                                        <Card.Body className="p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Tiendas Activas</span>
                                            <h1 className="display-5 fw-bold text-info mb-1">{summary?.activeShops || 0}</h1>
                                            <small className="text-muted fw-medium"><FaClock className="me-1" /> Últimos 30 días</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-success">
                                        <Card.Body className="p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Ingresos (MRR)</span>
                                            <h1 className="display-5 fw-bold text-success mb-1">${Number(summary?.mrr || 0).toLocaleString()}</h1>
                                            <small className="text-muted fw-medium"><FaMoneyBillWave className="me-1" /> Recurrencia Mensual</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={3} md={6}>
                                    <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-danger">
                                        <Card.Body className="p-4">
                                            <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Alertas Churn</span>
                                            <h1 className="display-5 fw-bold text-danger mb-1">{summary?.churnedShops || 0}</h1>
                                            <small className="text-muted fw-medium">Tiendas inactivas (15d)</small>
                                        </Card.Body>
                                    </Card>
                                </Col>

                                <Col lg={4} md={6}>
                                    <Card className="glass-card-admin h-100 border-0 shadow-sm">
                                        <Card.Body className="p-4 text-center">
                                            <div className="rounded-circle bg-success bg-opacity-10 p-3 mx-auto mb-3" style={{ width: 'fit-content' }}>
                                                <FaGlobe className="text-success h3 mb-0" />
                                            </div>
                                            <h5 className="fw-bold mb-1">GMV Global Platform</h5>
                                            <h2 className="fw-bold text-dark">${Number(summary?.globalGmv || 0).toLocaleString()}</h2>
                                            <p className="text-muted small">Monto total transaccionado</p>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={4} md={6}>
                                    <Card className="glass-card-admin h-100 border-0 shadow-sm">
                                        <Card.Body className="p-4 text-center">
                                            <div className="rounded-circle bg-warning bg-opacity-10 p-3 mx-auto mb-3" style={{ width: 'fit-content' }}>
                                                <FaChartLine className="text-warning h3 mb-0" />
                                            </div>
                                            <h5 className="fw-bold mb-1">Ticket Promedio (Global)</h5>
                                            <h2 className="fw-bold text-dark">${Number(summary?.globalAov || 0).toLocaleString()}</h2>
                                            <p className="text-muted small">Promedio por pedido</p>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={4} md={12}>
                                    <Card className="glass-card-admin h-100 border-0 shadow-sm">
                                        <Card.Body className="p-4">
                                            <h6 className="fw-bold mb-4">Mezcla de Suscripciones</h6>
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span>Planes Premium</span>
                                                <span className="fw-bold">{summary?.paidPlanCount || 0}</span>
                                            </div>
                                            <div className="progress mb-4" style={{ height: '8px' }}>
                                                <div className="progress-bar bg-success" style={{ width: `${(summary?.paidPlanCount / summary?.totalCompanies) * 100}%` }}></div>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span>Planes Gratuitos</span>
                                                <span className="fw-bold">{summary?.freePlanCount || 0}</span>
                                            </div>
                                            <div className="progress" style={{ height: '8px' }}>
                                                <div className="progress-bar bg-secondary" style={{ width: `${(summary?.freePlanCount / summary?.totalCompanies) * 100}%` }}></div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        ) : (
                            <>
                                <Row className="g-4">
                                    <Col lg={3} md={6}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-dark">
                                            <Card.Body className="p-4">
                                                <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Inventario Total</span>
                                                <h1 className="display-5 fw-bold text-dark mb-1">{summary?.totalProducts || 0}</h1>
                                                <small className="text-muted">Productos Disponibles</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={3} md={6}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-primary">
                                            <Card.Body className="p-4">
                                                <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Ventas Hoy</span>
                                                <h1 className="display-5 fw-bold text-primary mb-1">${Number(summary?.revenueToday || 0).toLocaleString()}</h1>
                                                <div className="d-flex align-items-center gap-2">
                                                    {summary?.revenueGrowth >= 0 ? (
                                                        <span className="text-success small fw-bold">↑ {summary?.revenueGrowth}%</span>
                                                    ) : (
                                                        <span className="text-danger small fw-bold">↓ {Math.abs(summary?.revenueGrowth)}%</span>
                                                    )}
                                                    <small className="text-muted">vs ayer (${Number(summary?.revenueYesterday || 0).toLocaleString()})</small>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={3} md={6}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-warning">
                                            <Card.Body className="p-4">
                                                <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Ticket Promedio</span>
                                                <h1 className="display-5 fw-bold text-warning mb-1">${Number(summary?.shopAov || 0).toLocaleString()}</h1>
                                                <small className="text-muted">Promedio por Venta</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={3} md={6}>
                                        <Card className={`glass-card-admin h-100 border-0 shadow-sm border-start border-4 ${summary?.lowStockCount > 0 ? 'border-danger' : 'border-success'}`}>
                                            <Card.Body className="p-4">
                                                <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Semáforo de Stock</span>
                                                <h1 className={`display-5 fw-bold mb-1 ${summary?.lowStockCount > 0 ? 'text-danger' : 'text-success'}`}>
                                                    {summary?.lowStockCount || 0}
                                                </h1>
                                                <small className={`${summary?.lowStockCount > 0 ? 'text-danger' : 'text-muted'} fw-medium`}>
                                                    {summary?.lowStockCount > 0 ? '¡Atención! Stock Crítico' : 'Stock saludable'}
                                                </small>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={4} md={12}>
                                        <Card className="glass-card-admin border-0 shadow-sm rounded-4 h-100">
                                            <Card.Header className="bg-white border-0 py-3 px-4">
                                                <h6 className="fw-bold mb-0">Estado de los Pedidos</h6>
                                            </Card.Header>
                                            <Card.Body className="px-4 pb-4">
                                                <div className="d-flex flex-column gap-3">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="text-muted"><FaClock className="me-2" /> Recibidos (Pendientes)</span>
                                                        <Badge bg="warning" text="dark" className="rounded-pill">{summary?.pendingOrders || 0}</Badge>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="text-muted"><FaCog className="me-2" /> En Preparación</span>
                                                        <Badge bg="primary" className="rounded-pill">{summary?.preparingOrders || 0}</Badge>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="text-muted"><FaReceipt className="me-2" /> Listos para Recoger</span>
                                                        <Badge bg="info" className="rounded-pill">{summary?.readyOrders || 0}</Badge>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="text-danger"><FaTimesCircle className="me-2" /> Cancelados</span>
                                                        <Badge bg="danger" className="rounded-pill">{summary?.cancelledOrders || 0}</Badge>
                                                    </div>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={4} md={6}>
                                        <Card className="glass-card-admin border-0 shadow-sm rounded-4 h-100 bg-primary bg-opacity-10">
                                            <Card.Body className="p-4 d-flex flex-column align-items-center justify-content-center text-center">
                                                <div className="rounded-circle bg-primary p-3 mb-3 text-white shadow-sm">
                                                    <FaRocket style={{ fontSize: '1.5rem' }} />
                                                </div>
                                                <h6 className="text-primary text-uppercase fw-bold small mb-2">Producto Estrella</h6>
                                                <h4 className="fw-bold text-dark mb-1">{summary?.topProductName || "Sin ventas"}</h4>
                                                {summary?.topProductQty && (
                                                    <p className="text-primary fw-bold mb-0">{summary.topProductQty} unidades vendidas</p>
                                                )}
                                                <p className="text-muted small mt-2 mb-0">¡El preferido de tus clientes!</p>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={4} md={6}>
                                        <Card className="glass-card-admin border-0 shadow-sm rounded-4 h-100">
                                            <Card.Header className="bg-white border-0 py-3 px-4">
                                                <h6 className="fw-bold mb-0">Canales de Pago</h6>
                                            </Card.Header>
                                            <Card.Body className="px-4 pb-4">
                                                {summary?.paymentMethods ? (
                                                    Object.entries(summary.paymentMethods).map(([method, count], idx) => (
                                                        <div key={idx} className="mb-3">
                                                            <div className="d-flex justify-content-between small mb-1">
                                                                <span className="text-muted">{method === 'CASH' ? 'Efectivo' : method === 'CARD' ? 'Tarjeta' : method === 'TRANSFER' ? 'Transferencia' : method}</span>
                                                                <span className="fw-bold">{count}</span>
                                                            </div>
                                                            <div className="progress" style={{ height: '5px' }}>
                                                                <div
                                                                    className="progress-bar rounded-pill"
                                                                    role="progressbar"
                                                                    style={{ width: `${summary.totalOrdersCount > 0 ? (count / summary.totalOrdersCount) * 100 : 10}%`, background: 'var(--primary-gradient)' }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-muted text-center py-4">Esperando datos...</p>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>

                                {!isPremium && (
                                    <div className="mt-5" id="pricing-section">
                                        <div className="text-center mb-5">
                                            <h2 className="fw-bold text-dark">Lleva tu negocio al siguiente nivel</h2>
                                            <p className="text-secondary lead">Elige el plan que mejor se adapte a tu crecimiento o empieza hoy mismo sin costo.</p>
                                            <Button
                                                variant="link"
                                                className="text-primary fw-bold text-decoration-none p-0 mt-2"
                                                onClick={() => handleSubscriptionChange('trial')}
                                                disabled={processingPayment}
                                            >
                                                {processingPayment ? <Spinner animation="border" size="sm" /> : '🚀 Iniciar prueba gratuita de 15 días'}
                                            </Button>
                                        </div>
                                        <Row className="justify-content-center g-4">
                                            <Col lg={4} md={6}>
                                                <Card className="border-0 shadow-sm rounded-5 h-100 glass-card-admin hover-lift">
                                                    <Card.Body className="p-5 d-flex flex-column text-center">
                                                        <div className="mb-3"><Badge bg="secondary" className="rounded-pill px-3 py-2 text-uppercase letter-spacing-1 small">Flexibilidad</Badge></div>
                                                        <h3 className="fw-bold mb-2">Mensual</h3>
                                                        <div className="mb-4">
                                                            <span className="display-4 fw-bold">$20</span>
                                                            <span className="text-muted">/mes</span>
                                                        </div>
                                                        <ul className="list-unstyled text-start mb-5 flex-grow-1">
                                                            <li className="mb-3"><FaCheckCircle className="text-success me-2" /> Punto de Venta (POS) ilimitado</li>
                                                            <li className="mb-3"><FaCheckCircle className="text-success me-2" /> Inventario en la nube</li>
                                                            <li className="mb-3"><FaCheckCircle className="text-success me-2" /> KPIs y Analítica de Ventas</li>
                                                            <li className="mb-3"><FaCheckCircle className="text-success me-2" /> Visibilidad en Marketplace</li>
                                                        </ul>
                                                        <Button
                                                            variant="outline-primary"
                                                            size="lg"
                                                            className="rounded-pill py-3 fw-bold"
                                                            onClick={() => handleSubscriptionChange('upgrade')}
                                                            disabled={processingPayment}
                                                        >
                                                            Inscribirme ahora
                                                        </Button>
                                                    </Card.Body>
                                                </Card>
                                            </Col>

                                            <Col lg={4} md={6}>
                                                <Card className="border-0 shadow-lg rounded-5 h-100 position-relative overflow-hidden" style={{ background: 'var(--primary-gradient)' }}>
                                                    <div className="position-absolute rotate-45 bg-warning text-dark fw-bold text-center py-2 shadow-sm" style={{ top: '25px', right: '-45px', width: '200px', fontSize: '0.8rem' }}>
                                                        ¡MÁS POPULAR!
                                                    </div>
                                                    <Card.Body className="p-5 d-flex flex-column text-center text-white">
                                                        <div className="mb-3"><Badge bg="light" className="text-primary rounded-pill px-3 py-2 text-uppercase letter-spacing-1 small">Máximo Ahorro</Badge></div>
                                                        <h3 className="fw-bold mb-2">Anual</h3>
                                                        <div className="mb-4">
                                                            <span className="display-4 fw-bold">$200</span>
                                                            <span className="opacity-75">/año</span>
                                                            <div className="badge bg-white bg-opacity-25 rounded-pill mt-2 d-inline-block px-3 py-1">
                                                                ¡Ahorra $40 (2 Meses Gratis)!
                                                            </div>
                                                        </div>
                                                        <ul className="list-unstyled text-start mb-5 flex-grow-1 opacity-90">
                                                            <li className="mb-3"><FaCheckCircle className="text-white me-2" /> <strong>Todo el Plan Pro</strong></li>
                                                            <li className="mb-3"><FaCheckCircle className="text-white me-2" /> Reportes VIP de Rentabilidad</li>
                                                            <li className="mb-3"><FaCheckCircle className="text-white me-2" /> Soporte prioritario 24/7</li>
                                                            <li className="mb-3"><FaCheckCircle className="text-white me-2" /> Sin interrupciones por factura</li>
                                                        </ul>
                                                        <Button
                                                            variant="light"
                                                            size="lg"
                                                            className="rounded-pill py-3 fw-bold text-primary shadow-lg border-0"
                                                            onClick={() => handleSubscriptionChange('upgrade')}
                                                            disabled={processingPayment}
                                                        >
                                                            {processingPayment ? <Spinner animation="border" size="sm" /> : 'Activar Plan Anual'}
                                                        </Button>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        </Row>
                                    </div>
                                )}
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


                {/* Manual Payment Modal */}
                <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered className="rounded-4 overflow-hidden">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold">Informar Pago de Suscripción</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        {paymentStatus.success ? (
                            <div className="text-center py-4">
                                <div className="display-4 text-success mb-3">✅</div>
                                <h5 className="fw-bold">¡Comprobante Enviado!</h5>
                                <p className="text-secondary small">Nuestro equipo validará tu pago en un plazo de 1 a 24 horas hábiles. Recibirás una notificación.</p>
                                <Button variant="primary" className="rounded-pill px-5 mt-3" onClick={() => setShowPaymentModal(false)}>Cerrar</Button>
                            </div>
                        ) : (
                            <Form onSubmit={handleManualPaymentSubmit}>
                                <p className="text-secondary small mb-4">Ingresa los detalles de tu transferencia o pago móvil para activar tu plan Pro de forma permanente.</p>

                                {paymentStatus.error && <Alert variant="danger" className="py-2 small">{paymentStatus.error}</Alert>}

                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Monto Pagado ($)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.01"
                                        className="py-2 rounded-3"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Método de Pago</Form.Label>
                                    <Form.Select
                                        className="py-2 rounded-3"
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                    >
                                        <option>Pago Móvil / Transferencia</option>
                                        <option>Zelle / PayPal</option>
                                        <option>Binance / Crypto</option>
                                        <option>Efectivo (Local)</option>
                                    </Form.Select>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Número de Referencia</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ultimos 4 o 6 dígitos"
                                        className="py-2 rounded-3"
                                        value={paymentForm.reference}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold">Notas adicionales (Opcional)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        className="rounded-3"
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    />
                                </Form.Group>
                                <div className="d-grid">
                                    <Button variant="primary" type="submit" className="py-2 fw-bold shadow-sm rounded-pill" disabled={paymentStatus.loading}>
                                        {paymentStatus.loading ? <><Spinner animation="border" size="sm" className="me-2" /> Enviando...</> : 'Enviar Comprobante'}
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Modal.Body>
                </Modal>
            </Container >
        </Layout >
    );
};

// Simple Layout wrapper for consistency
const Layout = ({ children, isSuperAdmin, isBlocked }) => (
    <div className="d-flex admin-layout">
        <Sidebar />
        <main className="flex-grow-1 p-3 p-md-4 pt-5 pt-md-4 mt-4 mt-md-0" style={{ background: '#f8fafc', minHeight: '100vh', overflowX: 'hidden' }}>
            {children}
        </main>
    </div>
);

export default DashboardHome;
