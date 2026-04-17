import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Tabs, Tab, Badge, Spinner, Pagination, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaChartBar, FaCalendarAlt, FaHistory, FaChartLine, FaBox, FaDollarSign, FaArrowUp, FaArrowDown, FaPercentage, FaShoppingCart } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import SaleService from '../services/sale.service';
import ReportService from '../services/report.service';
import DashboardService from '../services/dashboard.service';

const ReportsPage = () => {
    // Sales Pagination State
    const [sales, setSales] = useState([]);
    const [salesPage, setSalesPage] = useState(0);
    const [salesTotalPages, setSalesTotalPages] = useState(0);
    const [salesLoading, setSalesLoading] = useState(true);

    // Top Products State
    const [topProducts, setTopProducts] = useState([]);
    const [productsPage, setProductsPage] = useState(0);
    const [productsTotalPages, setProductsTotalPages] = useState(0);
    const [productsLoading, setProductsLoading] = useState(true);

    // Stats State
    const [stats, setStats] = useState(null);
    const [invStats, setInvStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    const fetchSales = (page = 0) => {
        setSalesLoading(true);
        SaleService.getSales(page, 10).then(
            (response) => {
                setSales(response.data.content || []);
                setSalesTotalPages(response.data.totalPages || 0);
                setSalesLoading(false);
            },
            () => setSalesLoading(false)
        );
    };

    const fetchTopProducts = (page = 0) => {
        setProductsLoading(true);
        ReportService.getTopProducts(page, 10).then(
            (response) => {
                setTopProducts(response.data.content || []);
                setProductsTotalPages(response.data.totalPages || 0);
                setProductsLoading(false);
            },
            () => setProductsLoading(false)
        );
    };

    const fetchStats = () => {
        setLoadingStats(true);
        // Get general dashboard summary for basic KPIs
        DashboardService.getSummary().then(res => setStats(res.data));
        
        // Get specific inventory stats
        ReportService.getInventoryStats().then(res => {
            setInvStats(res.data);
            setLoadingStats(false);
        }).catch(() => setLoadingStats(false));
    };

    useEffect(() => {
        fetchSales(salesPage);
    }, [salesPage]);

    useEffect(() => {
        fetchTopProducts(productsPage);
    }, [productsPage]);

    useEffect(() => {
        fetchStats();
    }, []);

    const handleRefresh = () => {
        fetchSales(0);
        fetchTopProducts(0);
        fetchStats();
        setSalesPage(0);
        setProductsPage(0);
    };

    const renderTooltip = (props, text) => (
        <Tooltip id={`tooltip-${text.replace(/\s+/g, '-').toLowerCase()}`} {...props}>
            {text}
        </Tooltip>
    );

    return (
        <Layout>
            <Container fluid>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div>
                        <h2 className="display-6 fw-bold mb-0 text-gradient">Reportes e Inteligencia</h2>
                        <p className="text-secondary mb-0">Analiza el rendimiento profundo de tu negocio y productos.</p>
                    </div>
                    <Button variant="outline-primary" className="rounded-pill px-4 shadow-sm" onClick={handleRefresh}>
                        <FaHistory className="me-2" /> Actualizar Datos
                    </Button>
                </div>

                {/* KPI Overview */}
                <Row className="g-4 mb-5">
                    <Col lg={3} md={6}>
                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-primary">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-secondary small text-uppercase fw-bold letter-spacing-1">Ventas Totales</span>
                                    <FaDollarSign className="text-primary opacity-50" />
                                </div>
                                <h3 className="fw-bold mb-1">${stats?.revenueToday?.toLocaleString()}</h3>
                                <div className="d-flex align-items-center gap-2">
                                    <Badge bg={stats?.revenueGrowth >= 0 ? "success" : "danger"} className="rounded-pill">
                                        {stats?.revenueGrowth >= 0 ? <FaArrowUp /> : <FaArrowDown />} {Math.abs(stats?.revenueGrowth)}%
                                    </Badge>
                                    <small className="text-muted">vs ayer (Hoy)</small>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={3} md={6}>
                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-success">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-secondary small text-uppercase fw-bold letter-spacing-1">Margen Promedio</span>
                                    <FaPercentage className="text-success opacity-50" />
                                </div>
                                <h3 className="fw-bold mb-1">{stats?.averageMargin || 0}%</h3>
                                <small className="text-muted">Estimado sobre stock actual</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={3} md={6}>
                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-warning">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-secondary small text-uppercase fw-bold letter-spacing-1">Valor Inventario</span>
                                    <FaBox className="text-warning opacity-50" />
                                </div>
                                <h3 className="fw-bold mb-1">${invStats?.totalValue?.toLocaleString()}</h3>
                                <small className="text-muted">Precio venta de todo el stock</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={3} md={6}>
                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-info">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-secondary small text-uppercase fw-bold letter-spacing-1">Ganancia Potencial</span>
                                    <FaArrowUp className="text-info opacity-50" />
                                </div>
                                <h3 className="fw-bold mb-1">${invStats?.potentialProfit?.toLocaleString()}</h3>
                                <small className="text-muted">Si vendes todo el stock hoy</small>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Tabs for detailed reports */}
                <div className="glass-card-admin border-0 shadow-sm rounded-4 overflow-hidden mb-5">
                    <Tabs defaultActiveKey="products" className="admin-tabs px-4 pt-3 border-0 bg-light">
                        <Tab eventKey="products" title={<span><FaShoppingCart className="me-2" /> Rendimiento por Producto</span>}>
                            <div className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h5 className="fw-bold mb-0">Productos más vendidos</h5>
                                    {productsLoading && <Spinner animation="border" size="sm" variant="primary" />}
                                </div>
                                
                                <Table hover responsive className="align-middle">
                                    <thead className="bg-light bg-opacity-50 text-secondary small">
                                        <tr>
                                            <th className="ps-4">PRODUCTO</th>
                                            <th className="text-center">CANTIDAD VENDIDA</th>
                                            <th className="text-end pe-4">INGRESOS TOTALES</th>
                                        </tr>
                                    </thead>
                                    <tbody className="small">
                                        {topProducts.map((p, i) => (
                                            <tr key={i}>
                                                <td className="ps-4 py-3">
                                                    <div className="fw-bold text-dark">{p.name}</div>
                                                </td>
                                                <td className="text-center">
                                                    <Badge bg="info" className="bg-opacity-10 text-info px-3 py-2 rounded-pill">
                                                        {p.totalSold} unidades
                                                    </Badge>
                                                </td>
                                                <td className="text-end pe-4 fw-bold text-success">
                                                    ${p.totalRevenue?.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {topProducts.length === 0 && !productsLoading && (
                                            <tr>
                                                <td colSpan="3" className="text-center py-5 text-muted">Aún no hay datos de ventas por producto.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>

                                {/* Pagination Controls */}
                                {productsTotalPages > 1 && (
                                    <div className="d-flex justify-content-center mt-4">
                                        <Pagination size="sm">
                                            <Pagination.Prev disabled={productsPage === 0} onClick={() => setProductsPage(productsPage - 1)} />
                                            {[...Array(productsTotalPages)].map((_, i) => (
                                                <Pagination.Item key={i} active={i === productsPage} onClick={() => setProductsPage(i)}>
                                                    {i + 1}
                                                </Pagination.Item>
                                            ))}
                                            <Pagination.Next disabled={productsPage === productsTotalPages - 1} onClick={() => setProductsPage(productsPage + 1)} />
                                        </Pagination>
                                    </div>
                                )}
                            </div>
                        </Tab>
                        
                        <Tab eventKey="transactions" title={<span><FaHistory className="me-2" /> Historial de Transacciones</span>}>
                            <div className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h5 className="fw-bold mb-0">Todas las Ventas</h5>
                                    {salesLoading && <Spinner animation="border" size="sm" variant="primary" />}
                                </div>

                                <Table hover responsive className="align-middle">
                                    <thead className="bg-light bg-opacity-50 text-secondary small">
                                        <tr>
                                            <th className="ps-4">ORDEN ID</th>
                                            <th>FECHA Y HORA</th>
                                            <th>ARTÍCULOS</th>
                                            <th>MÉTODO</th>
                                            <th className="text-end pe-4">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="small">
                                        {sales.map((s) => (
                                            <tr key={s.id}>
                                                <td className="ps-4 py-3 fw-bold text-dark">#{s.id}</td>
                                                <td>{new Date(s.date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td>{s.items?.length || 0}</td>
                                                <td>
                                                    <Badge bg="light" text="dark" className="border px-2 py-1 fw-normal">
                                                        {s.paymentMethod === 'CASH' ? '💵 Efectivo' : s.paymentMethod === 'CARD' ? '💳 Tarjeta' : s.paymentMethod === 'TRANSFER' ? '🏦 Transf' : '📱 P. Móvil'}
                                                    </Badge>
                                                </td>
                                                <td className="text-end pe-4 fw-bold text-primary">${s.totalAmount?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {sales.length === 0 && !salesLoading && (
                                            <tr>
                                                <td colSpan="5" className="text-center py-5 text-muted">No se encontraron transacciones.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>

                                {salesTotalPages > 1 && (
                                    <div className="d-flex justify-content-center mt-4">
                                        <Pagination size="sm">
                                            <Pagination.Prev disabled={salesPage === 0} onClick={() => setSalesPage(salesPage - 1)} />
                                            {/* Logic for showing many pages could be added here, but simple for now */}
                                            {[...Array(salesTotalPages)].map((_, i) => (
                                                <Pagination.Item key={i} active={i === salesPage} onClick={() => setSalesPage(i)}>
                                                    {i + 1}
                                                </Pagination.Item>
                                            ))}
                                            <Pagination.Next disabled={salesPage === salesTotalPages - 1} onClick={() => setSalesPage(salesPage + 1)} />
                                        </Pagination>
                                    </div>
                                )}
                            </div>
                        </Tab>

                        <Tab eventKey="inventory" title={<span><FaBox className="me-2" /> Salud del Inventario</span>}>
                            <div className="p-4">
                                <Row className="g-4">
                                    <Col md={6}>
                                        <Card className="border shadow-sm h-100 rounded-4">
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-4">Composición del Valor</h6>
                                                <div className="mb-4">
                                                    <div className="d-flex justify-content-between small mb-1">
                                                        <span>Costo de Adquisición</span>
                                                        <span className="fw-bold">${invStats?.totalCost?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="progress" style={{ height: '10px' }}>
                                                        <div className="progress-bar bg-secondary" style={{ width: `${invStats?.totalValue > 0 ? (invStats.totalCost / invStats.totalValue) * 100 : 50}%` }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="d-flex justify-content-between small mb-1">
                                                        <span>Margen de Ganancia Neto</span>
                                                        <span className="fw-bold text-success">+${invStats?.potentialProfit?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="progress" style={{ height: '10px' }}>
                                                        <div className="progress-bar bg-success" style={{ width: `${invStats?.totalValue > 0 ? (invStats.potentialProfit / invStats.totalValue) * 100 : 50}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 p-3 bg-light rounded-3 small text-muted">
                                                    <FaChartLine className="me-2" /> 
                                                    Tu inventario tiene un retorno potencial del <strong>{invStats?.totalCost > 0 ? ((invStats.potentialProfit / invStats.totalCost) * 100).toFixed(1) : 0}%</strong> sobre la inversión.
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card className="border shadow-sm h-100 rounded-4">
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-4">Métricas de Stock</h6>
                                                <Row className="text-center g-3">
                                                    <Col xs={6}>
                                                        <div className="p-3 bg-light rounded-4">
                                                            <div className="text-secondary small mb-1">Total Unidades</div>
                                                            <h4 className="fw-bold mb-0">{invStats?.totalItems?.toLocaleString()}</h4>
                                                        </div>
                                                    </Col>
                                                    <Col xs={6}>
                                                        <div className="p-3 bg-light rounded-4">
                                                            <div className="text-secondary small mb-1">SKUs Únicos</div>
                                                            <h4 className="fw-bold mb-0">{invStats?.distinctProducts?.toLocaleString()}</h4>
                                                        </div>
                                                    </Col>
                                                    <Col xs={12}>
                                                        <div className="p-3 bg-danger bg-opacity-10 rounded-4 border border-danger border-opacity-25 mt-2">
                                                            <div className="text-danger small mb-1">Productos con Stock Bajo</div>
                                                            <h4 className="fw-bold text-danger mb-0">{stats?.lowStockCount || 0}</h4>
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </div>
                        </Tab>
                    </Tabs>
                </div>
            </Container>
        </Layout>
    );
};

export default ReportsPage;
