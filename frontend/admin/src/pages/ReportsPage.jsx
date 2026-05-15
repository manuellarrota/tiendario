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
                    <OverlayTrigger placement="left" overlay={(props) => renderTooltip(props, 'Sincronizar métricas con el estado actual de la base de datos.')}>
                        <Button variant="outline-primary" className="rounded-pill px-4 shadow-sm" onClick={handleRefresh}>
                            <FaHistory className="me-2" /> Actualizar Datos
                        </Button>
                    </OverlayTrigger>
                </div>

                {/* KPI Overview */}
                <Row className="g-4 mb-5">
                    <Col lg={3} md={6}>
                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-primary">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Ingresos brutos generados por ventas en el día de hoy.')}>
                                        <span className="text-secondary small text-uppercase fw-bold letter-spacing-1 cursor-help">Ventas Totales</span>
                                    </OverlayTrigger>
                                    <FaDollarSign className="text-primary opacity-50" />
                                </div>
                                <h3 className="fw-bold mb-1">${Number(stats?.revenueToday || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
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
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Porcentaje promedio de utilidad sobre el precio de venta de tus productos.')}>
                                        <span className="text-secondary small text-uppercase fw-bold letter-spacing-1 cursor-help">Margen Promedio</span>
                                    </OverlayTrigger>
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
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Valor total de tu mercancía si se vendiera toda al precio actual de mercado.')}>
                                        <span className="text-secondary small text-uppercase fw-bold letter-spacing-1 cursor-help">Valor Inventario</span>
                                    </OverlayTrigger>
                                    <FaBox className="text-warning opacity-50" />
                                </div>
                                <h3 className="fw-bold mb-1">${Number(invStats?.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                <small className="text-muted">Precio venta de todo el stock</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={3} md={6}>
                        <Card className="glass-card-admin h-100 border-0 shadow-sm border-start border-4 border-info">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Ganancia neta esperada tras restar los costos de adquisición al valor total del inventario.')}>
                                        <span className="text-secondary small text-uppercase fw-bold letter-spacing-1 cursor-help">Ganancia Potencial</span>
                                    </OverlayTrigger>
                                    <FaArrowUp className="text-info opacity-50" />
                                </div>
                                <h3 className="fw-bold mb-1">${Number(invStats?.potentialProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                <small className="text-muted">Si vendes todo el stock hoy</small>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Tabs for detailed reports */}
                <div className="glass-card-admin border-0 shadow-sm rounded-4 overflow-hidden mb-5">
                    <Tabs defaultActiveKey="products" className="admin-tabs px-4 pt-3 border-0 bg-light">
                        <Tab eventKey="products" title={
                            <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Análisis detallado de ventas y rentabilidad por cada artículo.')}>
                                <span><FaShoppingCart className="me-2" /> Rendimiento por Producto</span>
                            </OverlayTrigger>
                        }>
                            <div className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h5 className="fw-bold mb-0">Productos más vendidos</h5>
                                    {productsLoading && <Spinner animation="border" size="sm" variant="primary" />}
                                </div>
                                
                                <Table hover responsive className="align-middle">
                                    <thead className="bg-light bg-opacity-50 text-secondary small">
                                        <tr>
                                            <th className="ps-4">
                                                <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Nombre comercial del artículo.')}>
                                                    <span className="cursor-help">PRODUCTO</span>
                                                </OverlayTrigger>
                                            </th>
                                            <th className="text-center">
                                                <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Suma de todas las unidades vendidas en el periodo seleccionado.')}>
                                                    <span className="cursor-help">CANTIDAD VENDIDA</span>
                                                </OverlayTrigger>
                                            </th>
                                            <th className="text-end pe-4">
                                                <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Monto bruto recaudado por la venta de este producto.')}>
                                                    <span className="cursor-help">INGRESOS TOTALES</span>
                                                </OverlayTrigger>
                                            </th>
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
                                                    ${Number(p.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                        <Pagination size="sm" className="mb-0 shadow-sm rounded-pill p-1 bg-white">
                                            <Pagination.First disabled={productsPage === 0} onClick={() => setProductsPage(0)} />
                                            <Pagination.Prev disabled={productsPage === 0} onClick={() => setProductsPage(productsPage - 1)} />
                                            
                                            {/* Smart logic for products pages */}
                                            {[...Array(productsTotalPages)].map((_, i) => {
                                                if (i === 0 || i === productsTotalPages - 1 || (i >= productsPage - 2 && i <= productsPage + 2)) {
                                                    return (
                                                        <Pagination.Item key={i} active={i === productsPage} onClick={() => setProductsPage(i)}>
                                                            {i + 1}
                                                        </Pagination.Item>
                                                    );
                                                } else if (i === productsPage - 3 || i === productsPage + 3) {
                                                    return <Pagination.Ellipsis key={i} disabled />;
                                                }
                                                return null;
                                            })}

                                            <Pagination.Next disabled={productsPage === productsTotalPages - 1} onClick={() => setProductsPage(productsPage + 1)} />
                                            <Pagination.Last disabled={productsPage === productsTotalPages - 1} onClick={() => setProductsPage(productsTotalPages - 1)} />
                                        </Pagination>
                                    </div>
                                )}
                            </div>
                        </Tab>
                        
                        <Tab eventKey="transactions" title={
                            <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Bitácora completa de todas las ventas procesadas en el sistema.')}>
                                <span><FaHistory className="me-2" /> Historial de Transacciones</span>
                            </OverlayTrigger>
                        }>
                            <div className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h5 className="fw-bold mb-0">Todas las Ventas</h5>
                                    {salesLoading && <Spinner animation="border" size="sm" variant="primary" />}
                                </div>

                                <Table hover responsive className="align-middle">
                                    <thead className="bg-light bg-opacity-50 text-secondary small">
                                        <tr>
                                            <th className="ps-4">
                                                <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Número de comprobante interno.')}>
                                                    <span className="cursor-help">ORDEN ID</span>
                                                </OverlayTrigger>
                                            </th>
                                            <th>
                                                <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Momento en que se registró la transacción.')}>
                                                    <span className="cursor-help">FECHA Y HORA</span>
                                                </OverlayTrigger>
                                            </th>
                                            <th>
                                                <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Cantidad de tipos de productos incluidos en la venta.')}>
                                                    <span className="cursor-help">ARTÍCULOS</span>
                                                </OverlayTrigger>
                                            </th>
                                            <th>
                                                <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Canal de pago utilizado por el cliente.')}>
                                                    <span className="cursor-help">MÉTODO</span>
                                                </OverlayTrigger>
                                            </th>
                                            <th className="text-end pe-4">
                                                <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Monto total cobrado (impuestos incluidos).')}>
                                                    <span className="cursor-help">TOTAL</span>
                                                </OverlayTrigger>
                                            </th>
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
                                                <td className="text-end pe-4 fw-bold text-primary">${Number(s.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
                                        <Pagination size="sm" className="mb-0 shadow-sm rounded-pill p-1 bg-white">
                                            <Pagination.First disabled={salesPage === 0} onClick={() => setSalesPage(0)} />
                                            <Pagination.Prev disabled={salesPage === 0} onClick={() => setSalesPage(salesPage - 1)} />
                                            
                                            {/* Smart logic for sales pages */}
                                            {[...Array(salesTotalPages)].map((_, i) => {
                                                if (i === 0 || i === salesTotalPages - 1 || (i >= salesPage - 2 && i <= salesPage + 2)) {
                                                    return (
                                                        <Pagination.Item key={i} active={i === salesPage} onClick={() => setSalesPage(i)}>
                                                            {i + 1}
                                                        </Pagination.Item>
                                                    );
                                                } else if (i === salesPage - 3 || i === salesPage + 3) {
                                                    return <Pagination.Ellipsis key={i} disabled />;
                                                }
                                                return null;
                                            })}

                                            <Pagination.Next disabled={salesPage === salesTotalPages - 1} onClick={() => setSalesPage(salesPage + 1)} />
                                            <Pagination.Last disabled={salesPage === salesTotalPages - 1} onClick={() => setSalesPage(salesTotalPages - 1)} />
                                        </Pagination>
                                    </div>
                                )}
                            </div>
                        </Tab>

                        <Tab eventKey="inventory" title={
                            <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Estado financiero del stock, márgenes de ganancia y alertas de reposición.')}>
                                <span><FaBox className="me-2" /> Salud del Inventario</span>
                            </OverlayTrigger>
                        }>
                            <div className="p-4">
                                <Row className="g-4">
                                    <Col md={6}>
                                        <Card className="border shadow-sm h-100 rounded-4">
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-4">Composición del Valor</h6>
                                                <div className="mb-4">
                                                    <div className="d-flex justify-content-between small mb-1">
                                                        <OverlayTrigger placement="right" overlay={(props) => renderTooltip(props, 'Inversión total realizada para adquirir el stock actual.')}>
                                                            <span className="cursor-help">Costo de Adquisición</span>
                                                        </OverlayTrigger>
                                                        <span className="fw-bold">${Number(invStats?.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="progress" style={{ height: '10px' }}>
                                                        <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, `Representa el ${invStats?.totalValue > 0 ? ((invStats.totalCost / invStats.totalValue) * 100).toFixed(1) : 0}% del valor total.`)}>
                                                            <div className="progress-bar bg-secondary" style={{ width: `${invStats?.totalValue > 0 ? (invStats.totalCost / invStats.totalValue) * 100 : 50}%` }}></div>
                                                        </OverlayTrigger>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="d-flex justify-content-between small mb-1">
                                                        <OverlayTrigger placement="right" overlay={(props) => renderTooltip(props, 'Utilidad que percibirás tras descontar los costos.')}>
                                                            <span className="cursor-help text-success">Margen de Ganancia Neto</span>
                                                        </OverlayTrigger>
                                                        <span className="fw-bold text-success">+${Number(invStats?.potentialProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="progress" style={{ height: '10px' }}>
                                                        <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, `Representa el ${invStats?.totalValue > 0 ? ((invStats.potentialProfit / invStats.totalValue) * 100).toFixed(1) : 0}% del valor total.`)}>
                                                            <div className="progress-bar bg-success" style={{ width: `${invStats?.totalValue > 0 ? (invStats.potentialProfit / invStats.totalValue) * 100 : 50}%` }}></div>
                                                        </OverlayTrigger>
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
                                                        <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Suma física de todos los productos en existencia.')}>
                                                            <div className="p-3 bg-light rounded-4 cursor-help">
                                                                <div className="text-secondary small mb-1">Total Unidades</div>
                                                                <h4 className="fw-bold mb-0">{invStats?.totalItems?.toLocaleString()}</h4>
                                                            </div>
                                                        </OverlayTrigger>
                                                    </Col>
                                                    <Col xs={6}>
                                                        <OverlayTrigger placement="top" overlay={(props) => renderTooltip(props, 'Cantidad de códigos de producto diferentes en catálogo.')}>
                                                            <div className="p-3 bg-light rounded-4 cursor-help">
                                                                <div className="text-secondary small mb-1">SKUs Únicos</div>
                                                                <h4 className="fw-bold mb-0">{invStats?.distinctProducts?.toLocaleString()}</h4>
                                                            </div>
                                                        </OverlayTrigger>
                                                    </Col>
                                                    <Col xs={12}>
                                                        <OverlayTrigger placement="bottom" overlay={(props) => renderTooltip(props, 'Productos que requieren reposición inmediata.')}>
                                                            <div className="p-3 bg-danger bg-opacity-10 rounded-4 border border-danger border-opacity-25 mt-2 cursor-help">
                                                                <div className="text-danger small mb-1">Productos con Stock Bajo</div>
                                                                <h4 className="fw-bold text-danger mb-0">{stats?.lowStockCount || 0}</h4>
                                                            </div>
                                                        </OverlayTrigger>
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
