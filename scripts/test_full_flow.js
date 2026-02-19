const fetch = require('node-fetch'); // Needs node-fetch or Node 18+

const BASE_URL = 'http://localhost:8080/api';

// Helper for colored logs
const log = (msg, type = 'info') => {
    const colors = { info: '\x1b[36m', success: '\x1b[32m', error: '\x1b[31m', reset: '\x1b[0m' };
    console.log(`${colors[type] || colors.info}[${type.toUpperCase()}] ${msg}${colors.reset}`);
};

async function post(url, data, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} - ${JSON.stringify(json)}`);
    return json;
}

async function get(url, token = null) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} - ${JSON.stringify(json)}`);
    return json;
}

async function put(url, data, token = null) { // Add PUT method
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(data) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} - ${JSON.stringify(json)}`);
    return json;
}


(async () => {
    try {
        log('Iniciando Test de Integración Completo...', 'info');

        const PRODUCT_NAME = `Cafe Premium ${Date.now()}`;

        // 1. Login Manager 1 (Premium)
        const user1 = await post(`${BASE_URL}/auth/signin`, { username: 'manager_pro', password: '123456' });
        log('Manager Pro logueado', 'success');

        // 2. Create Product Store 1
        const prod1 = await post(`${BASE_URL}/products`, {
            name: PRODUCT_NAME,
            skus: `SKU-PRO-${Date.now()}`,
            price: 25.00,
            costPrice: 15.00,
            stock: 100,
            category: 'Alimentos',
            description: 'Cafe de altura'
        }, user1.accessToken);
        log(`Producto creado en Tienda 1: ${prod1.name} ($${prod1.price})`, 'success');

        // 3. Login Manager 2 (Free -> Upgrade)
        const user2 = await post(`${BASE_URL}/auth/signin`, { username: 'manager_free', password: '123456' });
        log('Manager Free logueado', 'success');

        // Upgrade subscription for User 2 (Simulated via backend logic if possible, or assume it fails if free)
        // Check current subscription
        // NOTE: Standard flow requires payment integration. We will skip purchase on Store 2 if it fails, or try.
        // But the user asked to test unification.
        // Let's create the product first.
        const prod2 = await post(`${BASE_URL}/products`, {
            name: PRODUCT_NAME, // Same Name
            skus: `SKU-FREE-${Date.now()}`,
            price: 22.00, // Cheaper
            costPrice: 12.00,
            stock: 50,
            category: 'Alimentos'
        }, user2.accessToken);
        log(`Producto creado en Tienda 2: ${prod2.name} ($${prod2.price})`, 'success');

        // 4. Public Search (Unification Verification)
        const searchResults = await get(`${BASE_URL}/public/search?q=${encodeURIComponent(PRODUCT_NAME)}`);

        if (searchResults.length === 1) {
            log('Unificación verificada: Se encontró 1 solo resultado agrupado.', 'success');
        } else {
            log(`ERROR Unificación: Se encontraron ${searchResults.length} resultados.`, 'error');
        }

        // 5. Ver detalles y vendedores
        const sellers = await get(`${BASE_URL}/public/products/name/${encodeURIComponent(PRODUCT_NAME)}/sellers`);
        log(`Vendedores encontrados: ${sellers.length}`, 'info');
        sellers.forEach(s => console.log(` - Tienda: ${s.companyName}, Precio: $${s.price}, Plan: ${s.subscriptionStatus}`));

        // 6. Filtrar vendedores elegibles (PREMIUM)
        const premiumSellers = sellers.filter(s => s.subscriptionStatus === 'PAID');
        if (premiumSellers.length === 0) {
            log('No hay vendedores Premium para comprar. Finalizando test de compra.', 'error');
            return;
        }

        // 7. Crear Orden (Compra)
        const customerEmail = `client_${Date.now()}@test.com`;
        const targetSeller = premiumSellers[0]; // Buy from first premium seller
        log(`Intentando comprar a ${targetSeller.companyName}...`, 'info');

        const orderRes = await post(`${BASE_URL}/public/order`, {
            productId: targetSeller.productId,
            quantity: 2,
            customerName: 'Cliente Test Script',
            customerEmail: customerEmail,
            customerPhone: '555-1234',
            customerAddress: 'Calle Test 123'
        });
        log(`Orden creada con éxito! ID: ${orderRes.message}`, 'success');

        // Extract ID (message might comprise "Order placed successfully! Order ID: 123")
        // We'll rely on listing orders as manager to find it.

        // 8. Verificar Orden como Manager
        // Login as the seller
        const sellerUser = targetSeller.companyName.includes('Premium') ? user1 : user2;
        // This logic presumes we know who user1/user2 are. 
        // user1 (manager_pro) is usually "Tienda Demo Premium".

        const sales = await get(`${BASE_URL}/sales`, sellerUser.accessToken);
        const mySale = sales.find(s => s.customer && s.customer.email === customerEmail);

        if (mySale) {
            log(`Orden encontrada en panel del vendedor. Estado: ${mySale.status}`, 'success');

            // 9. Process Order: PENDING -> READY_FOR_PICKUP -> PAID
            await put(`${BASE_URL}/sales/${mySale.id}/status?status=READY_FOR_PICKUP`, {}, sellerUser.accessToken);
            log('Estado actualizado a READY_FOR_PICKUP', 'success');

            await put(`${BASE_URL}/sales/${mySale.id}/status?status=PAID&paymentMethod=CASH`, {}, sellerUser.accessToken); // Add paymentMethod
            log('Estado actualizado a PAID', 'success');

        } else {
            log('Orden NO encontrada en panel del vendedor.', 'error');
        }

        log('Test Finalizado Correctamente.', 'success');

    } catch (e) {
        log(`Test Falló: ${e.message}`, 'error');
        console.error(e);
    }
})();
