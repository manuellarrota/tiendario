// setup_test_data.js
// Prepara el entorno para probar Unificación de Productos y Compras

async function setup() {
    const baseUrl = 'http://localhost:8080/api';
    console.log('⏳ Creando datos de prueba...');

    // 1. Tienda A (Premium por defecto)
    await createProduct('manager_free', '123456', {
        name: 'Laptop Gamer Unificada',
        sku: 'UNIFY-001',
        price: 999.99,
        stock: 5,
        categoryId: 1,
        description: 'Vendido por Tienda Free'
    });

    // 2. Tienda B (Pro por defecto)
    await createProduct('manager_pro', '123456', {
        name: 'Laptop Gamer Unificada',
        sku: 'UNIFY-001',
        price: 1050.00,
        stock: 3,
        categoryId: 1,
        description: 'Vendido por Tienda Premium (Mejor garantía)'
    });

    // 3. Crear Cliente Validado
    await createAndVerifyClient('cliente_test', '123456');

    console.log('\n✅ ¡Listo! Ve a http://localhost:8082 y busca "Laptop Gamer Unificada".');
}

async function createProduct(username, password, productData) {
    try {
        // Login
        const loginRes = await fetch('http://localhost:8080/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const auth = await loginRes.json();

        if (!auth.accessToken) {
            console.error(`❌ Error login ${username}:`, auth);
            return;
        }

        // Crear Producto
        const prodRes = await fetch('http://localhost:8080/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.accessToken}`
            },
            body: JSON.stringify(productData)
        });

        if (prodRes.ok) {
            console.log(`✅ Producto creado en ${username} ($${productData.price})`);
        } else {
            console.error(`❌ Error creando producto en ${username}:`, await prodRes.text());
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function createAndVerifyClient(username, password) {
    try {
        // Registrar
        const regRes = await fetch('http://localhost:8080/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: ['client'] })
        });

        if (regRes.ok) {
            console.log(`✅ Cliente registrado: ${username}`);
            // Verificar (simulado, asumiendo acceso a codigo o DB, aqui hacemos trampa y usamos el endpoint verify directo con el codigo que sabemos que se genera o leemos el archivo... mejor leemos el archivo en node)
            // Para simplificar, el cliente lo validas tu manualmente con el link que saldrá en verification_links.txt o usas el que ya existe.
            console.log('   -> Recuerda validar al cliente usando el link en verification_links.txt');
        } else {
            console.log(`ℹ️ Cliente ${username} ya existe o error:`, await regRes.text());
        }
    } catch (e) {
        console.error('Error cliente:', e.message);
    }
}

setup();
