const http = require('http');

async function doRequest(path) {
    return new Promise((resolve) => {
        http.get('http://localhost:8080/api' + path, (res) => {
            let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b)));
        });
    });
}

async function run() {
    // Check new products from multi_store_seeder
    const testProducts = ["Martillo Pro 16oz", "Smartphone Galaxy X", "Mat Yoga Premium"];

    for (const name of testProducts) {
        const sellers = await doRequest(`/public/products/name/${encodeURIComponent(name)}/sellers`);
        console.log(`\nProduct: "${name}" | Sellers: ${sellers.length}`);
        if (Array.isArray(sellers)) {
            sellers.forEach(s => {
                console.log(`  - ${s.companyName} | ${s.subscriptionStatus} | $${s.price}`);
            });
        }
    }
}
run();
