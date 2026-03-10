const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('http://localhost:8082');
        await page.click('button:has-text("Iniciar Sesión")');
        await page.waitForSelector('input[placeholder*="tu@email.com"]');
        await page.fill('input[placeholder*="tu@email.com"]', 'hunter@test.com');
        await page.fill('input[type="password"]', 'hunter123');
        await page.click('button:has-text("Ingresar")');

        // Wait for page to reload/navigate after successful login
        await page.waitForNavigation({ waitUntil: 'networkidle' });

        await page.goto('http://localhost:8082/dashboard');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'dashboard_fixed.png' });
        console.log('Screenshot taken!');
    } catch (e) {
        console.error(e);
        await page.screenshot({ path: 'dashboard_fixed_error.png' }).catch(console.error);
    } finally {
        await browser.close();
    }
})();
