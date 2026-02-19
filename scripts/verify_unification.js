const fetch = require('node-fetch');

async function verify() {
    console.log('--- Verificando Unificación de Productos ---');
    try {
        const res = await fetch('http://localhost:8080/api/products');
        const products = await res.json();

        const laptops = products.filter(p => p.sku === 'LAP-001');

        console.log(`Total de productos 'LAP-001' encontrados en BD: ${laptops.length}`);

        if (laptops.length >= 2) {
            console.log('✅ ÉXITO: Se encontraron múltiples ofertas para el mismo SKU.');
            laptops.forEach(p => {
                console.log(`   - Tienda: ${p.company.name} | Precio: $${p.price} | Stock: ${p.stock}`);
            });
            console.log('\nEl Frontend (Marketplace) debe agrupar estas ofertas en una sola tarjeta.');
        } else {
            console.log('⚠️ ALERTA: No hay suficientes datos para probar la unificación.');
        }
    } catch (e) {
        console.error('Error conectando al Backend:', e.message);
    }
}

verify();
