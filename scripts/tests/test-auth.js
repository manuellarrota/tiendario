async function test() {
    try {
        const username = "test_" + Date.now();
        console.log("Registering " + username + "...");
        const signupRes = await fetch('http://localhost:8080/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: "password",
                role: ["client"]
            })
        });
        console.log("Signup Status:", signupRes.status);
        console.log("Signup Body:", await signupRes.json());

        console.log("Logging in...");
        const signinRes = await fetch('http://localhost:8080/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: "password"
            })
        });
        console.log("Signin Status:", signinRes.status);
        const signinData = await signinRes.json();
        console.log("Signin Body:", signinData);
        const token = signinData.token;

        if (!token) {
            console.error("No token received!");
            return;
        }

        console.log("Fetching orders with token...");
        const ordersRes = await fetch('http://localhost:8080/api/customer-portal/orders', {
            headers: { Authorization: 'Bearer ' + token }
        });
        console.log("Orders Status:", ordersRes.status);
        console.log("Orders Body:", await ordersRes.json());
    } catch (error) {
        console.error("Error:", error.message);
    }
}

test();
