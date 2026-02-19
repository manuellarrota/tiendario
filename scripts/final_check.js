// Native fetch
async function checkUnification() {
    try {
        console.log('--- Validación Final de Unificación (Autenticado) ---');

        // 1. Login
        const loginRes = await fetch('http://localhost:8080/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin_store_Alpha', password: '123456' })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);

        const authData = await loginRes.json();
        const token = authData.accessToken;

        // 2. Obtener productos con Token
        const prodRes = await fetch('http://localhost:8080/api/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const products = await prodRes.json();

        // 3. Filtrar
        const skuCheck = 'LAP-001';
        const laptops = products.filter(p => p.sku === skuCheck);

        console.log(`\nProductos encontrados con SKU '${skuCheck}': ${laptops.length}`);

        laptops.forEach(p => {
            console.log(`- ID: ${p.id} | Tienda: ${p.company.name} | $${p.price} | Stock: ${p.stock}`);
        });

        if (laptops.length >= 2) {
            console.log('\n✅ PRUEBA EXITOSA: Múltiples ofertas detectadas. La unificación backend FUNCIONA.');
        } else {
            console.log('\n⚠️ ALERTA: Solo 1 oferta disponible.');
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkUnification();
