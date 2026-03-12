const { chromium } = require('@playwright/test');

async function testCustomer() {
  console.log('--- 3. Pruebas: CUSTOMER (Marketplace Público) ---');
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    // Home / Search
    await page.goto('http://localhost:8082/');
    await page.waitForTimeout(4000); 
    await page.screenshot({ path: '3_customer_marketplace_home.png' });
    console.log('✓ Captura tomada: 3_customer_marketplace_home.png');

    console.log('Buscando productos: "Mock Product"');
    await page.fill('input[placeholder="¿Qué estás buscando hoy?"]', 'Mock Product');
    await page.click('button:has-text("Buscar")');
    await page.waitForTimeout(5000); // Latency
    
    await page.screenshot({ path: '3_customer_busqueda_resultados.png' });
    console.log('✓ Captura tomada: 3_customer_busqueda_resultados.png');

  } catch (error) {
    console.error('Error Customer:', error);
  } finally {
    await browser.close();
  }
}

testCustomer();
