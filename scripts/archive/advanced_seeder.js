const http = require('http');

const API_BASE = '/api';
const PORT = 8080;
const HOST = 'localhost';

const COMMON_PRODUCTS = [
    { name: "Smartphone X1", sku: "SKU-PHONE-X1", basePrice: 200 },
    { name: "Laptop Pro 15", sku: "SKU-LAPTOP-P15", basePrice: 800 },
    { name: "Auriculares Wireless", sku: "SKU-AUDIO-W1", basePrice: 50 },
    { name: "Monitor 4K 27\"", sku: "SKU-DISP-4K27", basePrice: 300 },
    { name: "Teclado Mecánico", sku: "SKU-KB-MECH", basePrice: 70 }
];

async function doRequest(path, method, data, token = null) {
    const bodyStr = data ? JSON.stringify(data) : '';
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: API_BASE + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(options, (res) => {
            let resBody = '';
            res.on('data', (chunk) => resBody += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: resBody ? JSON.parse(resBody) : {} });
                } catch (e) {
                    resolve({ status: res.statusCode, data: resBody });
                }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function run() {
    console.log("🚀 Iniciando Gran Seeder de 10 Tiendas...");

    try {
        // 1. Asegurar SuperAdmin
        console.log("🔑 Logueando SuperAdmin...");
        let adminToken;
        const adminLogin = await doRequest('/auth/signin', 'POST', { username: 'superadmin_final', password: 'admin123' });

        if (adminLogin.status !== 200) {
            console.log("✨ Registrando nuevo SuperAdmin...");
            await doRequest('/auth/signup', 'POST', { username: 'superadmin_final', password: 'admin123', role: ['admin'] });
            const retryLogin = await doRequest('/auth/signin', 'POST', { username: 'superadmin_final', password: 'admin123' });
            adminToken = retryLogin.data.token;
        } else {
            adminToken = adminLogin.data.token;
        }

        for (let i = 1; i <= 10; i++) {
            const isPaid = i > 5;
            const shopName = isPaid ? `Tienda Premium ${i}` : `Tienda Gratis ${i}`;
            const username = `manager_v3_${i}`;
            const password = 'password123';

            console.log(`\n--- Creando ${shopName} (${username}) ---`);

            // Register
            const reg = await doRequest('/auth/signup', 'POST', {
                username, password, role: ['manager'], companyName: shopName
            });
            if (reg.status !== 200) {
                console.log(`❌ Error al registrar ${username}:`, reg.data.message);
                continue;
            }

            // Login Manager
            const login = await doRequest('/auth/signin', 'POST', { username, password });
            const managerToken = login.data.token;
            const companyId = login.data.companyId;

            // Add Products
            // Cada tienda tiene todos los productos comunes pero con precios ligeramente distintos
            for (const p of COMMON_PRODUCTS) {
                const variance = (Math.random() * 20) - 10; // +/- $10
                const finalPrice = Math.max(5, p.basePrice + variance).toFixed(2);

                const prodData = {
                    name: p.name,
                    sku: p.sku,
                    price: finalPrice,
                    stock: Math.floor(Math.random() * 50),
                    description: `Excelente ${p.name} con garantía oficial.`,
                    category: 'Electrónica'
                };

                const prodRes = await doRequest('/products', 'POST', prodData, managerToken);
                if (prodRes.status === 200) {
                    console.log(`   ✅ Producto ${p.sku} añadido a $${finalPrice}`);
                }
            }

            // Si es de las últimas 5, subir a PAID
            if (isPaid) {
                console.log(`   💎 Ascendiendo a PREMIUM...`);
                await doRequest(`/superadmin/companies/${companyId}/subscription`, 'PUT', { status: 'PAID' }, adminToken);
            }
        }

        console.log("\n🎉 ¡Seeder finalizado con éxito!");
    } catch (err) {
        console.error("🔥 Error en el seeder:", err);
    }
}

run();
