const { chromium } = require('@playwright/test');

async function testSuperAdmin() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    
    // Login
    await page.goto('http://localhost:8081/');
    await page.fill('input[placeholder="Nombre de usuario"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'Admin123!');
    await page.click('button:has-text("Entrar al Panel")');
    console.log('Login Super Admin exitoso');
    
    // Dashboard Stats
    await page.waitForTimeout(4000); 
    await page.screenshot({ path: '1_superadmin_dashboard.png' });
    console.log('✓ Captura tomada: 1_superadmin_dashboard.png');

    // Users and getting a valid manager
    await page.goto('http://localhost:8081/admin/users');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '1_superadmin_usuarios.png' });
    console.log('✓ Captura tomada: 1_superadmin_usuarios.png');

    const managerUsername = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        for (let row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length > 2 && cells[2].innerText.includes('MANAGER') && cells[1].innerText.includes('mock_')) {
                return cells[1].innerText.trim();
            }
        }
        return 'mock_manager_1';
    });
    
    console.log(`Manager encontrado: ${managerUsername}`);
    
    const fs = require('fs');
    fs.writeFileSync('tests-e2e/manager_username.txt', managerUsername);

  } catch (error) {
    console.error('Error Super Admin:', error);
  } finally {
    await browser.close();
  }
}

testSuperAdmin();
