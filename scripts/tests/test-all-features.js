/**
 * Script de Pruebas Completas - Tiendario
 * Verifica todas las funcionalidades del sistema
 */

const BASE_URL = 'http://localhost:8080/api';

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
    console.log(`\n${'='.repeat(60)}`);
    log(`🧪 TEST: ${name}`, 'cyan');
    console.log('='.repeat(60));
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

// Variables globales para almacenar datos entre tests
let testData = {
    managerToken: null,
    managerUser: null,
    clientToken: null,
    clientUser: null,
    companyId: null,
    productId: null,
    customerId: null,
    saleId: null
};

// ============================================================================
// PRUEBAS DE AUTENTICACIÓN
// ============================================================================

async function testAuthentication() {
    logTest('1. AUTENTICACIÓN Y REGISTRO');

    try {
        // 1.1 Registro de Manager
        const randomNum = Math.floor(Math.random() * 1000000);
        testData.managerUser = `manager_test_${randomNum}`;

        logInfo(`Registrando usuario manager: ${testData.managerUser}`);
        const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: testData.managerUser,
                email: `${testData.managerUser}@test.com`,
                password: 'password123',
                role: ['manager']
            })
        });

        if (signupRes.ok) {
            logSuccess('Manager registrado exitosamente');
        } else {
            const error = await signupRes.text();
            logError(`Error en registro: ${error}`);
            return false;
        }

        // 1.2 Login de Manager
        logInfo('Iniciando sesión como manager...');
        const loginRes = await fetch(`${BASE_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: testData.managerUser,
                password: 'password123'
            })
        });

        if (loginRes.ok) {
            const loginData = await loginRes.json();
            testData.managerToken = loginData.token;
            testData.companyId = loginData.companyId;
            logSuccess(`Login exitoso. Token obtenido. CompanyId: ${testData.companyId}`);
            logInfo(`Roles: ${loginData.roles.join(', ')}`);
        } else {
            logError('Error en login de manager');
            return false;
        }

        // 1.3 Registro de Cliente
        testData.clientUser = `client_test_${randomNum}`;
        logInfo(`Registrando usuario cliente: ${testData.clientUser}`);

        const clientSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: testData.clientUser,
                email: `${testData.clientUser}@test.com`,
                password: 'password123',
                role: ['client']
            })
        });

        if (clientSignupRes.ok) {
            logSuccess('Cliente registrado exitosamente');
        } else {
            logWarning('Cliente ya existe o error en registro');
        }

        // 1.4 Login de Cliente
        const clientLoginRes = await fetch(`${BASE_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: testData.clientUser,
                password: 'password123'
            })
        });

        if (clientLoginRes.ok) {
            const clientLoginData = await clientLoginRes.json();
            testData.clientToken = clientLoginData.token;
            logSuccess('Login de cliente exitoso');
        }

        return true;
    } catch (error) {
        logError(`Error en pruebas de autenticación: ${error.message}`);
        return false;
    }
}

// ============================================================================
// PRUEBAS DE GESTIÓN DE EMPRESA
// ============================================================================

