const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

async function runTest() {
    console.log("🚀 Starting Subscription Flow Test...");
    const timestamp = Date.now();
    const managerUsername = `manager_${timestamp}`;
    const companyName = `Test Company ${timestamp}`;
    const adminUsername = `admin_${timestamp}`;
    const password = 'password123';

    try {
        // 1. Register an Admin for this test
        console.log(`👑 Registering Test Admin: ${adminUsername}...`);
        await axios.post(`${API_BASE}/auth/signup`, {
            username: adminUsername,
            password: password,
            role: ['admin']
        });
        console.log("✅ Admin registration successful");

        // 2. Register a new Manager/Company
        console.log(`📦 Registering Manager: ${managerUsername} with Company: ${companyName}...`);
        await axios.post(`${API_BASE}/auth/signup`, {
            username: managerUsername,
            password: password,
            role: ['manager'],
            companyName: companyName
        });
        console.log("✅ Manager registration successful");

        // 3. Login as Manager
        console.log("🔑 Logging in as Manager...");
        const loginRes = await axios.post(`${API_BASE}/auth/signin`, {
            username: managerUsername,
            password: password
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log(`✅ Manager logged in (Company ID: ${loginRes.data.companyId})`);

        // 4. Report a payment
        console.log("💸 Reporting a payment...");
        const paymentRes = await axios.post(`${API_BASE}/payments/submit`, {
            amount: 25.00,
            paymentMethod: 'Zelle',
            reference: `REF-${timestamp}`,
            notes: 'Automated test payment'
        }, config);
        console.log("✅ Payment reported:", paymentRes.data.message);

        // 5. Login as Admin to approve
        console.log("🔑 Logging in as Admin...");
        const adminLoginRes = await axios.post(`${API_BASE}/auth/signin`, {
            username: adminUsername,
            password: password
        });
        const adminToken = adminLoginRes.data.token;
        const adminConfig = { headers: { Authorization: `Bearer ${adminToken}` } };

        // 6. Get all payments
        console.log("📋 Fetching global payments...");
        const paymentsRes = await axios.get(`${API_BASE}/superadmin/payments`, adminConfig);
        const myPayment = paymentsRes.data.find(p => p.reference === `REF-${timestamp}`);

        if (!myPayment) throw new Error("Payment not found in global list");
        console.log(`✅ Found payment ID: ${myPayment.id} for Reference: ${myPayment.reference}`);

        // 7. Approve payment
        console.log("✔️ Approving payment...");
        const approveRes = await axios.post(`${API_BASE}/superadmin/payments/${myPayment.id}/approve`, {}, adminConfig);
        console.log("✅ Approval response:", approveRes.data.message);

        // 8. Verify company status
        console.log("🏢 Verifying company status...");
        const profileRes = await axios.get(`${API_BASE}/company/profile`, config);
        console.log(`✅ Final Status: ${profileRes.data.subscriptionStatus}`);
        console.log(`📅 Valid until: ${profileRes.data.subscriptionEndDate}`);

        if (profileRes.data.subscriptionStatus === 'PAID') {
            const endDate = new Date(profileRes.data.subscriptionEndDate);
            const now = new Date();
            const daysDiff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            console.log(`📊 Validity days remaining: ${daysDiff}`);

            console.log("\n✨ TEST SUCCESSFUL: Subscription flow working end-to-end!");
        } else {
            console.log("\n❌ TEST FAILED: Status is not PAID. Actual status: " + profileRes.data.subscriptionStatus);
        }

    } catch (error) {
        console.error("❌ Test failed:", error.response ? error.response.data : error.message);
    }
}

runTest();
