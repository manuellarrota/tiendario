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
    console.log(`Total Unified Products: ${data.length}`);

    // Check first 5 products
    for (const p of data.slice(0, 5)) {
        const sellers = await doRequest(`/public/products/name/${encodeURIComponent(p.name)}/sellers`);
        console.log(`Product: "${p.name}" | Sellers: ${sellers.length}`);
        sellers.forEach(s => {
            console.log(`  - Store: ${s.companyName} | Status: ${s.subscriptionStatus} | Price: ${s.price}`);
        });
    }
}
run();
