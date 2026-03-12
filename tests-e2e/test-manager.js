const { chromium } = require('@playwright/test');
const fs = require('fs');

async function testManager() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  try {
    let testUsername = 'mock_manager_1';
    try { testUsername = fs.readFileSync('tests-e2e/manager_username.txt', 'utf8'); } catch(e){}

    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    
    // Login
    await page.goto('http://localhost:8081/');
    await page.fill('input[placeholder="Nombre de usuario"]', testUsername);
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Entrar al Panel")');
    console.log(`Login Manager (${testUsername}) exitoso`);
    
    await page.waitForTimeout(4000);
    await page.screenshot({ path: '2_manager_dashboard.png' });
    console.log('✓ Captura tomada: 2_manager_dashboard.png');

    // Inventory
    await page.goto('http://localhost:8081/inventory');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '2_manager_inventario.png' });
    console.log('✓ Captura tomada: 2_manager_inventario.png');

    // POS
    await page.goto('http://localhost:8081/pos');
    await page.waitForTimeout(2000); 
    await page.screenshot({ path: '2_manager_pos.png' });
    console.log('✓ Captura tomada: 2_manager_pos.png');

  } catch (error) {
    console.error('Error Manager:', error);
  } finally {
    await browser.close();
  }
}

testManager();