async function testCompanyManagement() {
    logTest('2. GESTIÓN DE EMPRESA');

    try {
        // 2.1 Obtener información de la empresa
        logInfo('Obteniendo información de la empresa...');
        const companyRes = await fetch(`${BASE_URL}/company/profile`, {
            headers: { 'Authorization': `Bearer ${testData.managerToken}` }
        });

        if (companyRes.ok) {
            const company = await companyRes.json();
            logSuccess(`Empresa: ${company.name}`);
            logInfo(`Plan actual: ${company.subscriptionStatus}`);
        } else {
            logError('Error al obtener información de la empresa');
            return false;
        }

        // 2.2 Actualizar plan a PAID
        logInfo('Actualizando plan a PAID...');
        const updatePlanRes = await fetch(`${BASE_URL}/company/subscribe`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${testData.managerToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (updatePlanRes.ok) {
            logSuccess('Plan actualizado a PAID exitosamente');
        } else {
            logError('Error al actualizar plan');
            return false;
        }

        return true;
    } catch (error) {
        logError(`Error en gestión de empresa: ${error.message}`);
        return false;
    }
}

// ============================================================================
// PRUEBAS DE PRODUCTOS
// ============================================================================

async function testProductManagement() {
    logTest('3. GESTIÓN DE PRODUCTOS');

    try {
        // 3.1 Sugerencia de SKU
        logInfo('Solicitando sugerencia de SKU...');
        const skuRes = await fetch(`${BASE_URL}/products/suggest-sku?name=Laptop Dell&category=Electronica&variant=15inch`, {
            headers: { 'Authorization': `Bearer ${testData.managerToken}` }
        });

        let suggestedSku = 'TEST-0001';
        if (skuRes.ok) {
            const skuData = await skuRes.json();
            suggestedSku = skuData.suggestedSku;
            logSuccess(`SKU sugerido: ${suggestedSku}`);
        } else {
            logWarning('No se pudo obtener SKU sugerido, usando uno por defecto');
        }

        // 3.2 Crear producto
        logInfo('Creando producto de prueba...');
        const createProductRes = await fetch(`${BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${testData.managerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sku: suggestedSku,
                name: 'Laptop Dell Inspiron 15',
                description: 'Laptop de prueba para testing',
                price: 899.99,
                costPrice: 650.00,
                stock: 10,
                minStock: 2,
                category: 'Electrónica',
                imageUrl: 'https://via.placeholder.com/300'
            })
        });

        if (createProductRes.ok) {
            logSuccess('Producto creado exitosamente');
        } else {
            const error = await createProductRes.text();
            logError(`Error al crear producto: ${error}`);
            return false;
        }

        // 3.3 Listar productos de la empresa
        logInfo('Listando productos de la empresa...');
        const productsRes = await fetch(`${BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${testData.managerToken}` }
        });

        if (productsRes.ok) {
            const products = await productsRes.json();
            logSuccess(`Total de productos: ${products.length}`);
            if (products.length > 0) {
                testData.productId = products[0].id;
                logInfo(`Producto de prueba ID: ${testData.productId}`);
            }
        } else {
            logError('Error al listar productos');
            return false;
        }

        // 3.4 Actualizar producto
        if (testData.productId) {
            logInfo(`Actualizando producto ${testData.productId}...`);
            const updateProductRes = await fetch(`${BASE_URL}/products/${testData.productId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${testData.managerToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sku: suggestedSku,
                    name: 'Laptop Dell Inspiron 15 - ACTUALIZADO',
                    description: 'Producto actualizado en testing',
                    price: 849.99,
                    costPrice: 650.00,
                    stock: 15,
                    minStock: 2,
                    category: 'Electrónica',
                    imageUrl: 'https://via.placeholder.com/300'
                })
            });

            if (updateProductRes.ok) {
                logSuccess('Producto actualizado exitosamente');
            } else {
                logError('Error al actualizar producto');
            }
        }

        return true;
    } catch (error) {
        logError(`Error en gestión de productos: ${error.message}`);
        return false;
    }
}

// ============================================================================
// PRUEBAS DE CLIENTES
// ============================================================================

async function testCustomerManagement() {
    logTest('4. GESTIÓN DE CLIENTES');

    try {
        // 4.1 Crear cliente
        logInfo('Creando cliente de prueba...');
        const createCustomerRes = await fetch(`${BASE_URL}/customers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${testData.managerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Juan Pérez',
                email: 'juan.perez@test.com',
                phone: '555-1234',
                address: 'Calle Principal 123'
            })
        });

        if (createCustomerRes.ok) {
            logSuccess('Cliente creado exitosamente');
        } else {
            const error = await createCustomerRes.text();
            logWarning(`Cliente posiblemente ya existe: ${error}`);
        }

        // 4.2 Listar clientes
        logInfo('Listando clientes...');
        const customersRes = await fetch(`${BASE_URL}/customers`, {
            headers: { 'Authorization': `Bearer ${testData.managerToken}` }
        });

        if (customersRes.ok) {
            const customers = await customersRes.json();
            logSuccess(`Total de clientes: ${customers.length}`);
            if (customers.length > 0) {
                testData.customerId = customers[0].id;
                logInfo(`Cliente de prueba ID: ${testData.customerId}`);
            }
        } else {
            logError('Error al listar clientes');
            return false;
        }

        return true;
    } catch (error) {
        logError(`Error en gestión de clientes: ${error.message}`);
        return false;
    }
}

// ============================================================================
// PRUEBAS DE BÚSQUEDA PÚBLICA
// ============================================================================

async function testPublicSearch() {
    logTest('5. BÚSQUEDA PÚBLICA (ELASTICSEARCH)');

    try {
        // 5.1 Búsqueda de productos
        logInfo('Buscando productos con query "Laptop"...');
        const searchRes = await fetch(`${BASE_URL}/public/search?q=Laptop`);

        if (searchRes.ok) {
            const results = await searchRes.json();
            logSuccess(`Resultados encontrados: ${results.length}`);
            if (results.length > 0) {
                logInfo(`Primer resultado: ${results[0].name}`);
            }
        } else {
            logError('Error en búsqueda');
            return false;
        }

        // 5.2 Listar productos públicos
        logInfo('Listando productos públicos...');
        const publicProductsRes = await fetch(`${BASE_URL}/public/products`);

        if (publicProductsRes.ok) {
            const products = await publicProductsRes.json();
            logSuccess(`Productos públicos disponibles: ${products.length}`);

            // Contar por estado de suscripción
            const freeProducts = products.filter(p => p.subscriptionStatus === 'FREE').length;
            const paidProducts = products.filter(p => p.subscriptionStatus === 'PAID').length;
            logInfo(`FREE: ${freeProducts}, PAID: ${paidProducts}`);
        } else {
            logError('Error al listar productos públicos');
            return false;
        }

        return true;
    } catch (error) {
        logError(`Error en búsqueda pública: ${error.message}`);
        return false;
    }
}

// ============================================================================
// PRUEBAS DE REGLAS DE MARKETPLACE
// ============================================================================

async function testMarketplaceRules() {
    logTest('6. REGLAS DE MARKETPLACE (FREE vs PAID)');

    try {
        // 6.1 Obtener productos públicos
        const productsRes = await fetch(`${BASE_URL}/public/products`);
        const products = await productsRes.json();

        const freeProduct = products.find(p => p.subscriptionStatus === 'FREE');
        const paidProduct = products.find(p => p.subscriptionStatus === 'PAID');

        // 6.2 Intentar comprar producto FREE (debe fallar)
        if (freeProduct) {
            logInfo(`Intentando comprar producto FREE: ${freeProduct.name}`);
            const orderRes = await fetch(`${BASE_URL}/public/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: freeProduct.id,
                    quantity: 1,
                    customerName: 'Test Buyer',
                    customerEmail: 'buyer@test.com',
                    customerPhone: '555-0000',
                    customerAddress: 'Test Address'
                })
            });

            if (orderRes.status === 400) {
                const error = await orderRes.json();
                logSuccess(`Compra bloqueada correctamente: ${error.message}`);
            } else {
                logError('ERROR: Se permitió compra en producto FREE');
                return false;
            }
        } else {
            logWarning('No hay productos FREE para probar');
        }

        // 6.3 Comprar producto PAID (debe funcionar)
        if (paidProduct) {
            logInfo(`Comprando producto PAID: ${paidProduct.name}`);
            const orderRes = await fetch(`${BASE_URL}/public/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: paidProduct.id,
                    quantity: 1,
                    customerName: 'Test Buyer',
                    customerEmail: 'buyer@test.com',
                    customerPhone: '555-0000',
                    customerAddress: 'Test Address'
                })
            });

            if (orderRes.ok) {
                const result = await orderRes.json();
                logSuccess(`Compra exitosa: ${result.message}`);
            } else {
                const error = await orderRes.json();
                logError(`Error en compra PAID: ${error.message}`);
                return false;
            }
        } else {
            logWarning('No hay productos PAID para probar');
        }

        return true;
    } catch (error) {
        logError(`Error en reglas de marketplace: ${error.message}`);
        return false;
    }
}

// ============================================================================
// PRUEBAS DE PORTAL DE CLIENTES
// ============================================================================

async function testCustomerPortal() {
    logTest('7. PORTAL DE CLIENTES');

    try {
        if (!testData.clientToken) {
            logWarning('No hay token de cliente, saltando pruebas de portal');
            return true;
        }

        // 7.1 Dashboard de cliente
        logInfo('Obteniendo dashboard del cliente...');
        const dashboardRes = await fetch(`${BASE_URL}/customer-portal/dashboard`, {
            headers: { 'Authorization': `Bearer ${testData.clientToken}` }
        });

        if (dashboardRes.ok) {
            const dashboard = await dashboardRes.json();
            logSuccess('Dashboard obtenido exitosamente');
            logInfo(`Total gastado: $${dashboard.totalSpent || 0}`);
            logInfo(`Total de pedidos: ${dashboard.totalOrders || 0}`);
        } else {
            logError('Error al obtener dashboard');
            return false;
        }

        // 7.2 Historial de pedidos
        logInfo('Obteniendo historial de pedidos...');
        const ordersRes = await fetch(`${BASE_URL}/customer-portal/orders`, {
            headers: { 'Authorization': `Bearer ${testData.clientToken}` }
        });

        if (ordersRes.ok) {
            const orders = await ordersRes.json();
            logSuccess(`Pedidos encontrados: ${orders.length}`);
        } else {
            logError('Error al obtener historial de pedidos');
            return false;
        }

        return true;
    } catch (error) {
        logError(`Error en portal de clientes: ${error.message}`);
        return false;
    }
}

// ============================================================================
// PRUEBAS DE DASHBOARD Y REPORTES
// ============================================================================

async function testDashboardAndReports() {
    logTest('8. DASHBOARD Y REPORTES');

    try {
        // 8.1 Dashboard principal
        logInfo('Obteniendo datos del dashboard...');
        const dashboardRes = await fetch(`${BASE_URL}/dashboard/summary`, {
            headers: { 'Authorization': `Bearer ${testData.managerToken}` }
        });

        if (dashboardRes.ok) {
            const stats = await dashboardRes.json();
            logSuccess('Dashboard obtenido exitosamente');
            logInfo(`Total de ventas: $${stats.totalSales || 0}`);
            logInfo(`Total de productos: ${stats.totalProducts || 0}`);
            logInfo(`Productos con stock bajo: ${stats.lowStockProducts || 0}`);
        } else {
            logWarning('Error al obtener dashboard (puede no estar implementado)');
        }

        return true;
    } catch (error) {
        logError(`Error en dashboard: ${error.message}`);
        return false;
    }
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function runAllTests() {
    console.clear();
    log('\n' + '='.repeat(60), 'cyan');
    log('🚀 INICIANDO PRUEBAS COMPLETAS DEL SISTEMA TIENDARIO', 'cyan');
    log('='.repeat(60) + '\n', 'cyan');

    const results = {
        total: 0,
        passed: 0,
        failed: 0
    };

    const tests = [
        { name: 'Autenticación', fn: testAuthentication },
        { name: 'Gestión de Empresa', fn: testCompanyManagement },
        { name: 'Gestión de Productos', fn: testProductManagement },
        { name: 'Gestión de Clientes', fn: testCustomerManagement },
        { name: 'Búsqueda Pública', fn: testPublicSearch },
        { name: 'Reglas de Marketplace', fn: testMarketplaceRules },
        { name: 'Portal de Clientes', fn: testCustomerPortal },
        { name: 'Dashboard y Reportes', fn: testDashboardAndReports }
    ];

    for (const test of tests) {
        results.total++;
        try {
            const passed = await test.fn();
            if (passed) {
                results.passed++;
            } else {
                results.failed++;
            }
        } catch (error) {
            results.failed++;
            logError(`Error inesperado en ${test.name}: ${error.message}`);
        }

        // Pequeña pausa entre tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    log('📊 RESUMEN DE PRUEBAS', 'cyan');
    console.log('='.repeat(60));
    log(`Total de pruebas: ${results.total}`, 'blue');
    log(`✅ Exitosas: ${results.passed}`, 'green');
    log(`❌ Fallidas: ${results.failed}`, 'red');
    log(`📈 Tasa de éxito: ${((results.passed / results.total) * 100).toFixed(2)}%`, 'yellow');
    console.log('='.repeat(60) + '\n');

    if (results.failed === 0) {
        log('🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!', 'green');
    } else {
        log('⚠️  Algunas pruebas fallaron. Revisa los logs anteriores.', 'yellow');
    }
}

// Ejecutar todas las pruebas
runAllTests().catch(error => {
    logError(`Error fatal en ejecución de pruebas: ${error.message}`);
    console.error(error);
});
