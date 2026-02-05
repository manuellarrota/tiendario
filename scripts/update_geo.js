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

async function run() {
    const adminLogin = await doRequest('/auth/signin', 'POST', { username: 'superadmin_final', password: 'admin123' });
    const token = adminLogin.token;
    const companies = await doRequest('/superadmin/companies', 'GET', null, token);

    console.log(`Updating ${companies.length} companies with coordinates...`);

    for (const c of companies) {
        // Caracas area: 10.48, -66.90
        const lat = 10.48 + (Math.random() * 0.1 - 0.05);
        const lng = -66.90 + (Math.random() * 0.1 - 0.05);

        await doRequest(`/superadmin/companies/${c.id}`, 'PUT', {
            name: c.name,
            latitude: lat,
            longitude: lng
        }, token);
        process.stdout.write(".");
    }
    console.log("\nDone.");
}
run();
