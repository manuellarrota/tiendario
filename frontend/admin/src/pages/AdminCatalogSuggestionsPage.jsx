import { useState, useEffect } from 'react';
import axios from '../services/setupAxios';

export default function AdminCatalogSuggestionsPage() {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSuggestions();
    }, []);

    const fetchSuggestions = async () => {
        try {
            const res = await axios.get('/superadmin/catalog-suggestions');
            setSuggestions(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching suggestions', error);
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!confirm('¿Aprobar esta sugerencia y sobreescribir el catálogo global?')) return;
        try {
            await axios.put(`/superadmin/catalog-suggestions/${id}/approve`);
            fetchSuggestions();
        } catch (error) {
            alert('Error aprobando sugerencia');
        }
    };

    const handleReject = async (id) => {
        if (!confirm('¿Rechazar esta sugerencia?')) return;
        try {
            await axios.put(`/superadmin/catalog-suggestions/${id}/reject`);
            fetchSuggestions();
        } catch (error) {
            alert('Error rechazando sugerencia');
        }
    };

    if (loading) return <div className="p-8">Cargando sugerencias...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Sugerencias de Catálogo (Imágenes)</h1>
            <p className="text-gray-600 mb-8">
                Aquí verás las sugerencias de cambio de imágenes y detalles de productos enviadas por las tiendas.
            </p>

            {suggestions.length === 0 ? (
                <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500">
                    No hay sugerencias pendientes.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {suggestions.map((sug) => (
                        <div key={sug.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 mb-2">Sugerencia de la Tienda: {sug.companyName}</h3>
                                <p className="text-sm text-gray-500 mb-4">SKU Catálogo: {sug.catalogProduct?.sku}</p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border rounded-lg p-4 bg-gray-50">
                                        <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Catálogo Actual (Global)</p>
                                        <img 
                                            src={sug.catalogProduct?.imageUrl?.startsWith('http') ? sug.catalogProduct.imageUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}${sug.catalogProduct?.imageUrl}`}
                                            alt="Current" 
                                            className="h-32 w-32 object-cover rounded bg-white border mx-auto mb-3"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Sin+Imagen' }}
                                        />
                                        <p className="font-medium text-center">{sug.catalogProduct?.name}</p>
                                    </div>
                                    <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
                                        <p className="text-xs font-semibold uppercase text-indigo-400 mb-2">Sugerencia (Nueva)</p>
                                        <img 
                                            src={sug.suggestedImageUrl?.startsWith('http') ? sug.suggestedImageUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}${sug.suggestedImageUrl}`}
                                            alt="Suggested" 
                                            className="h-32 w-32 object-cover rounded bg-white border border-indigo-200 mx-auto mb-3"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Sin+Imagen' }}
                                        />
                                        <p className="font-medium text-center text-indigo-900">{sug.suggestedName}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex md:flex-col justify-center gap-3 min-w-[150px]">
                                <button 
                                    onClick={() => handleApprove(sug.id)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                                >
                                    ✅ Aprobar
                                </button>
                                <button 
                                    onClick={() => handleReject(sug.id)}
                                    className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition"
                                >
                                    ❌ Rechazar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
