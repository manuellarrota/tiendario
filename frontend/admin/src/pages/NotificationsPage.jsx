import React, { useState, useEffect } from 'react';
import { Container, Card, ListGroup, Button, Badge } from 'react-bootstrap';
import { FaBell, FaCheck, FaTrash } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import NotificationService from '../services/notification.service';

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = () => {
        NotificationService.getNotifications().then(
            res => {
                setNotifications(res.data);
                setLoading(false);
            },
            err => {
                console.error(err);
                setLoading(false);
            }
        );
    };

    const markAsRead = (id) => {
        NotificationService.markAsRead(id).then(() => {
            loadNotifications();
        });
    };

    return (
        <div className="d-flex admin-content-area overflow-hidden">
            <Sidebar />
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto' }}>
                <Container fluid>
                    <h2 className="mb-4 d-flex align-items-center">
                        <FaBell className="me-2 text-primary" /> Centro de Notificaciones
                    </h2>

                    <Card className="border-0 shadow-sm rounded-4">
                        <Card.Header className="bg-white py-3 border-0">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold">Alertas del Sistema</h5>
                                <Badge bg="primary">{notifications.length} Totales</Badge>
                            </div>
                        </Card.Header>
                        <ListGroup variant="flush">
                            {loading ? (
                                <div className="text-center py-5">Cargando...</div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-5 text-muted">No tienes notificaciones nuevas.</div>
                            ) : (
                                notifications.map(notif => (
                                    <ListGroup.Item key={notif.id} className={`py-4 px-4 ${!notif.readStatus ? 'bg-primary bg-opacity-10' : ''}`}>
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="flex-grow-1">
                                                <h6 className={`fw-bold mb-1 ${!notif.readStatus ? 'text-primary' : ''}`}>
                                                    {!notif.readStatus && '🔵 '}
                                                    {notif.title}
                                                </h6>
                                                <p className="mb-1 text-secondary">{notif.message}</p>
                                                <small className="text-muted">
                                                    {new Date(notif.createdAt).toLocaleString()}
                                                </small>
                                            </div>
                                            {!notif.readStatus && (
                                                <Button
                                                    variant="light"
                                                    size="sm"
                                                    className="rounded-circle"
                                                    onClick={() => markAsRead(notif.id)}
                                                    title="Marcar como leída"
                                                >
                                                    <FaCheck className="text-success" />
                                                </Button>
                                            )}
                                        </div>
                                    </ListGroup.Item>
                                ))
                            )}
                        </ListGroup>
                    </Card>
                </Container>
            </div>
        </div>
    );
};

export default NotificationsPage;
