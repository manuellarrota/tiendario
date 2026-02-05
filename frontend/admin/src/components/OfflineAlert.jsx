import React, { useState, useEffect } from 'react';
import { Alert } from 'react-bootstrap';
import { FaWifi, FaExclamationTriangle } from 'react-icons/fa';

const OfflineAlert = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: '300px'
        }}>
            <Alert variant="warning" className="d-flex align-items-center shadow-lg border-0 rounded-pill py-2 px-4 mb-0">
                <FaExclamationTriangle className="me-2" />
                <span className="fw-bold me-2">Sin Conexión.</span>
                <span className="small">Trabajando en modo offline.</span>
            </Alert>
        </div>
    );
};

export default OfflineAlert;
