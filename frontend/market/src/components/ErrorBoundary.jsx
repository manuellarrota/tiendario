import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Container className="d-flex flex-column justify-content-center align-items-center text-center" style={{ minHeight: '60vh' }}>
                    <div className="p-5 rounded-4 shadow-sm" style={{ background: '#fff', border: '1px solid #f1f5f9', maxWidth: '500px' }}>
                        <FaExclamationTriangle size={48} className="text-warning mb-4" />
                        <h3 className="fw-bold text-dark mb-3">Algo no salió como esperábamos</h3>
                        <p className="text-muted mb-4 small">
                            Tuvimos un inconveniente al intentar cargar esta sección del marketplace. Puedes recargar la página para intentar de nuevo.
                        </p>
                        <Button
                            variant="primary"
                            className="btn-premium px-4"
                            onClick={() => window.location.reload()}
                        >
                            Recargar Página
                        </Button>
                    </div>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
