const { test, expect } = require('@playwright/test');

test.describe('SuperAdmin Flow', () => {

    test('SuperAdmin can manage catalog', async ({ page }) => {
        // 1. Login as SuperAdmin
        await page.goto('http://localhost:8081/login');
        await page.fill('input[placeholder="Nombre de usuario"]', 'admin');
        await page.fill('input[placeholder="Contraseña"]', 'admin123');
        await page.click('button:has-text("Ingresar")');

        // Wait for dashboard
        await expect(page.getByText('Super Admin')).toBeVisible();

        // 2. Navigate to Catalog
        // Assuming there's a link in Sidebar "Catálogo Global"
        await page.click('a:has-text("Catálogo Global")');
        await expect(page.getByText('Gestión de Catálogo Global')).toBeVisible();

        // 3. Edit a product (if any exists)
        // Let's assume there is at least one product from seeders
        const firstRow = page.locator('table tbody tr').first();
        if (await firstRow.isVisible()) {
            await firstRow.locator('button:has-text("Editar")').click();
            await expect(page.getByText('Editar Producto Global')).toBeVisible();

            const newName = "Updated Product " + Date.now();
            await page.fill('input[value]', newName); // This might be tricky if multiple inputs have values
            // More specific selector
            await page.locator('label:has-text("Nombre del Producto") + input').fill(newName);

            await page.click('button:has-text("Guardar Cambios")');
            await expect(page.getByText(newName)).toBeVisible();
        }
    });

    test('SuperAdmin can manage companies', async ({ page }) => {
        await page.goto('http://localhost:8081/login');
        await page.fill('input[placeholder="Nombre de usuario"]', 'admin');
        await page.fill('input[placeholder="Contraseña"]', 'admin123');
        await page.click('button:has-text("Ingresar")');

        await page.click('a:has-text("Empresas")');
        await expect(page.getByText('Gestión de Empresas')).toBeVisible();

        // Check company list
        const rows = page.locator('table tbody tr');
        await expect(rows.count()).toBeGreaterThan(0);
    });
});
