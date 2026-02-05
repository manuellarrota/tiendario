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
    // We'll call the internal endpoint if we can, but since grouping happens at /public/products, 
    // let's look at the RAW products if there's an endpoint for that, or just filter from all.
    // Actually, I'll bypass the grouping by creating a script that fetches all products from all companies 
    // or just look at the public list and see the IDs.
    const res = await doRequest('/public/products', 'GET');
    const sudaderas = res.data.filter(p => p.name.toLowerCase().includes('sudadera'));
    console.log("Sudaderas found in grouped list:", sudaderas.length);
    sudaderas.forEach(p => {
        console.log(`ID: ${p.id} | Name: ${p.name} | SKU: "${p.sku}" | Store: ${p.companyName}`);
    });
}

run();
