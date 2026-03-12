const http = require('http');

const API_BASE = '/api';
const PORT = 8080;
const HOST = 'localhost';

const SECTORS = {
    "Ferretería": [
        { name: "Martillo de Acero 16oz", sku: "FER-001", basePrice: 15, description: "Martillo de acero forjado con mango ergonómico." },
        { name: "Taladro Inalámbrico 18V", sku: "FER-002", basePrice: 85, description: "Taladro percutor con maletín y accesorios." }
    ],
    "Supermercado": [
        { name: "Aceite de Girasol 1L", sku: "SUP-001", basePrice: 3.50, description: "Aceite vegetal premium." },
        { name: "Café Molido 250g", sku: "SUP-002", basePrice: 4.20, description: "Café arábico de altura." }
    ],
    "Tecnología": [
        { name: "Smartphone X1 128GB", sku: "TEC-001", basePrice: 200, description: "Pantalla AMOLED y triple cámara." },
        { name: "Smartwatch Fit Pro", sku: "TEC-002", basePrice: 55, description: "Monitoreo de salud y GPS." }
    ],
    "Alimentos": [
        { name: "Pan Integral Artesanal", sku: "ALI-001", basePrice: 2.50, description: "Hecho con masa madre." },
        { name: "Miel Orgánica 500g", sku: "ALI-002", basePrice: 6.50, description: "Miel pura de flores silvestres." }
    ],
    "Hogar": [
        { name: "Lámpara LED Modern", sku: "HOG-001", basePrice: 25, description: "3 niveles de brillo táctil." },
        { name: "Silla ergonómica Pro", sku: "HOG-002", basePrice: 150, description: "Excelente soporte lumbar." }
    ],
    "Belleza": [
        { name: "Kit Skin Care Bio", sku: "BEL-001", basePrice: 45, description: "Rutina natural de 3 pasos." },
        { name: "Perfume Aqua Sport", sku: "BEL-002", basePrice: 60, description: "Fragancia fresca y duradera." }
    ],
    "Deportes": [
        { name: "Mat de Yoga Premium", sku: "DEP-001", basePrice: 20, description: "Antideslizante de 6mm." },
        { name: "Balón Fútbol N5", sku: "DEP-002", basePrice: 25, description: "Cosido a mano profesional." }
    ],
    "Mascotas": [
        { name: "Alimento Perro 3kg", sku: "MAS-001", basePrice: 18, description: "Equilibrado para adultos." },
        { name: "Cama Mascotas Plush", sku: "MAS-002", basePrice: 30, description: "Extra suave y lavable." }
    ],
    "Moda": [
        { name: "Camiseta Algodón 100%", sku: "MOD-001", basePrice: 15, description: "Básica cuello redondo." },
        { name: "Zapatillas Blancas", sku: "MOD-002", basePrice: 65, description: "Estilo urbano premium." }
    ],
    "Juguetería": [
        { name: "Auto Control Remoto", sku: "JUG-001", basePrice: 50, description: "4WD todoterreno." },
        { name: "Bloques de Construcción", sku: "JUG-002", basePrice: 40, description: "500 piezas creativas." }
    ]
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
    console.log("🚀 Iniciando Seeder Rápido de Categorías Final...");
    
    // Attempt login with BOTH known passwords for manager_pro
    const passwords = ['Manager123!', '123456'];
    let token = null;
    
    for (const pwd of passwords) {
        console.log(`🔑 Probando login con contraseña: ${pwd}`);
        const login = await doRequest('/auth/signin', 'POST', { username: 'manager_pro', password: pwd });
        if (login.status === 200) {
            token = login.data.accessToken || login.data.token;
            console.log("✅ Login exitoso!");
            break;
        }
    }

    if (!token) {
        console.error("❌ Fallaron todos los intentos de login para manager_pro.");
        return;
    }

    // Since Product entity uses String category, we don't strictly need Category ID
    // but we can try to find them if the API expects it.
    // Based on Domain model, it's just a string in Product.
    
    // Add products
    for (const [catName, products] of Object.entries(SECTORS)) {
        console.log(`\n📦 Agregando productos para ${catName}...`);
        for (const p of products) {
            const prodData = {
                name: p.name,
                sku: p.sku + "-" + Math.random().toString(36).substring(7),
                price: p.basePrice,
                stock: 50,
                description: p.description,
                category: catName // As per Product.java
            };
            const res = await doRequest('/products', 'POST', prodData, token);
            if (res.status === 200 || res.status === 201) {
                process.stdout.write("✅ ");
            } else {
                process.stdout.write("❌ ");
            }
        }
    }
    console.log("\n\n🎉 Seeding finalizado. Todas las categorías deberían tener productos ahora.");
}

run();
