const http = require('http');

const API_BASE = '/api';
const PORT = 8080;
const HOST = 'localhost';

const SECTORS = {
    "Restaurante": [{ name: "Menú Ejecutivo", sku: "RES-001", basePrice: 12, description: "Plato principal, sopa y bebida." }],
    "Farmacia": [{ name: "Kit Primeros Auxilios", sku: "FAR-001", basePrice: 25, description: "Básico para emergencias en el hogar." }],
    "Zapatería": [{ name: "Botas de Cuero", sku: "ZAP-001", basePrice: 85, description: "Cuero genuino, alta durabilidad." }],
    "Librería / Papelería": [{ name: "Cuaderno Profesional", sku: "LIB-001", basePrice: 5, description: "100 hojas, tapa dura." }],
    "Panadería": [{ name: "Combo Desayuno", sku: "PAN-001", basePrice: 8, description: "Café, pan artesanal y huevos." }]
};

async function doRequest(path, method, data, token = null) {
    const bodyStr = data ? JSON.stringify(data) : '';
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST, port: PORT, path: API_BASE + path, method: method,
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;
        const req = http.request(options, (res) => {
            let resBody = ''; res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: resBody ? JSON.parse(resBody) : {} }); }
                catch (e) { resolve({ status: res.statusCode, data: resBody }); }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function run() {
    console.log("🚀 Agregando sectores base adicionales...");
    
    const login = await doRequest('/auth/signin', 'POST', { username: 'manager_pro', password: 'Manager123!' });
    if (login.status !== 200) {
        console.error("❌ Falló login.");
        return;
    }
    const token = login.data.accessToken || login.data.token;

    for (const [catName, products] of Object.entries(SECTORS)) {
        for (const p of products) {
            const prodData = {
                name: p.name,
                sku: p.sku + "-" + Math.random().toString(36).substring(7),
                price: p.basePrice,
                stock: 50,
                description: p.description,
                category: catName
            };
            const res = await doRequest('/products', 'POST', prodData, token);
            if (res.status === 200 || res.status === 201) {
                process.stdout.write("✅ ");
            }
        }
    }
    console.log("\n🎉 Listo.");
}

run();
