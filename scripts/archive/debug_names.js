const http = require('http');

async function doRequest(path) {
    return new Promise((resolve) => {
        http.get('http://localhost:8080/api' + path, (res) => {
            let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b)));
        });
    });
}

async function run() {
    const data = await doRequest('/public/products');
    const sudaderas = data.filter(p => p.name.toLowerCase().includes('sudadera'));
    console.log("Groups found:", sudaderas.length);
    sudaderas.forEach(p => {
        const normalized = p.name.trim().toLowerCase();
        console.log(`- Name: "${p.name}" | Length: ${p.name.length} | Normalized: "${normalized}" | SKU: ${p.sku}`);
    });
}
run();
