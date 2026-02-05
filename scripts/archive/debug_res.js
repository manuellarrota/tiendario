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
    const res = await doRequest('/public/products', 'GET');
    console.log("Status:", res.status);
    console.log("Data Length:", Array.isArray(res.data) ? res.data.length : "Not an array");
    if (res.data.length > 0) {
        console.log("Keys:", Object.keys(res.data[0]));
    }
}

run();
