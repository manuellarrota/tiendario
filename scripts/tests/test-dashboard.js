async function testDashboard() {
    try {
        const email = "buyer@test.com";
        console.log("Registering " + email + "...");
        await fetch('http://localhost:8080/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, email: email, password: "password", role: ["client"] })
        });

        console.log("Logging in...");
        const signinRes = await fetch('http://localhost:8080/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password: "password" })
        });
        const signinData = await signinRes.json();
        const token = signinData.token;

        console.log("Fetching dashboard stats...");
        const statsRes = await fetch('http://localhost:8080/api/customer-portal/dashboard', {
            headers: { Authorization: 'Bearer ' + token }
        });
        console.log("Dashboard Stats Status:", statsRes.status);
        console.log("Dashboard Stats Body:", await statsRes.json());

        console.log("Fetching my orders...");
        const ordersRes = await fetch('http://localhost:8080/api/customer-portal/orders', {
            headers: { Authorization: 'Bearer ' + token }
        });
        console.log("My Orders Body:", await ordersRes.json());
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testDashboard();
