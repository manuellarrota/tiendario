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
            let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b)));
        });
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

const DESCRIPTIONS = [
    "La mejor tienda de Táchira con atención personalizada y los mejores precios del mercado.",
    "Expertos en soluciones locales para tu hogar y oficina. Visítanos en el Centro de San Cristóbal.",
    "Calidad garantizada y compromiso con nuestra comunidad sancristobalense.",
    "Tu aliado comercial en el corazón de los Andes. Variedad y confianza.",
    "Distribución líder en la región con stock permanente y despacho inmediato."
];

async function run() {
    console.log("📍 Ubicando todas las tiendas en San Cristóbal, Táchira...");
    const adminLogin = await doRequest('/auth/signin', 'POST', { username: 'superadmin_final', password: 'admin123' });
    const token = adminLogin.token;
    const companies = await doRequest('/superadmin/companies', 'GET', null, token);

    // San Cristóbal Central Coordinates
    const baseLat = 7.7667;
    const baseLng = -72.2250;

    for (let j = 0; j < companies.length; j++) {
        const c = companies[j];
        const lat = baseLat + (Math.random() * 0.04 - 0.02);
        const lng = baseLng + (Math.random() * 0.04 - 0.02);
        const desc = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];

        // Deterministic mix for the 10 seeded stores:
        // Stores 1-5 = PAID, Stores 6-10 = FREE
        let status = 'FREE';
        if (j < 5) {
            status = 'PAID';
        } else if (j < 10) {
            status = 'FREE';
        } else {
            status = Math.random() > 0.5 ? 'PAID' : 'FREE';
        }

        await doRequest(`/superadmin/companies/${c.id}/subscription`, 'PUT', { status }, token);

        await doRequest(`/superadmin/companies/${c.id}`, 'PUT', {
            name: c.name,
            latitude: lat,
            longitude: lng,
            description: desc,
            imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=400&auto=format&fit=crop"
        }, token);
        process.stdout.write(status === 'PAID' ? "P" : "F");
    }
    console.log("\n✅ Actualizado: Ubicaciones en San Cristóbal y datos enriquecidos.");
}
run();
