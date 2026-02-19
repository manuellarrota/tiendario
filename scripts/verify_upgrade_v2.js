const fs = require('fs');
const path = require('path');

const API_URL = "http://localhost:8080/api";

async function request(url, method, body, token) {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = {
        method,
        headers,
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
}

async function runTest() {
    try {
        const timestamp = Date.now();
        const username = `manager_upgrade_${timestamp}`;
        const email = `${username}@test.com`;

        console.log("1. Registering Manager:", username);
        await request(`${API_URL}/auth/signup`, 'POST', {
            username,
            email,
            password: "password123",
            companyName: "Upgrade Inc",
            phoneNumber: "5551234567",
            role: ["manager"]
        });
        console.log("   Registration request sent.");

        console.log("2. Waiting for verification link...");
        await new Promise(r => setTimeout(r, 2000));

        const linksFile = path.resolve('backend/verification_links.txt');
        if (!fs.existsSync(linksFile)) {
            throw new Error("Verification links file not found");
        }

        const content = fs.readFileSync(linksFile, 'utf8');
        const lines = content.trim().split('\n');
        // Find line for this user
        const lastLine = lines.find(line => line.includes(username));

        if (!lastLine) {
            throw new Error("Link not found for " + username);
        }

        const urlFull = lastLine.split("| Link: ")[1].trim();
        const code = urlFull.split("code=")[1];
        console.log("   Found code:", code);

        console.log("3. Verifying account...");
        // Verify is GET
        const verifyUrl = `${API_URL}/auth/verify?code=${code}`;
        const verifyRes = await fetch(verifyUrl);
        if (!verifyRes.ok) throw new Error("Verification failed: " + verifyRes.status);
        console.log("   Account verified.");

        console.log("4. Logging in (Initial Check)...");
        const loginRes = await request(`${API_URL}/auth/signin`, 'POST', {
            username,
            password: "password123"
        });

        const token = loginRes.token;
        const initialStatus = loginRes.subscriptionStatus;
        console.log("   Initial Status:", initialStatus);

        if (initialStatus !== 'FREE') {
            console.warn("   WARNING: Expected FREE but got", initialStatus);
        }

        console.log("5. Upgrading Plan (Simulate Success)...");
        await request(`${API_URL}/payments/simulate-success`, 'POST', {}, token);
        console.log("   Upgrade request successful.");

        console.log("6. Logging in again to verify status change...");
        const loginRes2 = await request(`${API_URL}/auth/signin`, 'POST', {
            username,
            password: "password123"
        });

        const finalStatus = loginRes2.subscriptionStatus;
        console.log("   Final Status:", finalStatus);

        if (finalStatus === 'PAID') {
            console.log("SUCCESS: Plan upgraded to PAID.");
        } else {
            throw new Error(`Failed to upgrade plan. Status is ${finalStatus}`);
        }

    } catch (error) {
        console.error("TEST FAILED:", error.message);
        process.exit(1);
    }
}

runTest();
