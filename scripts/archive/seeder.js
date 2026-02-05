const https = require('http');

const REGISTER_DATA = JSON.stringify({
    username: "demo_user_" + Math.floor(Math.random() * 1000),
    password: "password123",
    role: ["manager"],
    companyName: "Tienda Demo " + Math.floor(Math.random() * 100)
});

const LOGIN_DATA = (username) => JSON.stringify({
    username: username,
    password: "password123"
});

const PRODUCTS = [
    { name: "Arroz Blanco 1kg", sku: "ARR-001", price: 2.50, costPrice: 1.80, stock: 150, minStock: 20 },
    { name: "Leche Entera 1L", sku: "LCH-002", price: 1.80, costPrice: 1.20, stock: 80, minStock: 15 },
    { name: "Pan Integral 500g", sku: "PAN-003", price: 2.00, costPrice: 1.30, stock: 60, minStock: 10 },
    { name: "Aceite Vegetal 1L", sku: "ACT-004", price: 4.50, costPrice: 3.20, stock: 40, minStock: 8 },
    { name: "Azúcar Blanca 1kg", sku: "AZC-005", price: 1.50, costPrice: 1.00, stock: 100, minStock: 15 },
    { name: "Pasta Espagueti 500g", sku: "PST-006", price: 1.20, costPrice: 0.80, stock: 120, minStock: 20 },
    { name: "Atún en Lata 170g", sku: "ATN-007", price: 2.80, costPrice: 2.00, stock: 90, minStock: 15 },
    { name: "Frijoles Negros 500g", sku: "FRJ-008", price: 1.80, costPrice: 1.20, stock: 70, minStock: 12 },
    { name: "Huevos Docena", sku: "HVS-009", price: 3.50, costPrice: 2.50, stock: 50, minStock: 10 },
    { name: "Café Molido 250g", sku: "CAF-010", price: 5.00, costPrice: 3.50, stock: 45, minStock: 8 },
    { name: "Sal de Mesa 1kg", sku: "SAL-011", price: 0.80, costPrice: 0.50, stock: 200, minStock: 30 },
    { name: "Jabón de Tocador", sku: "JBN-012", price: 1.50, costPrice: 1.00, stock: 100, minStock: 15 },
    { name: "Papel Higiénico 4 rollos", sku: "PPL-013", price: 3.20, costPrice: 2.30, stock: 80, minStock: 12 },
    { name: "Detergente Líquido 1L", sku: "DTG-014", price: 4.80, costPrice: 3.40, stock: 55, minStock: 10 },
    { name: "Galletas Saladas 200g", sku: "GLL-015", price: 1.80, costPrice: 1.20, stock: 110, minStock: 18 }
];

function request(path, method, data, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data ? Buffer.byteLength(data) : 0
            }
        };

        if (token) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    console.error("Error parsing JSON response:", body);
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (data) req.write(data);
        req.end();
    });
}

// Since backend is HTTP not HTTPS, we need standard http module, not https.
// My mistake in import, fixing below.
const http = require('http');

async function run() {
    console.log("🚀 Iniciando Seeder...");
    console.log("--------------------------------");

    try {
        // 1. Register
        console.log("1. Registrando Empresa...");
        const regDataObj = JSON.parse(REGISTER_DATA);
        const registerRes = await doRequest('/auth/signup', 'POST', REGISTER_DATA);

        if (registerRes.status !== 200) {
            console.error("❌ Falló Registro:", registerRes.body);
            return;
        }
        console.log(`✅ Empresa '${regDataObj.companyName}' creada con usuario '${regDataObj.username}'`);

        // 2. Login
        console.log("2. Iniciando Sesión...");
        const loginRes = await doRequest('/auth/signin', 'POST', LOGIN_DATA(regDataObj.username));

        if (loginRes.status !== 200) {
            console.error("❌ Falló Login:", loginRes.body);
            return;
        }
        const token = loginRes.body.token;
        console.log("✅ Login exitoso. Token recibido.");

        // 3. Create Products
        console.log("3. Creando Productos...");
        for (const product of PRODUCTS) {
            // Add unique suffix to SKU to avoid collisions if re-run
            const p = { ...product, sku: product.sku + "-" + Math.floor(Math.random() * 1000) };
            const prodRes = await doRequest('/products', 'POST', JSON.stringify(p), token);
            if (prodRes.status === 200) {
                console.log(`   - Producto creado: ${p.name} ($${p.price})`);
            } else {
                console.error(`   ❌ Error creando ${p.name}:`, prodRes.body);
            }
        }

        console.log("--------------------------------");
        console.log("🎉 ¡Proceso Finalizado!");
        console.log(`🔑 Usuario: ${regDataObj.username}`);
        console.log(`🔒 Password: password123`);

    } catch (error) {
        console.error("🔥 Error Fatal:", error);
    }
}

function doRequest(path, method, data, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data ? Buffer.byteLength(data) : 0
            }
        };

        if (token) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: body ? JSON.parse(body) : {} });
            });
        });

        req.on('error', (e) => reject(e));
        if (data) req.write(data);
        req.end();
    });
}

run();
