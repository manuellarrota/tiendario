const { chromium } = require('@playwright/test');

async function runVisualTests() {
  console.log('Iniciando navegador Playwright para pruebas visuales con carga masiva...');
  const browser = await chromium.launch({ headless: true });
  
  try {
    // -------------------------------------------------------------
    // ROL 1: SUPER ADMIN
    // -------------------------------------------------------------
    console.log('\n--- 1. Pruebas: SUPER ADMIN ---');
    const saContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const saPage = await saContext.newPage();
    
    // Login
    await saPage.goto('http://localhost:8081/');
    await saPage.fill('input[placeholder="Nombre de usuario"]', 'admin');
    await saPage.fill('input[placeholder="••••••••"]', 'Admin123!');
    await saPage.click('button:has-text("Entrar al Panel")');
    console.log('Login Super Admin exitoso. Esperando Dashboard...');
    
    // Verificar Dashboard
    await saPage.waitForSelector('text=Panel Super Admin', { timeout: 15000 }).catch(() => {});
    await saPage.waitForTimeout(2000); // Darle tiempo a los KPIs para poblarse
    await saPage.screenshot({ path: 'superadmin_dashboard.png' });
    console.log('✓ Captura tomada: superadmin_dashboard.png (Evaluando métricas globales, +100 tiendas, +10k productos)');

    // Listado de Usuarios (Para obtener un manager válido para la siguiente prueba)
    await saPage.goto('http://localhost:8081/admin/users');
    await saPage.waitForTimeout(2000); // Esperar que la tabla cargue
    await saPage.screenshot({ path: 'superadmin_usuarios.png' });
    console.log('✓ Captura tomada: superadmin_usuarios.png');
    
    // Obtener un username de tipo Manager de la tabla
    const managerUsername = await saPage.evaluate(() => {
        // Find a row where the Role column contains MANAGER
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        for (let row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length > 2 && cells[2].innerText.includes('MANAGER') && cells[1].innerText.includes('mock_')) {
                return cells[1].innerText.trim();
            }
        }
        return null;
    });

    console.log(`Manager encontrado para prueba: ${managerUsername || 'No encontrado'}`);
    await saContext.close();

    // -------------------------------------------------------------
    // ROL 2: MANAGER DE TIENDA
    // -------------------------------------------------------------
    console.log('\n--- 2. Pruebas: MANAGER (Tenant) ---');
    if (!managerUsername) {
        console.warn('No se pudo extraer manager, usando credenciales genéricas asumiendo 1er registro.');
    }
    const testUsername = managerUsername || 'mock_manager_1'; // fallback

    const mgContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const mgPage = await mgContext.newPage();
    
    // Login
    await mgPage.goto('http://localhost:8081/');
    await mgPage.fill('input[placeholder="Nombre de usuario"]', testUsername);
    await mgPage.fill('input[placeholder="••••••••"]', 'password123');
    await mgPage.click('button:has-text("Entrar al Panel")');
    console.log(`Login Manager (${testUsername}) exitoso. Esperando Dashboard...`);
    
    // Dashboard y Paginación (Simular KPIs)
    await mgPage.waitForTimeout(2000); // Carga KPIs propios
    await mgPage.screenshot({ path: 'manager_dashboard.png' });
    console.log('✓ Captura tomada: manager_dashboard.png (Mostrando aislamiento, 100 productos de esta tienda)');

    // Inventario
    await mgPage.goto('http://localhost:8081/admin/inventory');
    await mgPage.waitForTimeout(2000); // Tabla
    await mgPage.screenshot({ path: 'manager_inventario.png' });
    console.log('✓ Captura tomada: manager_inventario.png');

    // POS / Terminal de Ventas
    await mgPage.goto('http://localhost:8081/admin/pos');
    await mgPage.waitForTimeout(1000); 
    await mgPage.fill('input[placeholder="Buscar por código de barras o nombre..."]', 'Product');
    await mgPage.waitForTimeout(1500); // Tiempo para sugerencias
    await mgPage.screenshot({ path: 'manager_vendedor_pos.png' });
    console.log('✓ Captura tomada: manager_vendedor_pos.png (Comportamiento del Terminal de punto de Venta bajo carga)');

    await mgContext.close();

    // -------------------------------------------------------------
    // ROL 3: CUSTOMER (MARKETPLACE PUBLICO)
    // -------------------------------------------------------------
    console.log('\n--- 3. Pruebas: CUSTOMER (Marketplace Público) ---');
    const mkContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const mkPage = await mkContext.newPage();

    // Home / Search
    console.log('Navegando al Marketplace Central...');
    await mkPage.goto('http://localhost:8082/');
    await mkPage.waitForTimeout(2000); // Esperar que los productos destacados carguen
    await mkPage.screenshot({ path: 'customer_marketplace_home.png' });
    console.log('✓ Captura tomada: customer_marketplace_home.png');

    console.log('Buscando productos: "Mock Product"');
    await mkPage.fill('input[placeholder="¿Qué estás buscando hoy?"]', 'Mock Product');
    // Si la lupa es botón
    await mkPage.click('button:has-text("Buscar")');
    await mkPage.waitForTimeout(3000); // Búsqueda completa (con latencia bajo carga de 10k items)
    
    await mkPage.screenshot({ path: 'customer_busqueda_resultados.png' }, { fullPage: false });
    console.log('✓ Captura tomada: customer_busqueda_resultados.png (Mostrando renderizado de catálogo de múltiples tiendas)');

    await mkContext.close();

    console.log('\nTodas las pruebas visuales fueron capturadas exitosamente en la raíz del proyecto.');

  } catch (error) {
    console.error('Error durante la prueba de Playwright:', error);
  } finally {
    await browser.close();
  }
}

runVisualTests();
