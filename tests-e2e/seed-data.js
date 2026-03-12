const http = require('http');

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 30000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, data: parsed, raw: data });
      });
    });

    req.on('error', (e) => {
      resolve({ status: 0, error: e.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 408, error: 'timeout' });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

async function seed() {
  const ts = Date.now();
  let adminToken = null;
  const loginRes = await request('POST', '/api/auth/signin', { username: 'admin', password: 'Admin123!' });
  adminToken = loginRes?.data?.token || (await request('POST', '/api/auth/signin', { username: 'admin', password: 'admin123' }))?.data?.token;

  if (!adminToken) {
    console.error('Failed to login');
    process.exit(1);
  }

  let storesCreated = 0;
  let productsCreated = 0;

  for (let i = 1; i <= 100; i++) {
    const body = {
      companyName: `Store Mock ${ts} ${i}`,
      username: `mock_${ts}_${i}`,
      email: `mock_${ts}_${i}@example.com`,
      password: 'password123',
      subscriptionStatus: 'PAID'
    };
    
    const res = await request('POST', '/api/superadmin/onboard/create-store', body, adminToken);
    
    if (res.status === 200 && res.data && res.data.companyId) {
      storesCreated++;
      const cid = res.data.companyId;
      
      const productTasks = [];
      for (let p = 1; p <= 100; p++) {
        productTasks.push(request('POST', `/api/superadmin/onboard/${cid}/products`, {
          name: `Mock Product ${cid}-${p}`,
          sku: `SKU-${cid}-${p}`,
          price: "10.00",
          stock: 50,
          category: `Category ${p % 10}`
        }, adminToken));
      }
      
      // Send 100 products in parallel for this store
      const pRes = await Promise.all(productTasks);
      productsCreated += pRes.filter(r => r.status === 200).length;
      
      process.stdout.write(`\rStores: ${storesCreated}/100 | Products: ${productsCreated}`);
    } else {
        console.log("Failed to create store", i, res.error || res.status);
    }
  }
  
  console.log(`\n✓ Seed completed! Created ${storesCreated} stores and ${productsCreated} products.`);
}

seed().catch(console.error);
