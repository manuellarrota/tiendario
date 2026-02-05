import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';

const ProductCard = ({ product }) => {
    return (
        <Card className="h-100 market-card border-0">
            <div style={{ height: '220px', background: 'linear-gradient(to bottom, #f8fafc, #e2e8f0)' }} className="d-flex align-items-center justify-content-center position-relative">
                <span className="display-1 text-secondary opacity-25">📦</span>
                <Badge bg="white" text="dark" className="position-absolute bottom-0 end-0 m-3 shadow-sm py-2 px-3 rounded-pill fw-bold border">
                    ${product.price}
                </Badge>
            </div>
            <Card.Body className="d-flex flex-column p-4">
                <div className="mb-3">
                    <Card.Title className="fw-bold mb-1 fs-5 text-dark">{product.name}</Card.Title>
                    <Card.Text className="text-secondary small">
                        Tienda: <span className="text-primary fw-semibold">{product.company ? product.company.name : 'Unknown Store'}</span>
                    </Card.Text>
                </div>
                <div className="mt-auto">
                    <Button className="btn-market w-100">
                        Ver Detalles
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default ProductCard;
