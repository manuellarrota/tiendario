import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaLock, FaStore, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL;

    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tokenValid, setTokenValid] = useState(true);

    useEffect(() => {
        const t = searchParams.get('token');
        if (!t) {
            setTokenValid(false);
            setMessage('El enlace de recuperación es inválido o está incompleto.');
        } else {
            setToken(t);
        }
    }, [searchParams]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setMessage('');

        if (newPassword !== confirmPassword) {
            setMessage('Las contraseñas no coinciden.');
            return;
        }
        if (newPassword.length < 6) {
            setMessage('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);
        axios.post(API_URL + '/auth/reset-password', { token, newPassword })
            .then((res) => {
                setSuccess(true);
                setMessage(res.data.message || '¡Contraseña restablecida exitosamente!');
                setLoading(false);
            })
            .catch((err) => {
                setMessage(err.response?.data?.message || 'Error al restablecer la contraseña. El enlace puede haber expirado.');
                setSuccess(false);
                setLoading(false);
            });
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Background decoration */}
            <div style={{
                position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0
            }}>
                <div style={{
                    position: 'absolute', top: '-15%', right: '-10%',
                    width: '500px', height: '500px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-15%', left: '-10%',
                    width: '400px', height: '400px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)'
                }} />
            </div>

            <div style={{
                background: 'white',
                borderRadius: '24px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                padding: '48px',
                width: '100%',
                maxWidth: '440px',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Logo & Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: success
                            ? 'linear-gradient(135deg, #059669, #10b981)'
                            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: success
                            ? '0 8px 24px rgba(5,150,105,0.3)'
                            : '0 8px 24px rgba(99,102,241,0.3)',
                        transition: 'all 0.4s ease'
                    }}>
                        {success
                            ? <FaCheckCircle size={28} color="white" />
                            : <FaLock size={28} color="white" />
                        }
                    </div>
                    <h2 style={{
                        fontWeight: 800, fontSize: '1.6rem',
                        color: '#1e293b', margin: '0 0 8px'
                    }}>
                        {success ? '¡Contraseña Actualizada!' : 'Nueva Contraseña'}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                        {success
                            ? 'Ya puedes iniciar sesión con tu nueva contraseña.'
                            : 'Ingresa tu nueva contraseña para recuperar el acceso.'}
                    </p>
                </div>

                {/* Form or Success State */}
                {!success && tokenValid && (
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>
                                Nueva Contraseña
                            </Form.Label>
                            <div style={{ position: 'relative' }}>
                                <FaLock style={{
                                    position: 'absolute', top: '13px', left: '14px',
                                    color: '#9ca3af', fontSize: '14px'
                                }} />
                                <Form.Control
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    style={{
                                        paddingLeft: '40px', borderRadius: '12px',
                                        border: '1.5px solid #e5e7eb', padding: '12px 12px 12px 40px',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>
                                Confirmar Contraseña
                            </Form.Label>
                            <div style={{ position: 'relative' }}>
                                <FaLock style={{
                                    position: 'absolute', top: '13px', left: '14px',
                                    color: '#9ca3af', fontSize: '14px'
                                }} />
                                <Form.Control
                                    type="password"
                                    placeholder="Repetir contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    style={{
                                        paddingLeft: '40px', borderRadius: '12px',
                                        border: '1.5px solid #e5e7eb', padding: '12px 12px 12px 40px',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>
                        </Form.Group>

                        {message && (
                            <Alert variant="danger" className="rounded-3 py-2 small mb-3">
                                {message}
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '14px',
                                borderRadius: '12px', border: 'none',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white', fontWeight: 700, fontSize: '1rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {loading
                                ? <><Spinner size="sm" animation="border" className="me-2" />Procesando...</>
                                : 'Restablecer Contraseña'
                            }
                        </Button>
                    </Form>
                )}

                {/* Success state */}
                {success && (
                    <>
                        {message && (
                            <Alert variant="success" className="rounded-3 py-2 small mb-4 text-center">
                                {message}
                            </Alert>
                        )}
                        <Button
                            onClick={() => navigate('/')}
                            style={{
                                width: '100%', padding: '14px',
                                borderRadius: '12px', border: 'none',
                                background: 'linear-gradient(135deg, #059669, #10b981)',
                                color: 'white', fontWeight: 700, fontSize: '1rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(5,150,105,0.35)'
                            }}
                        >
                            Ir a Iniciar Sesión
                        </Button>
                    </>
                )}

                {/* Invalid token state */}
                {!tokenValid && (
                    <>
                        <Alert variant="danger" className="rounded-3 text-center">
                            {message}
                        </Alert>
                        <Button
                            variant="outline-primary"
                            onClick={() => navigate('/')}
                            style={{ width: '100%', borderRadius: '12px', padding: '12px' }}
                        >
                            Volver al inicio
                        </Button>
                    </>
                )}

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#9ca3af', fontSize: '0.8rem' }}>
                        <FaStore size={12} />
                        <span>Nugar — Tu Marketplace Local</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
