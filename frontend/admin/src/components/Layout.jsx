import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PublicService from '../services/public.service';
import AuthService from '../services/auth.service';

const Layout = ({ children, isSuperAdmin, isBlocked }) => {
    const [maintenance, setMaintenance] = useState(false);
    const [loading, setLoading] = useState(true);
    const user = AuthService.getCurrentUser();
    const isAdmin = user && user.roles && user.roles.includes('ROLE_ADMIN');

    useEffect(() => {
        PublicService.getPlatformConfig().then(
            (res) => {
                setMaintenance(res.data.maintenanceMode);
                setLoading(false);
            },
            () => setLoading(false)
        );
    }, []);

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    // Block everyone except SuperAdmins
    if (maintenance && !isAdmin) {
        return (
            <div className="bg-dark vh-100 d-flex flex-column align-items-center justify-content-center text-white px-4 text-center">
                <div className="display-1 mb-4">🛠️</div>
                <h1 className="fw-bold display-4 mb-3">En Mantenimiento</h1>
                <p className="lead opacity-75 mb-5" style={{ maxWidth: '600px' }}>
                    La plataforma completa está bajo mantenimiento técnico.
                    Por favor, vuelve en unos minutos.
                </p>
                <button className="btn btn-outline-light" onClick={() => AuthService.logout()}>Cerrar Sesión</button>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <Sidebar isSuperAdmin={isSuperAdmin} isBlocked={isBlocked} />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
