import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button, Badge, Modal, Form, OverlayTrigger, Tooltip, Table } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import AuthService from '../services/auth.service';
import DashboardService from '../services/dashboard.service';
import CompanyService from '../services/company.service';
import PaymentService from '../services/payment.service';
import AdminService from '../services/admin.service';
import PublicService from '../services/public.service';
import { Link, useNavigate } from 'react-router-dom';
import { FaRocket, FaGem, FaUsers, FaStore, FaChartLine, FaGlobe, FaReceipt, FaMoneyBillWave, FaClock, FaCheckCircle, FaTimesCircle, FaCog, FaBox, FaCashRegister, FaChevronRight, FaInfoCircle } from 'react-icons/fa';

const DashboardHome = () => {
    const navigate = useNavigate();
    const user = AuthService.getCurrentUser();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingPayment, setProcessingPayment] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '0.00',
        paymentMethod: '',
        reference: '',
        notes: '',
        billingCycle: 'MONTHLY',
        targetPlan: 'BASIC',
        banco: '',
        cedula: '',
        nombreTitular: '',
        correoTelefono: '',
        ordenId: ''
    });
    const [paymentStatus, setPaymentStatus] = useState({ loading: false, success: false, error: '' });
    
    // Extra Registers
    const [showExtraModal, setShowExtraModal] = useState(false);
    const [extraForm, setExtraForm] = useState({ requested: 1, paymentMethod: '', reference: '', banco: '', cedula: '', nombreTitular: '', correoTelefono: '', ordenId: '' });
    const [extraStatus, setExtraStatus] = useState({ loading: false, success: false, error: '' });

    const [chartData, setChartData] = useState([]);
    const [chartPeriod, setChartPeriod] = useState('weekly');
    const [chartLoading, setChartLoading] = useState(false);
    
    // Config global
    const [platformConfig, setPlatformConfig] = useState(null);
    const baseCurrencyCode = platformConfig?.baseCurrencyCode || '';

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
    // Only determine trial expiration if summary has been loaded
    const isTrialExpired = isTrial && summary && daysLeft <= 0;

    const isBlocked = user?.subscriptionStatus === 'PAST_DUE' || user?.subscriptionStatus === 'SUSPENDED' || isTrialExpired;

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
                    setError(error.translatedMessage || "No se pudo cargar el resumen.");
                }
            );
        }
    };

    const loadChart = (period) => {
        if (isSuperAdmin || isBlocked) return;
        setChartLoading(true);
        DashboardService.getSalesChart(period).then(
            (response) => {
                setChartData(response.data);
                setChartLoading(false);
            },
            (error) => {
                console.error("Error loading chart", error);
                setChartLoading(false);
            }
        );
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuperAdmin, isBlocked]);

    useEffect(() => {
        PublicService.getPlatformConfig().then(
            (response) => setPlatformConfig(response.data),
            (err) => console.error("Error loading config", err)
        );
    }, []);

    useEffect(() => {
        if (!isSuperAdmin && !isBlocked) {
            loadChart(chartPeriod);
        }
    }, [chartPeriod, isSuperAdmin, isBlocked]);

    useEffect(() => {
        if (!isSuperAdmin && !isBlocked) {
            loadChart(chartPeriod);
        }
    }, [chartPeriod, isSuperAdmin, isBlocked]);

    const calculateAmount = (cycle, plan) => {
        const effectivePlan = plan || paymentForm?.targetPlan || summary?.subscriptionPlan || 'BASIC';
        let basePrice = 0;
        if (effectivePlan === 'BASIC') basePrice = cycle === 'MONTHLY' ? (platformConfig?.basicPlanMonthlyPrice || 19.99) : ((platformConfig?.basicPlanMonthlyPrice || 19.99) * 10);
        else if (effectivePlan === 'MEDIUM') basePrice = cycle === 'MONTHLY' ? (platformConfig?.mediumPlanMonthlyPrice || 29.99) : ((platformConfig?.mediumPlanMonthlyPrice || 29.99) * 10);
        else if (effectivePlan === 'PREMIUM') basePrice = cycle === 'MONTHLY' ? (platformConfig?.premiumPlanMonthlyPrice || 49.99) : ((platformConfig?.premiumPlanMonthlyPrice || 49.99) * 10);
        else basePrice = cycle === 'MONTHLY' ? (platformConfig?.basicPlanMonthlyPrice || 19.99) : ((platformConfig?.basicPlanMonthlyPrice || 19.99) * 10);

        // Extra Registers monthly cost
        const extraPrice = platformConfig?.extraRegisterMonthlyPrice || 5.00;
        const extras = (summary?.billedExtraRegisters || 0) * (cycle === 'MONTHLY' ? extraPrice : extraPrice * 10);
        const eBilling = summary?.hasElectronicBilling ? (cycle === 'MONTHLY' ? 10 : 100) : 0;

        return (basePrice + extras + eBilling).toFixed(2);
    };

    const handleSubscriptionChange = (type) => {
        if (type === 'upgrade' || type === 'trial') {
            setProcessingPayment(true);
            PaymentService.simulateSuccess().then(
                () => {
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
            const currentPlan = summary?.subscriptionPlan || 'BASIC';
            setPaymentForm({ ...paymentForm, targetPlan: currentPlan, amount: calculateAmount('MONTHLY', currentPlan), billingCycle: 'MONTHLY' });
            setShowPaymentModal(true);
        }
    };

    const handleManualPaymentSubmit = (e) => {
        e.preventDefault();
        setPaymentStatus({ loading: true, success: false, error: '' });

        const payload = {
            ...paymentForm,
            amount: parseFloat(paymentForm.amount),
            paymentType: (summary?.billedExtraRegisters > 0) ? 'SUBSCRIPTION_AND_REGISTERS' : 'SUBSCRIPTION'
        };

        PaymentService.submitPayment(payload).then(
            () => {
                setPaymentStatus({ loading: false, success: true, error: '' });
                loadData(true);
            },
            (err) => {
                setPaymentStatus({ loading: false, success: false, error: err.response?.data?.message || 'Error al enviar el comprobante' });
            }
        );
    };

    const buildReference = () => {
        const method = extraForm.paymentMethod;
        if (method === 'PAGO_MOVIL') return `Banco: ${extraForm.banco} | Cédula: ${extraForm.cedula} | Ref: ${extraForm.reference}`;
        if (method === 'ZELLE') return `Titular: ${extraForm.nombreTitular} | Contacto: ${extraForm.correoTelefono}`;
        if (method === 'BINANCE') return `Orden ID: ${extraForm.ordenId} | Titular: ${extraForm.nombreTitular}`;
        if (method === 'TRANSFERENCIA') return `Ref: ${extraForm.reference}`;
        return 'Efectivo';
    };

    const handleExtraRegisterSubmit = (e) => {
        e.preventDefault();
        setExtraStatus({ loading: true, success: false, error: '' });
        
        const requested = parseInt(extraForm.requested) || 0;
        
        try {
            if (requested > 0) {
                const extraPrice = platformConfig?.extraRegisterMonthlyPrice || 5.00;
                
                const payload = {
                    amount: requested * extraPrice,
                    paymentMethod: extraForm.paymentMethod,
                    reference: buildReference(),
                    notes: '',
                    paymentType: 'EXTRA_REGISTER',
                    requestedExtraRegisters: requested
                };
                
                PaymentService.submitPayment(payload).then(
                    () => {
                        setExtraStatus({ loading: false, success: true, error: '' });
                        loadData(true);
                    },
                    (err) => {
                        setExtraStatus({ loading: false, success: false, error: err.response?.data?.message || 'Error al procesar pago de cajas' });
                    }
                );
            }
        } catch (error) {
            setExtraStatus({ loading: false, success: false, error: 'Error al solicitar cajas' });
        }
    };

    const renderTooltip = (props, text) => (
        <Tooltip id={`tooltip-${text?.toString().replace(/\s+/g, '-').toLowerCase()}`} {...props}>
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
                            {user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN') ? (
                                <div className="d-grid gap-3 d-sm-flex justify-content-center">
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="rounded-pill px-5 py-3 shadow"
                                        onClick={() => handleSubscriptionChange('manual')}
                                    >
                                        {processingPayment ? <><Spinner animation="border" size="sm" className="me-2" /> Procesando...</> : 'Suscribirme / Informar Pago'}
                                    </Button>
                                </div>
                            ) : (
                                <Alert variant="warning" className="border-0 shadow-sm rounded-4">
                                    <strong>Aviso:</strong> Por favor contacta al administrador o dueño de la tienda para reactivar el sistema.
                                </Alert>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {isTrial && !isTrialExpired && (user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN')) && (
                            <Alert variant="info" className="border-0 shadow-sm rounded-4 mb-4 d-flex align-items-center justify-content-between p-3" style={{ background: 'linear-gradient(90deg, #eef2ff 0%, #f5f3ff 100%)', color: '#4338ca', borderLeft: '5px solid #6366f1 !important' }}>
                                <div className="d-flex align-items-center">
                                    <div className="bg-white p-2 rounded-3 me-3 shadow-sm" style={{ fontSize: '1.2rem' }}>🚀</div>
                                    <div>
                                        <h6 className="mb-0 fw-bold">¡Modo Prueba Activo! Acceso Pro Ilimitado</h6>
                                        <small className="opacity-75">Te quedan <strong>{daysLeft} días</strong> para transformar tu negocio. ¡Usa todas las funciones sin límites!</small>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <OverlayTrigger placement="bottom" overlay={(props) => renderTooltip(props, "Informa tu pago para activar tu suscripción Pro o elige tu plan ideal.")}>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            className="rounded-pill px-4 fw-bold shadow-sm"
                                            onClick={() => handleSubscriptionChange('manual')}
                                        >
                                            Suscribirme / Informar Pago
                                        </Button>
                                    </OverlayTrigger>
                                </div>
                            </Alert>
                        )}
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 mb-md-5 gap-3">
                            <div>
                                <h2 className="display-6 fw-bold mb-0 text-gradient reveal-up">Panel de Control</h2>
                                <p className="text-secondary mb-0 reveal-up delay-1">Gestiona tu negocio en tiempo real.</p>
                            </div>
                            {!isPremium && !isSuperAdmin && (
                                <div className="premium-badge-v1 py-2 px-3 fw-bold">Periodo de Prueba</div>
                            )}
                            {isSuperAdmin && (
                                <div className="premium-badge-v1 bg-dark text-white py-2 px-3 fw-bold">Super Admin</div>
                            )}
                        </div>

                        {error && <Alert variant="danger" className="border-0 shadow-sm rounded-4">{error}</Alert>}

                        {isSuperAdmin ? (
                            <Row className="g-4">
                                <Col lg={3} md={6}>
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Cantidad total de empresas registradas en la plataforma, incluyendo todos los planes.")}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-primary" style={{ cursor: 'help' }}>
                                            <Card.Body className="p-4">
                                                <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Empresas Totales</span>
                                                <h1 className="display-5 fw-bold text-dark mb-1 text-nowrap">{Number(summary?.totalCompanies || 0).toLocaleString()}</h1>
                                                <OverlayTrigger placement="bottom" overlay={(props) => renderTooltip(props, "Porcentaje de todas las tiendas registradas que actualmente pagan una membresía Premium.")}>
                                                    <div className="d-flex align-items-center gap-2" style={{ cursor: 'help' }}>
                                                        <Badge bg="success" className="rounded-pill px-2 py-1">
                                                            {summary?.conversionRate || 0}% de Pago
                                                        </Badge>
                                                        <small className="text-muted fw-medium">Tasa Conversión</small>
                                                    </div>
                                                </OverlayTrigger>
                                            </Card.Body>
                                        </Card>
                                    </OverlayTrigger>
                                </Col>
                                <Col lg={3} md={6}>
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Número de tiendas que han registrado al menos una venta en los últimos 30 días.")}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-info" style={{ cursor: 'help' }}>
                                            <Card.Body className="p-4">
                                                <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Tiendas Activas</span>
                                                <h1 className="display-5 fw-bold text-info mb-1 text-nowrap">{Number(summary?.activeShops || 0).toLocaleString()}</h1>
                                                <small className="text-muted fw-medium"><FaClock className="me-1" /> Últimos 30 días con ventas</small>
                                            </Card.Body>
                                        </Card>
                                    </OverlayTrigger>
                                </Col>
                                <Col lg={3} md={6}>
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Monthly Recurring Revenue: Ingresos mensuales estimados basados en las suscripciones activas.")}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-success" style={{ cursor: 'help' }}>
                                            <Card.Body className="p-4">
                                                <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Ingresos (MRR)</span>
                                                <h1 className="display-5 fw-bold text-success mb-1 text-nowrap">{Number(summary?.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}</h1>
                                                <small className="text-muted fw-medium"><FaMoneyBillWave className="me-1" /> Recurrencia Mensual</small>
                                            </Card.Body>
                                        </Card>
                                    </OverlayTrigger>
                                </Col>
                                <Col lg={3} md={6}>
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Tiendas en riesgo de abandono. Incluye empresas que no han registrado ventas en los últimos 15 días.")}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-danger" style={{ cursor: 'help' }}>
                                            <Card.Body className="p-4">
                                                <span className="text-secondary small text-uppercase fw-bold mb-3 d-block letter-spacing-1">Alertas Churn</span>
                                                <h1 className="display-5 fw-bold text-danger mb-1 text-nowrap">{Number(summary?.churnedShops || 0).toLocaleString()}</h1>
                                                <small className="text-muted fw-medium">Tiendas inactivas (+15d)</small>
                                            </Card.Body>
                                        </Card>
                                    </OverlayTrigger>
                                </Col>

                                <Col lg={4} md={6}>
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Gross Merchandise Value: Volumen total de dinero procesado por todas las tiendas de la red.")}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm" style={{ cursor: 'help' }}>
                                            <Card.Body className="p-4 text-center">
                                                <div className="rounded-circle bg-success bg-opacity-10 p-3 mx-auto mb-3" style={{ width: 'fit-content' }}>
                                                    <FaGlobe className="text-success h3 mb-0" />
                                                </div>
                                                <h5 className="fw-bold mb-1">Volumen Global de la Plataforma</h5>
                                                <h2 className="fw-bold text-dark text-nowrap">{Number(summary?.globalGmv || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}</h2>
                                                <p className="text-muted small">Monto total transaccionado</p>
                                            </Card.Body>
                                        </Card>
                                    </OverlayTrigger>
                                </Col>
                                <Col lg={4} md={6}>
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Average Order Value: Valor promedio de los pedidos en toda la plataforma.")}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm" style={{ cursor: 'help' }}>
                                            <Card.Body className="p-4 text-center">
                                                <div className="rounded-circle bg-warning bg-opacity-10 p-3 mx-auto mb-3" style={{ width: 'fit-content' }}>
                                                    <FaChartLine className="text-warning h3 mb-0" />
                                                </div>
                                                <h5 className="fw-bold mb-1">Valor Promedio por Pedido (Global)</h5>
                                                <h2 className="fw-bold text-dark text-nowrap">{Number(summary?.globalAov || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}</h2>
                                                <p className="text-muted small">Promedio por pedido</p>
                                            </Card.Body>
                                        </Card>
                                    </OverlayTrigger>
                                </Col>
                                <Col lg={4} md={12}>
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Distribución de los planes de suscripción (Premium vs. Gratuitos) entre todas las empresas.")}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm" style={{ cursor: 'help' }}>
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-4">Mezcla de Suscripciones</h6>
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <span>Planes Premium</span>
                                                    <span className="fw-bold">{Number(summary?.paidPlanCount || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="progress mb-4" style={{ height: '8px' }}>
                                                    <div className="progress-bar bg-success" style={{ width: `${(summary?.paidPlanCount / (summary?.totalCompanies || 1)) * 100}%` }}></div>
                                                </div>
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <span>En Periodo de Prueba</span>
                                                    <span className="fw-bold">{Number(summary?.trialPlanCount || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="progress" style={{ height: '8px' }}>
                                                    <div className="progress-bar bg-warning" style={{ width: `${(summary?.trialPlanCount / (summary?.totalCompanies || 1)) * 100}%` }}></div>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </OverlayTrigger>
                                </Col>
                            </Row>
                        ) : (user?.roles?.includes('ROLE_MANAGER') || user?.roles?.includes('ROLE_ADMIN')) ? (
                            <>
                                {user?.subscriptionStatus === 'PAID' && (
                                    <Row className="g-4 mb-4 reveal-up delay-1">
                                        <Col lg={12}>
                                            <Card className="glass-card-admin border-0 shadow-sm rounded-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                                                <Card.Body className="p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                                                            <FaCashRegister className="text-primary h4 mb-0" />
                                                        </div>
                                                        <div>
                                                            <h6 className="fw-bold mb-1 text-dark">Cajas Habilitadas</h6>
                                                            <p className="text-secondary small mb-0">
                                                                Tienes <strong>{summary?.extraRegisters || 0}</strong> caja(s) habilitada(s) actualmente.
                                                                {summary?.nextCycleExtraRegisters != null && (
                                                                    <><br/><span className="text-danger">Has solicitado reducir a <strong>{summary.nextCycleExtraRegisters}</strong> caja(s) para el próximo ciclo.</span></>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        variant="primary" 
                                                        className="rounded-pill shadow-sm px-4 fw-bold"
                                                        onClick={() => {
                                                            setExtraForm({ requested: 1, paymentMethod: '', reference: '', banco: '', cedula: '', nombreTitular: '', correoTelefono: '', ordenId: '' });
                                                            setExtraStatus({ loading: false, success: false, error: '' });
                                                            setShowExtraModal(true);
                                                        }}
                                                    >
                                                        + Solicitar Caja Extra ({(platformConfig?.extraRegisterMonthlyPrice || 5.00).toFixed(2)} {baseCurrencyCode}/mes)
                                                    </Button>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                )}

                                <Row className="g-4 reveal-up delay-2">
                                    <Col lg={3} md={6}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-dark">
                                            <Card.Body className="p-4">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Cantidad total de productos únicos que tienes registrados en tu inventario.")}>
                                                        <span className="text-secondary small text-uppercase fw-bold letter-spacing-1 cursor-help">Inventario Total</span>
                                                    </OverlayTrigger>
                                                    <FaBox className="text-dark opacity-50" />
                                                </div>
                                                <h3 className="fw-bold mb-1 text-dark text-nowrap">{Number(summary?.totalProducts || 0).toLocaleString()}</h3>
                                                <small className="text-muted">Productos Disponibles</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={3} md={6}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-primary">
                                            <Card.Body className="p-4">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Monto neto de ventas realizadas el día de hoy comparado con el cierre de ayer.")}>
                                                        <span className="text-secondary small text-uppercase fw-bold letter-spacing-1 cursor-help">Ventas Hoy</span>
                                                    </OverlayTrigger>
                                                    <FaMoneyBillWave className="text-primary opacity-50" />
                                                </div>
                                                <h3 className="fw-bold mb-1 text-primary text-nowrap">{Number(summary?.revenueToday || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}</h3>
                                                    <div className="d-flex align-items-center gap-2">
                                                        {summary?.revenueGrowth >= 0 ? (
                                                            <span className="text-success small fw-bold">↑ {summary?.revenueGrowth}%</span>
                                                        ) : (
                                                            <span className="text-danger small fw-bold">↓ {Math.abs(summary?.revenueGrowth)}%</span>
                                                        )}
                                                        <small className="text-muted">vs ayer ({Number(summary?.revenueYesterday || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode})</small>
                                                    </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={3} md={6}>
                                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-warning">
                                            <Card.Body className="p-4">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Average Order Value: Valor promedio de tus ventas hoy.")}>
                                                        <span className="text-secondary small text-uppercase fw-bold letter-spacing-1 cursor-help">Ticket Promedio</span>
                                                    </OverlayTrigger>
                                                    <FaChartLine className="text-warning opacity-50" />
                                                </div>
                                                <h3 className="fw-bold mb-1 text-warning text-nowrap">{Number(summary?.shopAov || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}</h3>
                                                    <small className="text-muted">Promedio por Venta</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={3} md={6}>
                                        <Card className={`glass-card-admin h-100 border-0 shadow-sm border-start border-4 ${summary?.lowStockCount > 0 ? 'border-danger' : 'border-success'}`}>
                                            <Card.Body className="p-4">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Estado de alerta de tu inventario. Indica cuántos productos están por debajo del stock mínimo.")}>
                                                        <span className="text-secondary small text-uppercase fw-bold letter-spacing-1 cursor-help">Semáforo de Stock</span>
                                                    </OverlayTrigger>
                                                    <FaRocket className={`${summary?.lowStockCount > 0 ? 'text-danger' : 'text-success'} opacity-50`} />
                                                </div>
                                                <h3 className={`fw-bold mb-1 text-nowrap ${summary?.lowStockCount > 0 ? 'text-danger' : 'text-success'}`}>
                                                    {Number(summary?.lowStockCount || 0).toLocaleString()}
                                                </h3>
                                                <small className={`${summary?.lowStockCount > 0 ? 'text-danger' : 'text-muted'} fw-medium`}>
                                                    {summary?.lowStockCount > 0 ? '¡Atención! Stock Crítico' : 'Stock saludable'}
                                                </small>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    {/* Sales Performance Chart Section */}
                                    {!isSuperAdmin && (
                                        <Col lg={12} className="reveal-up delay-3">
                                            <Card className="glass-card-admin border-0 shadow-sm rounded-4 mb-4">
                                                <Card.Body className="p-4">
                                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                                                        <div>
                                                            <h5 className="fw-bold mb-1 text-dark">Rendimiento de Ventas</h5>
                                                            <p className="text-secondary small mb-0">Visualiza tus ingresos históricos por periodo.</p>
                                                        </div>
                                                        <div className="d-flex bg-light p-1 rounded-pill">
                                                            {['weekly', 'monthly', 'annual'].map((p) => (
                                                                <Button 
                                                                    key={p}
                                                                    size="sm"
                                                                    variant={chartPeriod === p ? "white" : "link"}
                                                                    className={`rounded-pill px-3 border-0 ${chartPeriod === p ? 'shadow-sm fw-bold text-primary' : 'text-secondary text-decoration-none'}`}
                                                                    onClick={() => setChartPeriod(p)}
                                                                >
                                                                    {p === 'weekly' ? 'Semanal' : p === 'monthly' ? 'Mensual' : 'Anual'}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {chartLoading ? (
                                                        <div className="d-flex align-items-center justify-content-center py-5" style={{ height: '200px' }}>
                                                            <Spinner animation="grow" variant="primary" size="sm" />
                                                        </div>
                                                    ) : (
                                                        <div className="d-flex align-items-end gap-2 mt-4" style={{ height: '220px', overflowX: 'auto', paddingBottom: '20px' }}>
                                                            {chartData.map((d, i) => {
                                                                const maxValue = Math.max(...chartData.map(item => item.value), 1);
                                                                const heightPercent = (d.value / maxValue) * 100;
                                                                return (
                                                                    <div key={i} className="d-flex flex-column align-items-center flex-grow-1 h-100 min-width-50">
                                                                        <div className="flex-grow-1 d-flex flex-column justify-content-end align-items-center w-100 px-1">
                                                                            <span className="fw-bold text-primary mb-1" style={{ fontSize: '0.65rem', whiteSpace: 'nowrap', opacity: d.value > 0 ? 0.8 : 0 }}>
                                                                                {d.value >= 1000 ? (d.value / 1000).toFixed(1) + 'k' : Number(d.value).toLocaleString()} {baseCurrencyCode}
                                                                            </span>
                                                                            <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, `${d.label}: ${Number(d.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${baseCurrencyCode}`)}>
                                                                                <div 
                                                                                    className="w-100 rounded-top-3 transition-all chart-bar-gradient"
                                                                                    style={{ 
                                                                                        height: `${Math.max(heightPercent, 2)}%`,
                                                                                        opacity: i === chartData.length - 1 ? 1 : 0.7,
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                />
                                                                            </OverlayTrigger>
                                                                        </div>
                                                                        <span className="text-muted mt-2 fw-bold" style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>{d.label}</span>
                                                                    </div>
                                                                );
                                                            })}

                                                            {chartData.length === 0 && (
                                                                <div className="w-100 text-center py-5 opacity-25">
                                                                    <FaChartLine size={40} className="mb-2" />
                                                                    <p className="small mb-0">No hay datos suficientes para este periodo</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    )}

                                    <Col lg={4} md={12} className="reveal-up delay-3">
                                        <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Resumen del flujo de tus pedidos actuales desde que se reciben hasta que se entregan.")}>
                                            <Card className="glass-card-admin border-0 shadow-sm rounded-4 h-100" style={{ cursor: 'help' }}>
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
                                        </OverlayTrigger>
                                    </Col>

                                    <Col lg={4} md={6}>
                                        <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "El producto que más ha generado ventas en tu tienda recientemente.")}>
                                            <Card className="glass-card-admin border-0 shadow-sm rounded-4 h-100 bg-primary bg-opacity-10 reveal-up delay-4" style={{ cursor: 'help' }}>
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
                                        </OverlayTrigger>
                                    </Col>

                                    <Col lg={4} md={6}>
                                        <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, "Distribución de los métodos de pago utilizados por tus clientes.")}>
                                            <Card className="glass-card-admin border-0 shadow-sm rounded-4 h-100" style={{ cursor: 'help' }}>
                                                <Card.Header className="bg-white border-0 py-3 px-4">
                                                    <h6 className="fw-bold mb-0">Canales de Pago</h6>
                                                </Card.Header>
                                                <Card.Body className="px-4 pb-4">
                                                    {summary?.paymentMethods ? (
                                                        Object.entries(summary.paymentMethods).map(([method, count], idx) => (
                                                            <div key={idx} className="mb-3">
                                                                <div className="d-flex justify-content-between small mb-1">
                                                                    <span className="text-muted">
                                                                        {method === 'CASH' ? '💵 Efectivo' :
                                                                         method === 'CARD' ? '💳 Tarjeta' :
                                                                         method === 'TRANSFER' ? '🏦 Transferencia' :
                                                                         method === 'MOBILE_PAYMENT' ? '📱 Pago Móvil' :
                                                                         method === 'MIXED' ? '🔀 Mixto' : method}
                                                                    </span>
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
                                        </OverlayTrigger>
                                    </Col>
                                </Row>

                                {/* Recent Sales Table Section */}
                                {!isSuperAdmin && (
                                    <div className="reveal-up delay-4 mt-4">
                                        <Card className="glass-card-admin border-0 shadow-sm rounded-4">
                                            <Card.Body className="p-4">
                                                <div className="d-flex justify-content-between align-items-center mb-4">
                                                    <h5 className="fw-bold mb-0 text-dark">Últimas Ventas</h5>
                                                    <Button variant="link" size="sm" className="text-primary text-decoration-none fw-bold" onClick={() => window.location.href='/sales-history'}>Ver todas</Button>
                                                </div>
                                                <div className="table-responsive">
                                                    <Table borderless hover className="align-middle mb-0">
                                                        <thead className="bg-light bg-opacity-50 text-secondary small">
                                                            <tr>
                                                                <th className="rounded-start-3 px-3">ORDEN ID</th>
                                                                <th>CLIENTE</th>
                                                                <th>MÉTODO</th>
                                                                <th>ESTADO</th>
                                                                <th className="text-end rounded-end-3 px-3">MONTO</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="small">
                                                            {summary?.recentSales && summary.recentSales.length > 0 ? (
                                                                summary.recentSales.map((sale) => (
                                                                    <tr key={sale.id} className="border-bottom border-light">
                                                                        <td className="px-3"><span className="fw-bold text-dark">#{sale.id.toString().slice(-6)}</span></td>
                                                                        <td>
                                                                            <div className="fw-bold text-dark">{sale.customerName || 'Cliente General'}</div>
                                                                            <small className="text-muted">{new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                                        </td>
                                                                        <td>
                                                                            <Badge bg="light" text="dark" className="rounded-pill px-2 py-1">
                                                                                {sale.paymentMethod === 'CASH' ? '💵 Efectivo' : sale.paymentMethod === 'CARD' ? '💳 Tarjeta' : sale.paymentMethod === 'TRANSFER' ? '🏦 Transf' : sale.paymentMethod === 'MOBILE_PAYMENT' ? '📱 P. Móvil' : sale.paymentMethod === 'MIXED' ? '🔀 Mixto' : '—'}
                                                                            </Badge>
                                                                        </td>
                                                                        <td>
                                                                            <Badge bg={sale.status === 'PAID' ? 'success' : 'warning'} className="rounded-pill px-2 py-1">
                                                                                {sale.status === 'PAID' ? 'Completado' : 'Pendiente'}
                                                                            </Badge>
                                                                        </td>
                                                                        <td className="text-end px-3">
                                                                            <div className="fw-bold text-primary">{Number(sale.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}</div>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan="5" className="text-center py-4 text-muted">Aún no hay ventas registradas</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </div>
                                )}


                            </>
                        ) : (
                            <Row className="g-4 reveal-up delay-2 justify-content-center">
                                <Col lg={8} className="text-center mt-4">
                                    <div className="glass-card-admin p-5 rounded-4 shadow-sm border-0 mb-4">
                                        <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex p-4 mb-4 shadow-sm">
                                            <FaCashRegister size={40} />
                                        </div>
                                        <h2 className="fw-bold text-dark mb-3">¡Hola, {user?.username}! 👋</h2>
                                        <p className="text-secondary lead mb-5">Listo para tu turno de hoy. Administra tus ventas o abre la caja registradora.</p>
                                        
                                        <Row className="justify-content-center mb-5 g-4">
                                            <Col md={5}>
                                                <div className="bg-white p-4 rounded-4 shadow-sm border border-light h-100 d-flex flex-column justify-content-center hover-lift">
                                                    <div className="text-muted small fw-bold text-uppercase mb-2 letter-spacing-1">Tus Ventas Hoy</div>
                                                    <h2 className="text-primary fw-bold mb-0">{Number(summary?.revenueToday || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrencyCode}</h2>
                                                </div>
                                            </Col>
                                            <Col md={5}>
                                                <div className="bg-white p-4 rounded-4 shadow-sm border border-light h-100 d-flex flex-column justify-content-center hover-lift">
                                                    <div className="text-muted small fw-bold text-uppercase mb-2 letter-spacing-1">Tickets Procesados</div>
                                                    <h2 className="text-dark fw-bold mb-0">{summary?.salesCountToday || 0}</h2>
                                                </div>
                                            </Col>
                                        </Row>
                                        
                                        <Button as={Link} to="/pos" variant="primary" size="lg" className="rounded-pill px-5 py-3 fw-bold shadow-lg d-inline-flex align-items-center justify-content-center">
                                            Abrir Punto de Venta <FaChevronRight className="ms-2" />
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        )}

                        {!isSuperAdmin && isPremium && (
                            <div className="mt-5 text-center opacity-25">
                                <small className="text-muted">Nugar SaaS - Versión Enterprise</small>
                            </div>
                        )}
                    </>
                )}


                {/* Manual Payment Modal */}
                <Modal scrollable show={showPaymentModal} onHide={() => { setShowPaymentModal(false); setPaymentStatus({ loading: false, success: false, error: '' }); }} centered className="rounded-4 overflow-hidden">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold">Informar Pago de Suscripción</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        {paymentStatus.success ? (
                            <div className="text-center py-4">
                                <div className="display-4 text-success mb-3">✅</div>
                                <h5 className="fw-bold">¡Comprobante Enviado!</h5>
                                <p className="text-secondary small">Nuestro equipo validará tu pago en un plazo de 1 a 24 horas hábiles. Recibirás una notificación.</p>
                                <Button variant="primary" className="rounded-pill px-5 mt-3" onClick={() => { setShowPaymentModal(false); setPaymentStatus({ loading: false, success: false, error: '' }); }}>Cerrar</Button>
                            </div>
                        ) : (
                            <Form onSubmit={handleManualPaymentSubmit}>
                                <p className="text-secondary small mb-4">Ingresa los detalles de tu transferencia o pago móvil para activar tu plan Pro de forma permanente.</p>

                                <Alert variant="info" className="border-0 shadow-sm rounded-3">
                                    <h6 className="fw-bold"><FaInfoCircle className="me-2" /> Datos de Pago:</h6>
                                    <ul className="mb-0 small">
                                        {platformConfig?.paymentZelleEnabled !== false && platformConfig?.paymentInfoZelle && (
                                            <li><strong>Zelle:</strong> {platformConfig.paymentInfoZelle}</li>
                                        )}
                                        {platformConfig?.paymentBinanceEnabled !== false && platformConfig?.paymentInfoBinance && (
                                            <li><strong>Binance:</strong> {platformConfig.paymentInfoBinance}</li>
                                        )}
                                        {platformConfig?.paymentPagoMovilEnabled !== false && platformConfig?.paymentInfoPagoMovil && (
                                            <li><strong>Pago Móvil:</strong> {platformConfig.paymentInfoPagoMovil}</li>
                                        )}
                                        {platformConfig?.paymentTransferenciaEnabled !== false && platformConfig?.paymentInfoTransferencia && (
                                            <li><strong>Transferencia:</strong> {platformConfig.paymentInfoTransferencia}</li>
                                        )}
                                    </ul>
                                </Alert>

                                {paymentStatus.error && <Alert variant="danger" className="py-2 small">{paymentStatus.error}</Alert>}

                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Plan a Contratar / Renovar</Form.Label>
                                    <Form.Select
                                        className="py-2 rounded-3"
                                        value={paymentForm.targetPlan}
                                        onChange={(e) => {
                                            const newPlan = e.target.value;
                                            setPaymentForm({ ...paymentForm, targetPlan: newPlan, amount: calculateAmount(paymentForm.billingCycle, newPlan) });
                                        }}
                                    >
                                        <option value="BASIC">🥉 Plan Básico — {(platformConfig?.basicPlanMonthlyPrice || 19.99).toFixed(2)} {baseCurrencyCode}/mes</option>
                                        <option value="MEDIUM">🥈 Plan Medium — {(platformConfig?.mediumPlanMonthlyPrice || 29.99).toFixed(2)} {baseCurrencyCode}/mes</option>
                                        <option value="PREMIUM">🥇 Plan Premium — {(platformConfig?.premiumPlanMonthlyPrice || 49.99).toFixed(2)} {baseCurrencyCode}/mes</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Ciclo de Facturación</Form.Label>
                                    <div className="d-flex gap-3">
                                        <Form.Check
                                            type="radio"
                                            id="cycle-monthly"
                                            label="Mensual"
                                            name="billingCycle"
                                            checked={paymentForm.billingCycle === 'MONTHLY'}
                                            onChange={() => {
                                                setPaymentForm({ ...paymentForm, billingCycle: 'MONTHLY', amount: calculateAmount('MONTHLY', paymentForm.targetPlan) });
                                            }}
                                        />
                                        <Form.Check
                                            type="radio"
                                            id="cycle-annual"
                                            label={<span>Anual <Badge bg="success" className="ms-1">Ahorras 17%</Badge></span>}
                                            name="billingCycle"
                                            checked={paymentForm.billingCycle === 'ANNUAL'}
                                            onChange={() => {
                                                setPaymentForm({ ...paymentForm, billingCycle: 'ANNUAL', amount: calculateAmount('ANNUAL', paymentForm.targetPlan) });
                                            }}
                                        />
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Monto Pagado ({baseCurrencyCode})</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.01"
                                        className="py-2 rounded-3 text-success fw-bold bg-light"
                                        value={paymentForm.amount}
                                        readOnly
                                    />
                                    <Form.Text className="text-muted small d-block mt-2">
                                        <strong>Desglose de facturación:</strong><br/>
                                        • Membresía Base: {(paymentForm.amount - ((summary?.billedExtraRegisters || 0) * (paymentForm.billingCycle === 'MONTHLY' ? (platformConfig?.extraRegisterMonthlyPrice || 5) : (platformConfig?.extraRegisterMonthlyPrice || 5) * 10))).toFixed(2)} {baseCurrencyCode}<br/>
                                        {summary?.billedExtraRegisters > 0 && (
                                            <>• Cajas Adicionales ({summary.billedExtraRegisters}): {(summary.billedExtraRegisters * (paymentForm.billingCycle === 'MONTHLY' ? (platformConfig?.extraRegisterMonthlyPrice || 5) : (platformConfig?.extraRegisterMonthlyPrice || 5) * 10)).toFixed(2)} {baseCurrencyCode}<br/></>
                                        )}
                                        <strong>• Total a Pagar: {paymentForm.amount} {baseCurrencyCode}</strong>
                                    </Form.Text>
                                    {(summary?.billedExtraRegisters > 0 && paymentForm.targetPlan === 'BASIC' && (summary.billedExtraRegisters * (platformConfig?.extraRegisterMonthlyPrice || 5) + (platformConfig?.basicPlanMonthlyPrice || 19.99)) >= (platformConfig?.mediumPlanMonthlyPrice || 29.99)) && (
                                        <Alert variant="warning" className="mt-2 small py-2">
                                            💡 <strong>Sugerencia:</strong> El costo actual (Plan + Cajas) es mayor o igual al Plan Medium. Te sugerimos mejorar tu plan para obtener más beneficios.
                                        </Alert>
                                    )}
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Método de Pago</Form.Label>
                                    <Form.Select
                                        className="py-2 rounded-3"
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value, reference: '', banco: '', cedula: '', nombreTitular: '', correoTelefono: '', ordenId: '' })}
                                    >
                                        <option value="">-- Seleccione método de pago --</option>
                                        {platformConfig?.paymentPagoMovilEnabled !== false && <option value="PAGO_MOVIL">📱 Pago Móvil</option>}
                                        {platformConfig?.paymentZelleEnabled !== false && <option value="ZELLE">💵 Zelle</option>}
                                        {platformConfig?.paymentBinanceEnabled !== false && <option value="BINANCE">🪙 Binance / Crypto</option>}
                                        {platformConfig?.paymentTransferenciaEnabled !== false && <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>}
                                        {platformConfig?.paymentEfectivoEnabled !== false && <option value="EFECTIVO">💰 Efectivo (Local)</option>}
                                    </Form.Select>
                                </Form.Group>
                                        {(paymentForm.paymentMethod === 'PAGO_MOVIL' || paymentForm.paymentMethod === 'TRANSFERENCIA') && (
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Banco</Form.Label>
                                                    <Form.Select
                                                        className="py-2 rounded-3"
                                                        value={paymentForm.banco}
                                                        onChange={(e) => setPaymentForm({ ...paymentForm, banco: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Seleccionar Banco --</option>
                                                        <option>Banco de Venezuela</option>
                                                        <option>Banesco</option>
                                                        <option>Banco Mercantil</option>
                                                        <option>Banco Provincial</option>
                                                        <option>Banco Nacional de Crédito (BNC)</option>
                                                        <option>Banco Bicentenario</option>
                                                        <option>Banco del Tesoro</option>
                                                        <option>Banco Exterior</option>
                                                        <option>Banplus</option>
                                                        <option>Bancamiga</option>
                                                        <option>Banco Plaza</option>
                                                        <option>Banco Activo</option>
                                                        <option>Bancaribe</option>
                                                        <option>Banco Sofitasa</option>
                                                        <option>Banco Caroní</option>
                                                        <option>100% Banco</option>
                                                        <option>Mi Banco</option>
                                                        <option>Banco de la Fuerza Armada (BANFANB)</option>
                                                        <option>Banco del Sur</option>
                                                        <option>Otro</option>
                                                    </Form.Select>
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Cédula del Titular</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: V-12345678"
                                                        className="py-2 rounded-3"
                                                        value={paymentForm.cedula}
                                                        onChange={(e) => setPaymentForm({ ...paymentForm, cedula: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-4">
                                                    <Form.Label className="small fw-bold">Número de Referencia</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: 123456789"
                                                        className="py-2 rounded-3"
                                                        value={paymentForm.reference}
                                                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                            </>
                                        )}

                                        {paymentForm.paymentMethod === 'ZELLE' && (
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Nombre del Titular de la Cuenta</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: John Doe"
                                                        className="py-2 rounded-3"
                                                        value={paymentForm.nombreTitular}
                                                        onChange={(e) => setPaymentForm({ ...paymentForm, nombreTitular: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-4">
                                                    <Form.Label className="small fw-bold">Correo o Teléfono Zelle</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: john@email.com"
                                                        className="py-2 rounded-3"
                                                        value={paymentForm.correoTelefono}
                                                        onChange={(e) => setPaymentForm({ ...paymentForm, correoTelefono: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                            </>
                                        )}

                                        {paymentForm.paymentMethod === 'BINANCE' && (
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Número de ID de la Orden</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: 123456789"
                                                        className="py-2 rounded-3"
                                                        value={paymentForm.ordenId}
                                                        onChange={(e) => setPaymentForm({ ...paymentForm, ordenId: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-4">
                                                    <Form.Label className="small fw-bold">Nombre del Titular de la Cuenta</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: Juan Pérez"
                                                        className="py-2 rounded-3"
                                                        value={paymentForm.nombreTitular}
                                                        onChange={(e) => setPaymentForm({ ...paymentForm, nombreTitular: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                            </>
                                        )}

                                        {paymentForm.paymentMethod === 'EFECTIVO' && (
                                            <Alert variant="warning" className="small py-2 border-0">
                                                📍 Coordina la entrega del efectivo con el administrador de la plataforma.
                                            </Alert>
                                        )}
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
                                        {paymentStatus.loading ? <><Spinner animation="border" size="sm" className="me-2" /> Enviando...</> : 'Informar Pago'}
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Modal.Body>
                </Modal>

                {/* Extra Register Request Modal */}
                <Modal scrollable show={showExtraModal} onHide={() => { setShowExtraModal(false); setExtraStatus({ loading: false, success: false, error: '' }); }} centered className="rounded-4 overflow-hidden">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold">Adquirir Cajas Extra</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        {extraStatus.success ? (
                            <div className="text-center py-4">
                                <div className="display-4 text-success mb-3">✅</div>
                                <h5 className="fw-bold">
                                    ¡Comprobante Enviado!
                                </h5>
                                <p className="text-secondary small">
                                    Nuestro equipo validará tu pago. Las nuevas cajas se activarán automáticamente en un plazo de 1 a 24 horas hábiles.
                                </p>
                                <Button variant="primary" className="rounded-pill px-5 mt-3" onClick={() => { setShowExtraModal(false); setExtraStatus({ loading: false, success: false, error: '' }); }}>Cerrar</Button>
                            </div>
                        ) : (
                            <Form onSubmit={handleExtraRegisterSubmit}>
                                <Alert variant="info" className="small py-2 border-0 shadow-sm">
                                    Adquiere cajas registradoras adicionales para tu negocio.<br/><br/>
                                    <strong>Importante:</strong> Cada nueva caja tiene un costo de <strong>{(platformConfig?.extraRegisterMonthlyPrice || 5.00).toFixed(2)} {baseCurrencyCode} mensuales</strong>. Al aprobarse tu pago, estas cajas se sumarán a las que ya tienes habilitadas.
                                </Alert>

                                <Alert variant="info" className="border-0 shadow-sm rounded-3">
                                    <h6 className="fw-bold"><FaInfoCircle className="me-2" /> Datos de Pago:</h6>
                                    <ul className="mb-0 small">
                                        {platformConfig?.paymentZelleEnabled !== false && platformConfig?.paymentInfoZelle && (
                                            <li><strong>Zelle:</strong> {platformConfig.paymentInfoZelle}</li>
                                        )}
                                        {platformConfig?.paymentBinanceEnabled !== false && platformConfig?.paymentInfoBinance && (
                                            <li><strong>Binance:</strong> {platformConfig.paymentInfoBinance}</li>
                                        )}
                                        {platformConfig?.paymentPagoMovilEnabled !== false && platformConfig?.paymentInfoPagoMovil && (
                                            <li><strong>Pago Móvil:</strong> {platformConfig.paymentInfoPagoMovil}</li>
                                        )}
                                        {platformConfig?.paymentTransferenciaEnabled !== false && platformConfig?.paymentInfoTransferencia && (
                                            <li><strong>Transferencia:</strong> {platformConfig.paymentInfoTransferencia}</li>
                                        )}
                                    </ul>
                                </Alert>

                                {extraStatus.error && <Alert variant="danger" className="py-2 small">{extraStatus.error}</Alert>}

                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Cantidad de Cajas Extra a Adquirir</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={extraForm.requested}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setExtraForm({ ...extraForm, requested: val === '' ? '' : parseInt(val) });
                                        }}
                                        className="py-2 rounded-3"
                                        required
                                    />
                                </Form.Group>

                                <div className="bg-light p-3 rounded-3 mb-4 text-center border">
                                    <span className="small text-muted d-block mb-1">Monto a Pagar Ahora</span>
                                    <h3 className="fw-bold text-dark mb-0">
                                        {((parseInt(extraForm.requested) || 0) * (platformConfig?.extraRegisterMonthlyPrice || 5)).toFixed(2)} {baseCurrencyCode}
                                    </h3>
                                </div>
                                
                                {parseInt(extraForm.requested) > 0 && (
                                    <>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Método de Pago</Form.Label>
                                            <Form.Select
                                                className="py-2 rounded-3"
                                                value={extraForm.paymentMethod}
                                                onChange={(e) => setExtraForm({ ...extraForm, paymentMethod: e.target.value, reference: '', banco: '', cedula: '', nombreTitular: '', correoTelefono: '', ordenId: '' })}
                                            >
                                                <option value="">-- Seleccione método de pago --</option>
                                                {platformConfig?.paymentPagoMovilEnabled !== false && <option value="PAGO_MOVIL">📱 Pago Móvil</option>}
                                                {platformConfig?.paymentZelleEnabled !== false && <option value="ZELLE">💵 Zelle</option>}
                                                {platformConfig?.paymentBinanceEnabled !== false && <option value="BINANCE">🪙 Binance / Crypto</option>}
                                                {platformConfig?.paymentTransferenciaEnabled !== false && <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>}
                                                {platformConfig?.paymentEfectivoEnabled !== false && <option value="EFECTIVO">💰 Efectivo (Local)</option>}
                                            </Form.Select>
                                        </Form.Group>

                                        {(extraForm.paymentMethod === 'PAGO_MOVIL' || extraForm.paymentMethod === 'TRANSFERENCIA') && (
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Banco</Form.Label>
                                                    <Form.Select
                                                        className="py-2 rounded-3"
                                                        value={extraForm.banco}
                                                        onChange={(e) => setExtraForm({ ...extraForm, banco: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Seleccionar Banco --</option>
                                                        <option>Banco de Venezuela</option>
                                                        <option>Banesco</option>
                                                        <option>Banco Mercantil</option>
                                                        <option>Banco Provincial</option>
                                                        <option>Banco Nacional de Crédito (BNC)</option>
                                                        <option>Banco Bicentenario</option>
                                                        <option>Banco del Tesoro</option>
                                                        <option>Banco Exterior</option>
                                                        <option>Banplus</option>
                                                        <option>Bancamiga</option>
                                                        <option>Banco Plaza</option>
                                                        <option>Banco Activo</option>
                                                        <option>Bancaribe</option>
                                                        <option>Banco Sofitasa</option>
                                                        <option>Banco Caroní</option>
                                                        <option>100% Banco</option>
                                                        <option>Mi Banco</option>
                                                        <option>Banco de la Fuerza Armada (BANFANB)</option>
                                                        <option>Banco del Sur</option>
                                                        <option>Otro</option>
                                                    </Form.Select>
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Cédula del Titular</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: V-12345678"
                                                        className="py-2 rounded-3"
                                                        value={extraForm.cedula}
                                                        onChange={(e) => setExtraForm({ ...extraForm, cedula: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-4">
                                                    <Form.Label className="small fw-bold">Número de Referencia</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: 123456789"
                                                        className="py-2 rounded-3"
                                                        value={extraForm.reference}
                                                        onChange={(e) => setExtraForm({ ...extraForm, reference: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                            </>
                                        )}

                                        {extraForm.paymentMethod === 'ZELLE' && (
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Nombre del Titular de la Cuenta</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: John Doe"
                                                        className="py-2 rounded-3"
                                                        value={extraForm.nombreTitular}
                                                        onChange={(e) => setExtraForm({ ...extraForm, nombreTitular: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-4">
                                                    <Form.Label className="small fw-bold">Correo Electrónico o Número Telefónico</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: john@email.com o +1234567890"
                                                        className="py-2 rounded-3"
                                                        value={extraForm.correoTelefono}
                                                        onChange={(e) => setExtraForm({ ...extraForm, correoTelefono: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                            </>
                                        )}

                                        {extraForm.paymentMethod === 'BINANCE' && (
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Número de ID de la Orden</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: 123456789"
                                                        className="py-2 rounded-3"
                                                        value={extraForm.ordenId}
                                                        onChange={(e) => setExtraForm({ ...extraForm, ordenId: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-4">
                                                    <Form.Label className="small fw-bold">Nombre del Titular de la Cuenta</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Ej: Juan Pérez"
                                                        className="py-2 rounded-3"
                                                        value={extraForm.nombreTitular}
                                                        onChange={(e) => setExtraForm({ ...extraForm, nombreTitular: e.target.value })}
                                                        required
                                                    />
                                                </Form.Group>
                                            </>
                                        )}


                                        {extraForm.paymentMethod === 'EFECTIVO' && (
                                            <Alert variant="warning" className="small py-2 border-0">
                                                📍 Coordina la entrega del efectivo con el administrador de la plataforma.
                                            </Alert>
                                        )}
                                    </>
                                )}

                                <div className="d-grid">
                                    <Button variant="primary" type="submit" className="py-2 fw-bold shadow-sm rounded-pill" disabled={extraStatus.loading}>
                                        {extraStatus.loading ? <><Spinner animation="border" size="sm" className="me-2" /> Procesando...</> : 'Actualizar Cajas Ahora'}
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

export default DashboardHome;
