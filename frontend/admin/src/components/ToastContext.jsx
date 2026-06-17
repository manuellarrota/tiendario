import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, variant = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, variant }]);
    }, []);

    const showSuccess = useCallback((message) => addToast(message, 'success'), [addToast]);
    const showError = useCallback((message) => addToast(message, 'danger'), [addToast]);
    const showInfo = useCallback((message) => addToast(message, 'info'), [addToast]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showSuccess, showError, showInfo }}>
            {children}
            <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999, position: 'fixed' }}>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        bg={toast.variant === 'light' ? 'light' : toast.variant}
                        onClose={() => removeToast(toast.id)}
                        delay={toast.variant === 'danger' ? 30000 : 4000}
                        autohide
                        className={`shadow-sm mb-2 text-${toast.variant === 'light' ? 'dark' : 'white'}`}
                    >
                        <Toast.Header
                            className={`border-0 text-${toast.variant === 'light' ? 'dark' : 'white'}`}
                            style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
                        >
                            {toast.variant === 'success' && <FaCheckCircle className="me-2" />}
                            {toast.variant === 'danger' && <FaExclamationCircle className="me-2" />}
                            {toast.variant === 'info' && <FaInfoCircle className="me-2" />}
                            <strong className="me-auto">
                                {toast.variant === 'success' ? 'Éxito' : toast.variant === 'danger' ? 'Error' : 'Aviso'}
                            </strong>
                        </Toast.Header>
                        <Toast.Body className="fw-medium">{toast.message}</Toast.Body>
                    </Toast>
                ))}
            </ToastContainer>
        </ToastContext.Provider>
    );
};
