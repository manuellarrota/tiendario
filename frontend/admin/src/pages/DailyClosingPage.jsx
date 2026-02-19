import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Alert, Button } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import SaleService from '../services/sale.service';
import { FaCashRegister, FaMoneyBillWave, FaCreditCard, FaUniversity } from 'react-icons/fa';

const DailyClosingPage = () => {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchSummary = () => {
        setLoading(true);
        SaleService.getDailySummary().then(
            (response) => {
                setSummary(response.data);
                setLoading(false);
            },
            (err) => {
                setError("No se pudo cargar el reporte de cierre.");
                setLoading(false);
                console.error(err);
            }
        );
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    // Process data to group by user
    const users = [...new Set(summary.map(item => item.username))];
    const report = users.map(user => {
        const userSales = summary.filter(s => s.username === user);

        const getAmount = (method) => {
            const found = userSales.find(s => s.paymentMethod === method);
            return found ? found.totalAmount : 0;
        };

        const getCount = (method) => {
            const found = userSales.find(s => s.paymentMethod === method);
            return found ? found.saleCount : 0;
        };

        const totalCash = getAmount('CASH');
        const totalCard = getAmount('CARD');
        const totalTransfer = getAmount('TRANSFER');
        const grandTotal = totalCash + totalCard + totalTransfer;

        return {
            user,
            totalCash,
            totalCard,
            totalTransfer,
            grandTotal,
            totalTx: userSales.reduce((acc, s) => acc + s.saleCount, 0)
        };
    });

    const grandTotalAll = report.reduce((acc, r) => acc + r.grandTotal, 0);

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2><FaCashRegister className="me-2" /> Cierre de Caja Diario</h2>
                    <Button variant="outline-primary" onClick={fetchSummary}>Actualizar</Button>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <Card className="shadow-sm mb-4">
                    <Card.Body>
                        <h4 className="text-center mb-4">Resumen del Día: {new Date().toLocaleDateString()}</h4>

                        <div className="table-responsive">
                            <Table hover bordered>
                                <thead className="bg-light text-center">
                                    <tr>
                                        <th>Cajero / Usuario</th>
                                        <th><FaMoneyBillWave className="text-success" /> Efectivo</th>
                                        <th><FaCreditCard className="text-info" /> Tarjeta</th>
                                        <th><FaUniversity className="text-warning" /> Transferencia</th>
                                        <th>Total Caja</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.map(r => (
                                        <tr key={r.user} className="text-center align-middle">
                                            <td className="fw-bold text-start ps-4">{r.user}</td>
                                            <td>${r.totalCash.toFixed(2)}</td>
                                            <td>${r.totalCard.toFixed(2)}</td>
                                            <td>${r.totalTransfer.toFixed(2)}</td>
                                            <td className="fw-bold bg-light">${r.grandTotal.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {report.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4 text-muted">No hay movimientos registrados hoy.</td>
                                        </tr>
                                    )}
                                </tbody>
                                {report.length > 0 && (
                                    <tfoot className="bg-dark text-white text-center">
                                        <tr>
                                            <td className="text-end pe-3 fw-bold">TOTAL GENERAL</td>
                                            <td>${report.reduce((acc, r) => acc + r.totalCash, 0).toFixed(2)}</td>
                                            <td>${report.reduce((acc, r) => acc + r.totalCard, 0).toFixed(2)}</td>
                                            <td>${report.reduce((acc, r) => acc + r.totalTransfer, 0).toFixed(2)}</td>
                                            <td className="fw-bold fs-5">${grandTotalAll.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default DailyClosingPage;
