const http = require('http');

const API_BASE = '/api';
const PORT = 8080;
const HOST = 'localhost';

const NEW_PRODUCTS = [
    // Ferretería
    { name: "Martillo de Acero 16oz", sku: "SKU-FER-HAMMER", basePrice: 15, category: "Ferretería" },
    { name: "Set Destornilladores x6", sku: "SKU-FER-DRIVE", basePrice: 12, category: "Ferretería" },
    { name: "Taladro Inalámbrico 18V", sku: "SKU-FER-DRILL", basePrice: 85, category: "Ferretería" },
    { name: "Cinta Métrica 5m", sku: "SKU-FER-TAPE", basePrice: 8, category: "Ferretería" },

    // Supermercado
    { name: "Aceite de Girasol 1L", sku: "SKU-SUP-OIL", basePrice: 3.50, category: "Supermercado" },
    { name: "Arroz Premium 1kg", sku: "SKU-SUP-RICE", basePrice: 1.80, category: "Supermercado" },
    { name: "Leche Entera 1L", sku: "SKU-SUP-MILK", basePrice: 1.50, category: "Supermercado" },
    { name: "Café Molido 250g", sku: "SKU-SUP-COFFEE", basePrice: 4.20, category: "Supermercado" },
    { name: "Detergente Líquido 3L", sku: "SKU-SUP-DET", basePrice: 12.00, category: "Supermercado" }
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
    console.log("🛠️ Añadiendo productos de Ferretería y Supermercado a las tiendas...");

    try {
        for (let i = 1; i <= 10; i++) {
            const username = `manager_v2_${i}`;
            const password = 'password123';

            console.log(`\n📦 Accediendo a Tienda ${i} (${username})...`);

            const login = await doRequest('/auth/signin', 'POST', { username, password });
            if (login.status !== 200) {
                console.log(`   ❌ No se pudo entrar con ${username}`);
                continue;
            }
            const managerToken = login.data.token;

            for (const p of NEW_PRODUCTS) {
                const variance = (Math.random() * (p.basePrice * 0.2)) - (p.basePrice * 0.1); // +/- 10%
                const finalPrice = Math.max(0.5, p.basePrice + variance).toFixed(2);

                const prodData = {
                    name: p.name,
                    sku: p.sku,
                    price: finalPrice,
                    stock: Math.floor(Math.random() * 100) + 10,
                    description: `${p.name} de alta calidad. Categoría: ${p.category}`,
                    // No pasamos category id para que use el default o se maneje por nombre en el backend si lo habilitamos, 
                    // o simplemente se queda como null y mostramos el SKU/Name centralizado.
                };

                const prodRes = await doRequest('/products', 'POST', prodData, managerToken);
                if (prodRes.status === 200) {
                    console.log(`   ✅ ${p.sku} añadido a $${finalPrice}`);
                } else {
                    console.log(`   ⚠️ Error con ${p.sku}: ${prodRes.data.message || 'Desconocido'}`);
                }
            }
        }

        console.log("\n✨ ¡Nuevos sectores añadidos exitosamente!");
    } catch (err) {
        console.error("🔥 Error crítico:", err);
    }
}

run();
