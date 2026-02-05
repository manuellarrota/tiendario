/**
 * Quick Admin Panel Verification Script
 * Tests login and product retrieval for a manager user
 */

async function verifyAdminPanel() {
    const BASE_URL = 'http://localhost:8080/api';
    const username = 'manager_v3_6';
    const password = 'password123';

    try {
        console.log('🔐 Testing login for', username);
        const loginRes = await fetch(`${BASE_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!loginRes.ok) {
            console.log('❌ Login failed:', loginRes.status);
            return;
        }

        const loginData = await loginRes.json();
        console.log('✅ Login successful!');
        console.log('   User:', loginData.username);
        console.log('   Roles:', loginData.roles);
        console.log('   Company ID:', loginData.companyId);
        console.log('   Subscription:', loginData.subscriptionStatus);

        const token = loginData.token;

        // Test products endpoint
        console.log('\n📦 Fetching products...');
        const productsRes = await fetch(`${BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (productsRes.ok) {
            const products = await productsRes.json();
            console.log('✅ Products found:', products.length);
            products.forEach(p => {
                console.log(`   - ${p.name} (${p.sku}): $${p.price} - Stock: ${p.stock}`);
            });
        } else {
            console.log('❌ Products fetch failed:', productsRes.status);
        }

        // Test dashboard endpoint
        console.log('\n📊 Fetching dashboard stats...');
        const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (dashRes.ok) {
            const stats = await dashRes.json();
            console.log('✅ Dashboard stats:');
            console.log('   Total Products:', stats.totalProducts || 0);
            console.log('   Total Sales:', stats.totalSales || 0);
            console.log('   Low Stock Products:', stats.lowStockProducts || 0);
        } else {
            console.log('⚠️ Dashboard endpoint status:', dashRes.status);
        }

        // Test public products
        console.log('\n🌐 Checking public marketplace products...');
        const publicRes = await fetch(`${BASE_URL}/public/products`);

        if (publicRes.ok) {
            const publicProducts = await publicRes.json();
            console.log('✅ Public products available:', publicProducts.length);
            const paidProducts = publicProducts.filter(p => p.subscriptionStatus === 'PAID');
            console.log('   PAID (purchasable):', paidProducts.length);
        } else {
            console.log('❌ Public products failed:', publicRes.status);
        }

        console.log('\n🎉 Admin panel verification complete!');

    } catch (error) {
        console.error('🔥 Error:', error.message);
    }
}

verifyAdminPanel();
