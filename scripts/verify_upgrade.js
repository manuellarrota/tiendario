const axios = require('../frontend/admin/node_modules/axios');
const fs = require('fs');
const path = require('path');

const API_URL = "http://localhost:8080/api";

async function runTest() {
    try {
        const timestamp = Date.now();
        const username = `manager_upgrade_${timestamp}`;
        const email = `${username}@test.com`;

        console.log("1. Registering Manager:", username);
        try {
            await axios.post(`${API_URL}/auth/signup`, {
                username,
                email,
                password: "password123",
                companyName: "Upgrade Inc",
                phoneNumber: "5551234567",
                role: ["manager"]
            });
            console.log("   Registration request sent.");
        } catch (e) {
            console.error("   Registration failed:", e.response?.data || e.message);
            throw e;
        }

        console.log("2. Waiting for verification link...");
        await new Promise(r => setTimeout(r, 2000));

        const linksFile = path.resolve('backend/verification_links.txt');
        if (!fs.existsSync(linksFile)) {
            throw new Error("Verification links file not found");
        }

        const content = fs.readFileSync(linksFile, 'utf8');
        const lines = content.trim().split('\n');
        const lastLine = lines[lines.length - 1];

        if (!lastLine || !lastLine.includes(username)) {
            throw new Error("Link not found for " + username);
        }

        const urlFull = lastLine.split("| Link: ")[1].trim();
        const code = urlFull.split("code=")[1];
        console.log("   Found code:", code);

        console.log("3. Verifying account...");
        await axios.get(`${API_URL}/auth/verify?code=${code}`);
        console.log("   Account verified.");

        console.log("4. Logging in (Initial Check)...");
        const loginRes = await axios.post(`${API_URL}/auth/signin`, {
            username,
            password: "password123"
        });

        const token = loginRes.data.token;
        const initialStatus = loginRes.data.subscriptionStatus;
        console.log("   Initial Status:", initialStatus);

        if (initialStatus !== 'FREE') {
            console.warn("   WARNING: Expected FREE but got", initialStatus);
        }

        console.log("5. Upgrading Plan (Simulate Success)...");
        await axios.post(`${API_URL}/payments/simulate-success`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("   Upgrade request successful.");

        console.log("6. Logging in again to verify status change...");
        const loginRes2 = await axios.post(`${API_URL}/auth/signin`, {
            username,
            password: "password123"
        });

        const finalStatus = loginRes2.data.subscriptionStatus;
        console.log("   Final Status:", finalStatus);

        if (finalStatus === 'PAID') {
            console.log("SUCCESS: Plan upgraded to PAID.");
        } else {
            throw new Error(`Failed to upgrade plan. Status is ${finalStatus}`);
        }

    } catch (error) {
        console.error("TEST FAILED:", error.response?.data || error.message);
        process.exit(1);
    }
}

runTest();
