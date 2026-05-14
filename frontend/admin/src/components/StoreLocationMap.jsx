import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaMapMarkerAlt } from 'react-icons/fa';

const StoreLocationMap = ({ address, onLocationDetected, height = "280px" }) => {
    const [isSearchingMap, setIsSearchingMap] = useState(false);
    const [debouncedAddress, setDebouncedAddress] = useState("");
    const [position, setPosition] = useState(null);

    useEffect(() => {
        if (!address || address.length < 5) {
            setIsSearchingMap(false);
            setDebouncedAddress("");
            setPosition(null);
            onLocationDetected(null);
            return;
        }

        setIsSearchingMap(true);

        const timeoutId = setTimeout(() => {
            setDebouncedAddress(address);

            // Contextualize the search for better local results
            const query = encodeURIComponent(`${address}, Venezuela`);
            axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
                headers: { 'Accept-Language': 'es' }
            })
                .then(response => {
                    if (response.data && response.data.length > 0) {
                        const { lat, lon } = response.data[0];
                        const newPos = { lat: parseFloat(lat), lng: parseFloat(lon) };
                        setPosition(newPos);
                        onLocationDetected(newPos);
                    } else {
                        setPosition(null);
                        onLocationDetected(null);
                    }
                    setIsSearchingMap(false);
                })
                .catch(err => {
                    console.warn('Geocoding error:', err);
                    setIsSearchingMap(false);
                });
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [address, onLocationDetected]);

    return (
        <div className="store-location-map-wrapper">
            <div style={{ 
                position: 'relative', 
                height: height, 
                width: '100%', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                border: '1px solid #dee2e6', 
                backgroundColor: '#f8f9fa' 
            }}>
                {debouncedAddress.length >= 5 ? (
                    <>
                        <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0, display: 'block' }}
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(debouncedAddress + ', Venezuela')}&z=16&output=embed`}
                            allowFullScreen
                            loading="lazy"
                            title="Ubicación de la tienda"
                        />
                        {isSearchingMap && (
                            <div style={{ 
                                position: 'absolute', 
                                top: 8, 
                                right: 8, 
                                background: 'rgba(255,255,255,0.9)', 
                                borderRadius: 8, 
                                padding: '4px 10px', 
                                fontSize: '0.75rem', 
                                color: '#6366f1', 
                                fontWeight: 600,
                                zIndex: 10
                            }}>
                                Buscando coordenadas...
                            </div>
                        )}
                    </>
                ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center p-3 text-muted">
                        <FaMapMarkerAlt size={40} className="mb-2 opacity-50" />
                        <small>Escribe la dirección para verla en el mapa</small>
                    </div>
                )}
            </div>
            <small className="mt-1 d-block text-secondary">
                {position ? '📍 Ubicación GPS detectada ✓' : 'El mapa se actualizará mientras escribes la dirección.'}
            </small>
        </div>
    );
};

export default StoreLocationMap;
