import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table } from 'react-bootstrap';
import { FaChartBar, FaCalendarAlt, FaHistory } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import SaleService from '../services/sale.service';

const ReportsPage = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        SaleService.getSales().then(
            (response) => {
                setSales(response.data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching sales", error);
                setLoading(false);
            }
        );
    }, []);

    const fetchReports = () => {
        fetchSales(); // Re-fetch sales data
    };

    const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const salesCount = sales.length;
    const averageSale = salesCount > 0 ? totalSales / salesCount : 0;

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2><FaChartLine className="me-2" /> Reportes de Ventas</h2>
                    <OverlayTrigger
                        placement="left"
                        overlay={(props) => (
                            <Tooltip id="tooltip-refresh-reports" {...props}>
                                Actualizar datos de ventas y transacciones
                            </Tooltip>
                        )}
                    >
                        <Button variant="outline-primary" onClick={fetchReports}>Actualizar</Button>
                    </OverlayTrigger>
                </div>

                <Row className="g-4 mb-4">
                    <Col md={4}>
                        <Card className="border-0 shadow-sm bg-primary text-white">
                            <Card.Body>
                                <Card.Title><FaChartBar className="me-2" /> Total Vendido</Card.Title>
                                <h2 className="fw-bold">${totalSales.toLocaleString()}</h2>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 shadow-sm bg-success text-white">
                            <Card.Body>
                                <Card.Title><FaHistory className="me-2" /> Número de Ventas</Card.Title>
                                <h2 className="fw-bold">{salesCount}</h2>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 shadow-sm bg-info text-white">
                            <Card.Body>
                                <Card.Title><FaCalendarAlt className="me-2" /> Promedio por Venta</Card.Title>
                                <h2 className="fw-bold">${averageSale.toFixed(2)}</h2>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <Card className="border-0 shadow-sm">
                    <Card.Body>
                        <h5 className="mb-4">Historial de Transacciones</h5>
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha</th>
                                    <th>Productos</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(s => (
                                    <tr key={s.id}>
                                        <td>#{s.id}</td>
                                        <td>{new Date(s.date).toLocaleString()}</td>
                                        <td>{s.items?.length || 0} items</td>
                                        <td className="fw-bold text-success">${s.totalAmount}</td>
                                    </tr>
                                ))}
                                {sales.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="4" className="text-center py-4 text-muted">No hay ventas registradas aún.</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default ReportsPage;
