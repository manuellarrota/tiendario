const { chromium } = require('@playwright/test');

async function testUsers() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    
    await page.goto('http://localhost:8081/');
    await page.fill('input[placeholder="Nombre de usuario"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'Admin123!');
    await page.click('button:has-text("Entrar al Panel")');
    await page.waitForTimeout(5000); // give it time to load the dashboard

    await page.goto('http://localhost:8081/admin/users');
    await page.waitForTimeout(5000); 

    await page.screenshot({ path: 'test_admin_users.png' });
    console.log('Success test_admin_users.png');
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}

testUsers();
