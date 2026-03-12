/**
 * Tiendario — Stress Test Suite
 * 
 * Cubre:
 *  1. Auth      — Login bajo carga concurrente
 *  2. Products  — Listado paginado de productos (endpoint más consultado)
 *  3. Public    — Búsqueda pública del marketplace (Elasticsearch / fallback)
 *  4. POS       — Crear ventas (escritura más crítica)
 *  5. Dashboard — KPIs (query más pesada)
 *
 * Uso:  node stress-test.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:8080';
const ADMIN_USER = 'manager_pro';
const ADMIN_PASS = 'manager123';

// ─── Colores para terminal ─────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', blue: '\x1b[34m', magenta: '\x1b[35m', gray: '\x1b[90m',
};
const log = (msg) => process.stdout.write(msg + '\n');
const section = (title) => log(`\n${C.bold}${C.cyan}━━━ ${title} ${'━'.repeat(Math.max(0, 50 - title.length))}${C.reset}`);

// ─── HTTP helper ──────────────────────────────────────────────────────────
function request(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const options = {
      hostname: 'localhost',
      port: 8080,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const latency = Date.now() - startTime;
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, latency, data: parsed, raw: data });
      });
    });

    req.on('error', (e) => {
      resolve({ status: 0, latency: Date.now() - startTime, error: e.message });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ status: 408, latency: 15000, error: 'timeout' });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Run N concurrent requests ────────────────────────────────────────────
async function concurrentLoad(name, fn, concurrency, totalRequests) {
  const results = { ok: 0, errors: 0, latencies: [], statuses: {} };
  const batches = Math.ceil(totalRequests / concurrency);

  process.stdout.write(`  ${C.gray}Running ${totalRequests} requests (${concurrency} concurrent)...${C.reset} `);

  for (let b = 0; b < batches; b++) {
    const batchSize = Math.min(concurrency, totalRequests - b * concurrency);
    const promises = Array.from({ length: batchSize }, () => fn());
    const batchResults = await Promise.all(promises);

    for (const r of batchResults) {
      results.latencies.push(r.latency);
      results.statuses[r.status] = (results.statuses[r.status] || 0) + 1;
      if (r.status >= 200 && r.status < 300) results.ok++;
      else results.errors++;
    }
    process.stdout.write('.');
  }

  process.stdout.write('\n');
  return results;
}

// ─── Statistics ───────────────────────────────────────────────────────────
function stats(latencies) {
  if (!latencies.length) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (pct) => sorted[Math.floor((pct / 100) * sorted.length)] || sorted[sorted.length - 1];
  const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  return { min: sorted[0], max: sorted[sorted.length - 1], avg, p50: p(50), p95: p(95), p99: p(99) };
}

function printStats(name, results, totalTime) {
  const s = stats(results.latencies);
  const total = results.ok + results.errors;
  const rps = Math.round((total / totalTime) * 1000);
  const successRate = ((results.ok / total) * 100).toFixed(1);
  const color = results.errors === 0 ? C.green : results.errors / total > 0.05 ? C.red : C.yellow;

  log(`\n  ${C.bold}${name}${C.reset}`);
  log(`  ${color}✓ ${results.ok} ok  ✗ ${results.errors} err  (${successRate}% success)${C.reset}`);
  log(`  Throughput: ${C.bold}${rps} req/s${C.reset}`);
  log(`  Latency (ms): min=${s.min}  avg=${s.avg}  p50=${s.p50}  p95=${s.p95}  p99=${s.p99}  max=${s.max}`);
  log(`  Status codes: ${JSON.stringify(results.statuses)}`);

  return { name, ok: results.ok, errors: results.errors, successRate, rps, latency: s };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  log(`\n${C.bold}${C.blue}╔══════════════════════════════════════════════════╗`);
  log(`║       TIENDARIO — STRESS TEST SUITE             ║`);
  log(`╚══════════════════════════════════════════════════╝${C.reset}`);
  log(`  Target: ${BASE_URL}  |  ${new Date().toLocaleTimeString()}\n`);

  const summary = [];
  let token = null;
  let companyId = null;
  let sampleProductId = null;

  // ─────────────────────────────────────────────────────────────────────
  // FASE 0 — Autenticación inicial (obtener token válido)
  // ─────────────────────────────────────────────────────────────────────
  section('FASE 0 — Setup: Autenticación inicial');
  const loginRes = await request('POST', '/api/auth/signin', {
    username: ADMIN_USER, password: ADMIN_PASS,
  });

  if (loginRes.status !== 200 || !loginRes.data?.token) {
    log(`${C.red}✗ Login fallido (status ${loginRes.status}). Abortando.${C.reset}`);
    log(`  Respuesta: ${loginRes.raw?.substring(0, 200)}`);
    process.exit(1);
  }
  token = loginRes.data.token;
  companyId = loginRes.data.companyId;
  log(`${C.green}  ✓ Login OK — companyId: ${companyId} — latency: ${loginRes.latency}ms${C.reset}`);

  // Obtener un producto real para usar en ventas
  const prodsRes = await request('GET', '/api/products/?page=0&size=5', null, token);
  if (prodsRes.status === 200) {
    const prods = prodsRes.data?.products || prodsRes.data || [];
    if (prods.length > 0) {
      sampleProductId = prods[0].id;
      log(`${C.green}  ✓ Producto de muestra: ID=${sampleProductId} (${prods[0].name || 'N/A'})${C.reset}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // FASE 1 — Auth Stress: Login endpoint bajo carga
  // ─────────────────────────────────────────────────────────────────────
  section('FASE 1 — Auth: Login bajo carga');

  const t1 = Date.now();
  const auth10 = await concurrentLoad('login-10', () =>
    request('POST', '/api/auth/signin', { username: ADMIN_USER, password: ADMIN_PASS }),
    10, 50
  );
  summary.push(printStats('Login (10 concurrent, 50 total)', auth10, Date.now() - t1));

  await new Promise(r => setTimeout(r, 1000)); // Cooldown

  const t1b = Date.now();
  const auth25 = await concurrentLoad('login-25', () =>
    request('POST', '/api/auth/signin', { username: ADMIN_USER, password: ADMIN_PASS }),
    25, 100
  );
  summary.push(printStats('Login (25 concurrent, 100 total)', auth25, Date.now() - t1b));

  // ─────────────────────────────────────────────────────────────────────
  // FASE 2 — Product Listing: GET /api/products (más consultado)
  // ─────────────────────────────────────────────────────────────────────
  section('FASE 2 — Products: Listado paginado');
  await new Promise(r => setTimeout(r, 500));

  const t2a = Date.now();
  const prod20 = await concurrentLoad('products-20', () =>
    request('GET', '/api/products/?page=0&size=10', null, token),
    20, 100
  );
  summary.push(printStats('GET /products (20 concurrent, 100 total)', prod20, Date.now() - t2a));

  await new Promise(r => setTimeout(r, 500));

  const t2b = Date.now();
  const prod50 = await concurrentLoad('products-50', () =>
    request('GET', '/api/products/?page=0&size=20', null, token),
    50, 200
  );
  summary.push(printStats('GET /products (50 concurrent, 200 total)', prod50, Date.now() - t2b));

  // ─────────────────────────────────────────────────────────────────────
  // FASE 3 — Marketplace: Búsqueda pública (sin auth)
  // ─────────────────────────────────────────────────────────────────────
  section('FASE 3 — Marketplace: Búsqueda pública (sin auth)');
  await new Promise(r => setTimeout(r, 500));

  const searchTerms = ['cafe', 'ropa', 'producto', 'zapato', 'tecnologia'];
  let searchIdx = 0;

  const t3a = Date.now();
  const pub30 = await concurrentLoad('public-search-30', () => {
    const term = searchTerms[searchIdx++ % searchTerms.length];
    return request('GET', `/api/public/products?search=${term}&page=0&size=12`);
  }, 30, 150);
  summary.push(printStats('GET /public/products (30 concurrent, 150 total)', pub30, Date.now() - t3a));

  await new Promise(r => setTimeout(r, 500));

  const t3b = Date.now();
  const pub60 = await concurrentLoad('public-search-60', () => {
    const term = searchTerms[searchIdx++ % searchTerms.length];
    return request('GET', `/api/public/products?search=${term}&page=0&size=12`);
  }, 60, 300);
  summary.push(printStats('GET /public/products (60 concurrent, 300 total)', pub60, Date.now() - t3b));

  // ─────────────────────────────────────────────────────────────────────
  // FASE 4 — POS: Crear ventas (escritura crítica)
  // ─────────────────────────────────────────────────────────────────────
  section('FASE 4 — POS: Registrar ventas (escritura a DB)');
  await new Promise(r => setTimeout(r, 1000));

  if (sampleProductId) {
    const saleBody = {
      items: [{ productId: sampleProductId, quantity: 1, price: 10.00 }],
      total: 10.00,
      paymentMethod: 'CASH',
      customerId: null,
    };

    const t4a = Date.now();
    const pos5 = await concurrentLoad('pos-5', () =>
      request('POST', '/api/sales', saleBody, token),
      5, 20
    );
    summary.push(printStats('POST /sales (5 concurrent, 20 total)', pos5, Date.now() - t4a));

    await new Promise(r => setTimeout(r, 1000));

    const t4b = Date.now();
    const pos15 = await concurrentLoad('pos-15', () =>
      request('POST', '/api/sales', saleBody, token),
      15, 60
    );
    summary.push(printStats('POST /sales (15 concurrent, 60 total)', pos15, Date.now() - t4b));
  } else {
    log(`  ${C.yellow}⚠ Sin producto de muestra — saltando prueba de ventas${C.reset}`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // FASE 5 — Dashboard KPIs (query más pesada)
  // ─────────────────────────────────────────────────────────────────────
  section('FASE 5 — Dashboard: KPIs y métricas');
  await new Promise(r => setTimeout(r, 1000));

  const t5a = Date.now();
  const dash10 = await concurrentLoad('dashboard-10', () =>
    request('GET', '/api/dashboard/stats', null, token),
    10, 50
  );
  summary.push(printStats('GET /dashboard/stats (10 concurrent, 50 total)', dash10, Date.now() - t5a));

  // ─────────────────────────────────────────────────────────────────────
  // REPORTE FINAL
  // ─────────────────────────────────────────────────────────────────────
  section('REPORTE FINAL');

  const header = `  ${'Test'.padEnd(45)} ${'RPS'.padStart(6)} ${'p95ms'.padStart(7)} ${'p99ms'.padStart(7)} ${'Success'.padStart(8)}`;
  log(C.bold + header + C.reset);
  log('  ' + '─'.repeat(75));

  for (const r of summary) {
    const successColor = parseFloat(r.successRate) >= 99 ? C.green :
                         parseFloat(r.successRate) >= 95 ? C.yellow : C.red;
    const line = `  ${r.name.padEnd(45)} ${String(r.rps).padStart(6)} ${String(r.latency.p95).padStart(7)} ${String(r.latency.p99).padStart(7)} ${(r.successRate + '%').padStart(8)}`;
    log(successColor + line + C.reset);
  }

  log(`\n  ${C.gray}Fin: ${new Date().toLocaleTimeString()}${C.reset}`);

  // Recomendaciones de cómputo
  section('ESTIMACIÓN DE CÓMPUTO PARA PRODUCCIÓN');
  const maxRps = Math.max(...summary.map(r => r.rps));
  const maxP95 = Math.max(...summary.map(r => r.latency.p95));
  const criticalErrors = summary.filter(r => parseFloat(r.successRate) < 95).length;

  log(`  ${C.bold}Throughput máximo observado:${C.reset} ~${maxRps} req/s en entorno local`);
  log(`  ${C.bold}Latencia p95 máxima:${C.reset} ${maxP95}ms`);
  log(`  ${C.bold}Endpoints problemáticos (< 95% success):${C.reset} ${criticalErrors}`);
  log('');
  log(`  ${C.cyan}Recomendación AWS (estimado para 2x headroom):${C.reset}`);
  log(`  • Backend API: t3.small (2 vCPU, 2GB RAM) con Auto Scaling (min 1, max 3)`);
  log(`  • PostgreSQL:  db.t3.micro RDS (1 vCPU, 1GB) para <50 usuarios concurrentes`);
  log(`  •              db.t3.small  RDS (2 vCPU, 2GB) si p95 > 500ms en FASE 2`);
  log(`  • Elasticsearch: t3.small.elasticsearch (opcional, mejorar búsqueda pública)`);
  log(`  • Frontend:    S3 + CloudFront ($0 cómputo — archivos estáticos)`);
  log('');
}

main().catch((err) => {
  console.error('\n\x1b[31mError inesperado:\x1b[0m', err.message);
  process.exit(1);
});
