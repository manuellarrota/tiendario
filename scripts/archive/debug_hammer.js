const http = require('http');

async function doRequest(path, method, data, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api' + path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
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
        req.end();
    });
}

async function run() {
    const products = await doRequest('/public/products', 'GET');
    const item = products.data.find(p => p.sku === 'SKU-FER-HAMMER' || p.name.includes("Martillo"));
    console.log(JSON.stringify(item || products.data[products.data.length - 1], null, 2));
}

run();
