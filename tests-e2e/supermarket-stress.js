/**
 * Tiendario — Supermarket Enterprise Stress Test
 * 
 * Simula el escenario de negocio de múltiples supermercados (Tenants)
 * funcionando simultáneamente sobre la misma base de datos (PostgreSQL).
 * 
 * Escenario:
 *  1. Onboarding de N tiendas (Supermercados).
 *  2. Cada tienda sube sus productos iniciales.
 *  3. Simulación de tráfico masivo de ventas concurrentes en TODAS las tiendas.
 *  4. Medición de respuesta del Dashboard Global (Agregación de datos).
 */

const http = require('http');

const CONFIG = {
  baseUrl: 'http://localhost:8080',
  adminUser: 'admin',
  adminPass: 'admin123',
  numStores: 20,         // Probaremos con 20 primero, luego puedes subir a 100
  productsPerStore: 20,  // Total 1,000 productos
  salesPerStore: 10,     // Total 200 ventas masivas
  concurrency: 10
};

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', blue: '\x1b[34m', gray: '\x1b[90m'
};

const log = (msg) => process.stdout.write(msg + '\n');
const section = (title) => log(`\n${C.bold}${C.cyan}━━━ ${title} ${'━'.repeat(Math.max(0, 60 - title.length))}${C.reset}`);

// ─── HTTP Helper ──────────────────────────────────────────────────────────
function request(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const options = {
      hostname: 'localhost', port: 8080, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const latency = Date.now() - startTime;
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, latency, data: parsed });
      });
    });
    req.on('error', (e) => resolve({ status: 0, latency: Date.now() - startTime, error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function runTest() {
  section('TIENDARIO — ENTERPRISE STRESS TEST (POSTGRESQL)');
  log(`  Simulando ${CONFIG.numStores} supermercados independientes...\n`);

  // 1. LOGIN ADMIN
  log(`  ${C.gray}Iniciando sesión como SuperAdmin...${C.reset}`);
  const adminLogin = await request('POST', '/api/auth/signin', { username: CONFIG.adminUser, password: CONFIG.adminPass });
  if (adminLogin.status !== 200) { log(`${C.red}  ✗ Falló login admin. Abortando.${C.reset}`); return; }
  const adminToken = adminLogin.data.token;

  // 2. ONBOARDING DE TIENDAS
  section(`FASE 1: Onboarding de ${CONFIG.numStores} Supermercados`);
  const stores = [];
  for (let i = 1; i <= CONFIG.numStores; i++) {
    const storeData = {
      companyName: `Supermercado ${i}`,
      username: `manager_test_${i}`,
      email: `manager${i}_${Date.now()}@test.com`,
      password: 'password123',
      phone: '123456789',
      description: `Tienda de prueba de estrés ${i}`,
      subscriptionStatus: 'PAID'
    };
    process.stdout.write(`  Registrando ${storeData.companyName}... `);
    const res = await request('POST', '/api/superadmin/onboard', storeData, adminToken);
    if (res.status === 200) {
      log(`${C.green}OK${C.reset}`);
      stores.push({ ...storeData, companyId: res.data.companyId });
    } else {
      log(`${C.red}ERROR (${res.status})${C.reset}`);
    }
  }

  // 3. SEED PRODUCTS
  section(`FASE 2: Poblando inventario (${CONFIG.productsPerStore} productos por tienda)`);
  for (const store of stores) {
    process.stdout.write(`  Cargando productos para ${store.companyName}... `);
    // Login as manager
    const login = await request('POST', '/api/auth/signin', { username: store.username, password: store.password });
    store.token = login.data.token;

    const products = [];
    for (let j = 1; j <= CONFIG.productsPerStore; j++) {
      const prod = {
        name: `Producto ${j} de ${store.companyName}`,
        sku: `SKU-${store.companyId}-${j}`,
        price: (Math.random() * 100).toFixed(2),
        stock: 1000,
        description: 'Descripción de prueba'
      };
      const res = await request('POST', '/api/products', prod, store.token);
      if (res.status === 200 || res.status === 201) products.push(res.data);
    }
    store.sampleProduct = products[0];
    log(`${C.green}${products.length} productos OK${C.reset}`);
  }

  // 4. MASSIVE SALES (STRESS)
  section(`FASE 3: Estrés de Ventas (Simulando cobro masivo concurrente)`);
  log(`  Generando ${CONFIG.salesPerStore * stores.length} ventas simultáneas...`);
  
  const startSales = Date.now();
  const salesPromises = [];
  
  for (const store of stores) {
    for (let k = 0; k < CONFIG.salesPerStore; k++) {
      const sale = {
        items: [{ product: { id: store.sampleProduct.id }, quantity: 1, unitPrice: store.sampleProduct.price, subtotal: store.sampleProduct.price }],
        totalAmount: store.sampleProduct.price,
        customerName: 'Cliente Stress Test',
        status: 'PAID',
        payments: [{ amount: store.sampleProduct.price, currencyCode: 'USD', method: 'CASH', exchangeRate: 1, amountInBaseCurrency: store.sampleProduct.price }]
      };
      salesPromises.push(request('POST', '/api/sales', sale, store.token));
    }
  }

  const salesResults = await Promise.all(salesPromises);
  const totalSalesTime = Date.now() - startSales;
  
  const salesOk = salesResults.filter(r => r.status === 200 || r.status === 201).length;
  const salesError = salesResults.length - salesOk;
  const avgLatency = Math.round(salesResults.reduce((a, b) => a + b.latency, 0) / salesResults.length);

  log(`\n  ${C.bold}Resultados de Ventas:${C.reset}`);
  log(`  ✓ Éxito: ${C.green}${salesOk}${C.reset} | ✗ Error: ${C.red}${salesError}${C.reset}`);
  log(`  Tiempo Total: ${totalSalesTime}ms`);
  log(`  Latencia Promedio por Venta: ${C.yellow}${avgLatency}ms${C.reset}`);

  // 5. DASHBOARD GLOBAL QUERY
  section('FASE 4: Rendimiento del Dashboard SuperAdmin');
  log('  Consultando métricas agregadas de todas las tiendas...');
  const startDash = Date.now();
  const dashRes = await request('GET', '/api/superadmin/stats', null, adminToken);
  const dashTime = Date.now() - startDash;

  if (dashRes.status === 200) {
    log(`${C.green}  ✓ Dashboard cargado en ${dashTime}ms${C.reset}`);
    log(`  Empresas activas reportadas: ${dashRes.data.totalCompanies}`);
  } else {
    log(`${C.red}  ✗ Error al cargar Dashboard (${dashRes.status})${C.reset}`);
  }

  section('CONCLUSIÓN');
  if (salesError === 0 && dashTime < 1000) {
    log(`${C.green}${C.bold}SISTEMA ALTAMENTE RENTABLE${C.reset}`);
    log('El sistema soportó la carga masiva sin errores y con latencias bajas.');
  } else if (salesError > 0) {
    log(`${C.red}${C.bold}ALERTA DE ESTABILIDAD${C.reset}`);
    log(`Se detectaron ${salesError} fallos bajo carga. Revisa los logs del backend.`);
  } else {
    log(`${C.yellow}${C.bold}ADVERTENCIA DE RENDIMIENTO${C.reset}`);
    log(`El Dashboard tardó ${dashTime}ms. Optimizar queries para >100 tiendas.`);
  }
  log('\n');
}

runTest().catch(console.error);
