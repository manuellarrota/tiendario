const { test, expect } = require('@playwright/test');

test.describe('Tiendario E2E Flow', () => {
    const uniqueId = Date.now();
    const storeName = `Test Store ${uniqueId}`;
    const username = `manager_${uniqueId}`;
    const password = 'password123';
    const productName = `Product ${uniqueId}`;

    test('Full business cycle: Register -> Product -> Purchase -> Admin Check', async ({ page }) => {
        // 1. Register
        await page.goto('http://localhost:8081/register');
        await page.fill('input[placeholder="Nombre de tu negocio"]', storeName);
        await page.fill('input[placeholder="Nombre de usuario"]', username);
        await page.fill('input[placeholder="Correo electrónico"]', `${username}@test.com`);
        await page.fill('input[placeholder="Contraseña"]', password);
        await page.click('button:has-text("Crear Cuenta")');

        // Wait for success message and redirection
        await expect(page.locator('.alert-success')).toBeVisible();
        await page.waitForURL('**/login', { timeout: 10000 });

        // 2. Login
        await page.fill('input[placeholder="Nombre de usuario"]', username);
        await page.fill('input[placeholder="Contraseña"]', password);
        await page.click('button:has-text("Ingresar")');
        await expect(page.getByText('Panel de Control')).toBeVisible();

        // 3. Create Product
        await page.goto('http://localhost:8081/inventory');
        await page.click('button:has-text("Nuevo Producto")');
        await page.fill('input[placeholder="Ej: Zapatillas Running"]', productName);
        await page.selectOption('select', { label: 'Tecnología' });
        await page.fill('input[type="number"]:near(:text("Precio Venta"))', '50.50');
        await page.fill('input[type="number"]:near(:text("Stock Inicial"))', '100');
        await page.click('button:has-text("Guardar Producto")');
        await expect(page.getByText(productName)).toBeVisible();

        // 4. Marketplace Check & Purchase
        // We need the shop ID or just search by name
        await page.goto('http://localhost:8082');
        await page.fill('input[placeholder*="Buscar"]', productName);
        await page.keyboard.press('Enter');

        // Find product card and buy (Wait for Elasticsearch to index)
        await page.waitForTimeout(2000);
        await page.reload();

        const productCard = page.locator(`.card:has-text("${productName}")`);
        await expect(productCard).toBeVisible();

        // Note: New stores are PAID by default in our test setup or need manual activation?
        // Let's assume they are PAID for now or handle the case.
        const buyButton = productCard.locator('button:has-text("Comprar")');
        if (await buyButton.isVisible()) {
            await buyButton.click();
            await page.fill('input[placeholder="Tu Nombre"]', 'Test Customer');
            await page.fill('input[placeholder="Teléfono"]', '123456789');
            await page.click('button:has-text("Confirmar Pedido")');
            await expect(page.getByText('Pedido recibido')).toBeVisible();
        }

        // 5. Admin Check Order
        await page.goto('http://localhost:8081/sales');
        await expect(page.getByText('Test Customer')).toBeVisible();
    });
});
