const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

async function testUserManagement() {
    console.log("🚀 Starting User Management Test...");
    const timestamp = Date.now();
    const testUser = `user_to_toggle_${timestamp}`;
    const adminUsername = `admin_toggle_${timestamp}`;
    const password = 'password123';

    try {
        // 1. Register Admin
        await axios.post(`${API_BASE}/auth/signup`, {
            username: adminUsername,
            password: password,
            role: ['admin']
        });

        const adminLogin = await axios.post(`${API_BASE}/auth/signin`, {
            username: adminUsername,
            password: password
        });
        const adminConfig = { headers: { Authorization: `Bearer ${adminLogin.data.token}` } };

        // 2. Register a normal user
        console.log(`👤 Registering user ${testUser}...`);
        await axios.post(`${API_BASE}/auth/signup`, {
            username: testUser,
            password: password,
            role: ['client']
        });

        // 3. Get all users and find ours
        console.log("📋 Fetching user list...");
        const usersRes = await axios.get(`${API_BASE}/superadmin/users`, adminConfig);
        const targetUser = usersRes.data.find(u => u.username === testUser);
        console.log(`✅ Found user ID: ${targetUser.id}, Enabled: ${targetUser.enabled}`);

        // 4. Toggle User (Disable)
        console.log("🔒 Disabling user...");
        await axios.put(`${API_BASE}/superadmin/users/${targetUser.id}/toggle`, {}, adminConfig);

        // 5. Try to login with disabled user (Should fail)
        console.log("🔑 Trying to login as disabled user (Expected failure)...");
        try {
            await axios.post(`${API_BASE}/auth/signin`, {
                username: testUser,
                password: password
            });
            console.log("❌ Error: Login should have failed!");
        } catch (err) {
            console.log("✅ Success: Login failed as expected for disabled user.");
        }

        // 6. Enable User again
        console.log("🔓 Re-enabling user...");
        await axios.put(`${API_BASE}/superadmin/users/${targetUser.id}/toggle`, {}, adminConfig);

        // 7. Login again (Should succeed)
        console.log("🔑 Trying to login again...");
        const loginRes = await axios.post(`${API_BASE}/auth/signin`, {
            username: testUser,
            password: password
        });
        console.log(`✨ Success: User ${loginRes.data.username} logged in after being enabled.`);

        console.log("\n🚀 USER MANAGEMENT TEST COMPLETED SUCCESSFULLY!");

    } catch (error) {
        console.error("❌ Test failed:", error.response ? error.response.data : error.message);
    }
}

testUserManagement();
