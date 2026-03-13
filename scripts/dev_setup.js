const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = '/api';
const PORT = 8080;
const HOST = 'localhost';
const VERIFICATION_FILE = path.join(__dirname, '..', 'backend', 'verification_links.txt');

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

function getVerificationCode(email) {
    try {
        if (!fs.existsSync(VERIFICATION_FILE)) return null;
        const content = fs.readFileSync(VERIFICATION_FILE, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        // Look for the last entry matching the email
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].includes(`Email: ${email}`)) {
                const match = lines[i].match(/code=([a-f0-9-]+)/);
                return match ? match[1] : null;
            }
        }
    } catch (e) {
        console.error("Error reading verification file:", e.message);
    }
    return null;
}

async function run() {
    console.log("🛠️  Iniciando Setup de Desarrollo (con Auto-Verificación)...");

    // 1. Crear y verificar usuarios Manager
    const users = [
        { username: "manager_pro", password: "manager123", email: "pro@tiendario.com", companyName: "Tienda Demo Premium", role: ["manager"] },
        { username: "manager_free", password: "manager123", email: "free@tiendario.com", companyName: "Tienda Egar", role: ["manager"] }
    ];

    for (const u of users) {
        process.stdout.write(`👤 Creando ${u.username}... `);
        const signup = await doRequest('/auth/signup', 'POST', u);
        
        let shouldVerify = false;
        if (signup.status === 200 || signup.status === 201) {
            console.log("✅ (Creado)");
            shouldVerify = true;
        } else if (signup.status === 400 && JSON.stringify(signup.data).includes("uso")) {
            console.log("ℹ️  (Ya existe)");
            shouldVerify = false; // Assume already verified if exists
        } else {
            console.log("❌", signup.data);
            continue;
        }

        if (shouldVerify) {
            process.stdout.write(`   ✉️  Verificando ${u.username}... `);
            // Wait a bit for the file to be written
            await new Promise(r => setTimeout(r, 1000));
            const code = getVerificationCode(u.email);
            if (code) {
                const verify = await doRequest(`/auth/verify?code=${code}`, 'GET', null);
                if (verify.status === 200 || verify.status === 302) {
                    console.log("✅");
                } else {
                    console.log("❌", verify.data);
                }
            } else {
                console.log("❌ (No se encontró código)");
            }
        }
    }

    // 2. Login con manager_pro para meter productos
    process.stdout.write("🔑 Login con manager_pro... ");
    const login = await doRequest('/auth/signin', 'POST', { username: "manager_pro", password: "manager123" });
    if (login.status !== 200) {
        console.log("❌ Falló login. No se pueden crear productos.", login.data);
        return;
    }
    console.log("✅");
    const token = login.data.accessToken || login.data.token;

    // 3. Crear productos básicos
    const products = [
        { name: "Zapatillas Urbanas", sku: "ZAP-001", price: 59.90, stock: 20, category: "Zapatería" },
        { name: "Café en Grano 500g", sku: "ALM-001", price: 12.50, stock: 100, category: "Supermercado" },
        { name: "Smartphone 5G", sku: "TEC-001", price: 299.00, stock: 10, category: "Electrónica / celulares" }
    ];

    process.stdout.write("📦 Creando productos de prueba... ");
    for (const p of products) {
        // We use a random suffix to avoid "SKU exists" errors if re-running
        const pCopy = { ...p, sku: p.sku + "-" + Math.random().toString(36).substring(7) };
        const res = await doRequest('/products', 'POST', pCopy, token);
        if (res.status === 200 || res.status === 201) {
            process.stdout.write("✅ ");
        } else {
            process.stdout.write("❌ ");
        }
    }
    console.log("\n\n✨ Entorno listo. Ya puedes usar manager_pro / manager123");
}

run();
