const http = require('http');

// Utilitario para peticiones HTTP sin dependencias externas
function request(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': 'Bearer ' + token } : {})
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    // Manejar respuestas vacías
                    const json = body ? JSON.parse(body) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(`[${res.statusCode}] ${path} - ${JSON.stringify(json)}`));
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', body);
                    reject(new Error(`Invalid JSON response from ${path}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
    console.log('\n--- INICIANDO SIMULACIÓN DE ESCENARIO COMERCIAL ---\n');

    try {
        const TIMESTAMP = Date.now();
        const PRODUCT_NAME = `Cafe Unificado ${TIMESTAMP}`;
        const SKU_BASE = `CF-${TIMESTAMP}`;

        // ---------------------------------------------------------
        // 1. PREPARACIÓN TIENDA 1 (PREMIUM)
        // ---------------------------------------------------------
        console.log('1. [Tienda 1] Iniciando sesión con manager_pro...');
        const loginPro = await request('POST', '/auth/signin', { username: 'manager_pro', password: '123456' });
        const tokenPro = loginPro.accessToken;
        console.log('   > Login exitoso.');

        console.log('   > Creando producto Tienda 1: ' + PRODUCT_NAME);
        const prodPro = await request('POST', '/products', {
            name: PRODUCT_NAME,
            skus: SKU_BASE + '-PRO',
            price: 25.00, // Más caro
            costPrice: 15.00,
            stock: 100,
            category: 'Alimentos',
            description: 'Cafe Premium de Altura'
        }, tokenPro);
        console.log('   > Producto creado. ID: ' + prodPro.id);


        // ---------------------------------------------------------
        // 2. PREPARACIÓN TIENDA 2 (FREE -> PREMIUM)
        // ---------------------------------------------------------
        console.log('\n2. [Tienda 2] Iniciando sesión con manager_free...');
        const loginFree = await request('POST', '/auth/signin', { username: 'manager_free', password: '123456' });
        const tokenFree = loginFree.accessToken;
        console.log('   > Login exitoso.');

        console.log('   > Verificando suscripción...');
        // Simulamos pago para ser Premium
        console.log('   > Ejecutando Upgrade a Premium (Simulación de Pago)...');
        await request('POST', '/payments/simulate-success', {}, tokenFree);
        console.log('   > Suscripción activada correctamente (PAID).');

        console.log('   > Creando producto Tienda 2 (Mismo Nombre): ' + PRODUCT_NAME);
        const prodFree = await request('POST', '/products', {
            name: PRODUCT_NAME,
            skus: SKU_BASE + '-FREE',
            price: 22.00, // Más barato
            costPrice: 12.00,
            stock: 50,
            category: 'Alimentos',
            description: 'Cafe Económico'
        }, tokenFree);
        console.log('   > Producto creado. ID: ' + prodFree.id);


        // ---------------------------------------------------------
        // 3. UNIFICACIÓN EN MARKETPLACE
        // ---------------------------------------------------------
        console.log('\n3. [Marketplace] Verificando Unificación de Productos...');
        // Esperar indexación si usa Elasticsearch (aquí usamos DB fallback directo)
        await sleep(1000);

        const searchResults = await request('GET', `/public/search?q=${encodeURIComponent(PRODUCT_NAME)}`);

        if (searchResults.length === 1) {
            console.log(`   > ÉXITO: Se encontró 1 solo resultado agrupado para "${PRODUCT_NAME}".`);
            console.log(`   > Precio mostrado desde: $${searchResults[0].price}`);
        } else {
            console.error(`   > ERROR: Se encontraron ${searchResults.length} resultados separados. Fallo de unificación.`);
            console.log(searchResults);
        }

        console.log('   > Consultando ofertas/vendedores del producto...');
        const sellers = await request('GET', `/public/products/name/${encodeURIComponent(PRODUCT_NAME)}/sellers`);
        console.log(`   > Total vendedores encontrados: ${sellers.length}`);

        sellers.forEach(s => {
            console.log(`     - [${s.companyName}] Precio: $${s.price} | Stock: ${s.stock} | Plan: ${s.subscriptionStatus}`);
        });

        if (sellers.length !== 2) {
            console.error('   > ERROR: No se encontraron las 2 tiendas esperadas.');
        }


        // ---------------------------------------------------------
        // 4. COMPRA CLIENTE
        // ---------------------------------------------------------
        console.log('\n4. [Cliente] Iniciando proceso de Compra...');

        // Comprar a la Tienda 2 (Más barata)
        const targetSeller = sellers.find(s => s.price === 22.00);
        console.log(`   > Seleccionando oferta de: ${targetSeller.companyName} ($22.00)`);

        const customerEmail = `cliente_${TIMESTAMP}@test.com`;
        const orderPayload = {
            productId: targetSeller.productId,
            quantity: 3,
            customerName: 'Juan Perez Script',
            customerEmail: customerEmail,
            customerPhone: '555-0001',
            customerAddress: 'Av. Test 123'
        };

        const orderRes = await request('POST', '/public/order', orderPayload);
        console.log('   > Orden enviada. Respuesta: ' + orderRes.message);


        // ---------------------------------------------------------
        // 5. GESTIÓN BACKOFFICE (CAMBIO DE ESTADO)
        // ---------------------------------------------------------
        console.log('\n5. [Backoffice Tienda 2] Procesando Orden...');

        console.log('   > Buscando orden pendiente...');
        const sales = await request('GET', '/sales', null, tokenFree);
        // Filtramos por email del cliente y producto
        const mySale = sales.find(s => s.customer && s.customer.email === customerEmail); // Simple find

        if (mySale) {
            console.log(`   > Orden encontrada ID: #${mySale.id} | Estado: ${mySale.status} | Total: $${mySale.totalAmount}`);

            console.log('   > Cambiando estado a: READY_FOR_PICKUP (Listo por buscar)...');
            await request('PUT', `/sales/${mySale.id}/status?status=READY_FOR_PICKUP`, {}, tokenFree);

            console.log('   > Cliente llega a tienda. Registrando pago...');
            console.log('   > Cambiando estado a: PAID (Pagado y Entregado)...');
            await request('PUT', `/sales/${mySale.id}/status?status=PAID&paymentMethod=CASH`, {}, tokenFree);

            // Verificar estado final
            const salesFinal = await request('GET', '/sales', null, tokenFree);
            const finalSale = salesFinal.find(s => s.id === mySale.id);
            console.log(`   > Estado final de la orden #${finalSale.id}: ${finalSale.status}`);

            if (finalSale.status === 'PAID') {
                console.log('\n--- TEST EXITOSO: FLUJO COMPLETO VERIFICADO ---');
            } else {
                console.error('\n--- TEST FALLIDO: EL ESTADO FINAL NO ES PAID ---');
            }

        } else {
            console.error('   > ERROR: No se encontró la orden en el panel del vendedor.');
        }

    } catch (error) {
        console.error('\n!!! ERROR FATAL EN EL SCRIPT !!!');
        console.error(error.message);
    }
})();
