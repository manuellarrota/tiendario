const http = require('http');

async function doRequest(path, method, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api' + path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(options, (res) => {
            let resBody = '';
            res.on('data', (chunk) => resBody += chunk);
            res.on('end', () => resolve({ status: res.statusCode }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log("🧹 Limpiando productos existentes...");

    const login = await new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost', port: 8080, path: '/api/auth/signin', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, res => {
            let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b)));
        });
        req.write(JSON.stringify({ username: 'superadmin_final', password: 'admin123' }));
        req.end();
    });

    const token = login.token;

    // This is a hacky way since I don't have a "delete all" endpoint. 
    // I'll just use the seeder with fresh names if I can't wipe easily.
    // Actually, I'll just update the seeder to use unique names for now to demonstrate.
    console.log("Wipe script skipped. Updating seeder to be more robust.");
}
run();
