const http = require('http');

async function doRequest(path, method, data, token = null) {
    const bodyStr = data ? JSON.stringify(data) : '';
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost', port: 8080, path: '/api' + path, method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;
        const req = http.request(options, (res) => {
            let b = ''; res.on('data', c => b += c); res.on('end', () => {
                try { resolve(JSON.parse(b)); } catch (e) { resolve(b); }
            });
        });
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

// Small product set to ensure ALL stores can have them
const PRODUCTS = [
    { name: "Martillo Pro 16oz", cat: "Ferretería", price: 15 },
    { name: "Taladro Power 18V", cat: "Ferretería", price: 85 },
    { name: "Smartphone Galaxy X", cat: "Tecnología", price: 250 },
    { name: "Laptop Ultra 15", cat: "Tecnología", price: 800 },
    { name: "Mat Yoga Premium", cat: "Deportes", price: 25 },
    { name: "Cama Mascota Plush", cat: "Mascotas", price: 35 },
    { name: "Perfume Aqua Fresh", cat: "Belleza", price: 60 },
    { name: "Silla Ergonómica Pro", cat: "Hogar", price: 150 },
    { name: "Café Premium 500g", cat: "Alimentos", price: 8 },
    { name: "Sudadera Streetwear", cat: "Moda", price: 45 }
];

async function run() {
    console.log("🔧 Aumentando límite de plan FREE y sembrando productos multi-tienda...");

    const adminLogin = await doRequest('/auth/signin', 'POST', { username: 'superadmin_final', password: 'admin123' });
    const token = adminLogin.token;

    // 1. Increase FREE plan limit to 100 products
    await doRequest('/superadmin/config', 'PUT', { freePlanProductLimit: 100 }, token);
    console.log("✅ Límite FREE aumentado a 100 productos.");

    // 2. Seed products into ALL 10 manager stores
    for (let i = 1; i <= 10; i++) {
        const username = `manager_v2_${i}`;
        const login = await doRequest('/auth/signin', 'POST', { username, password: 'password123' });
        if (!login.token) continue;
        const mToken = login.token;

        // Get categories
        const cats = await doRequest('/categories', 'GET', null, mToken);
        const catMap = {};
        if (Array.isArray(cats)) cats.forEach(c => catMap[c.name] = c.id);

        // Create categories if missing
        for (const p of PRODUCTS) {
            if (!catMap[p.cat]) {
                await doRequest('/categories', 'POST', { name: p.cat, description: p.cat }, mToken);
                const updCats = await doRequest('/categories', 'GET', null, mToken);
                if (Array.isArray(updCats)) updCats.forEach(c => catMap[c.name] = c.id);
            }
        }

        // Create products
        for (const p of PRODUCTS) {
            const variance = (Math.random() * 20) - 10;
            const finalPrice = Math.max(1, p.price + variance).toFixed(2);
            const sku = `SKU-MULTI-${p.name.replace(/\s/g, '-').toUpperCase()}-T${i}`;

            await doRequest('/products', 'POST', {
                name: p.name,
                sku: sku,
                price: finalPrice,
                stock: Math.floor(Math.random() * 50) + 10,
                description: `${p.name} de alta calidad disponible en San Cristóbal.`,
                category: { id: catMap[p.cat] }
            }, mToken);
        }
        process.stdout.write(`[T${i}]`);
    }

    console.log("\n🎉 Sembrado Multi-Tienda completado. Cada producto ahora tiene 10 vendedores.");
}
run();
