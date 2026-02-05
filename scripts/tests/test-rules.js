async function testPurchaseRules() {
    try {
        console.log("Fetching public products...");
        const res = await fetch('http://localhost:8080/api/public/products');
        const products = await res.json();

        const freeProduct = products.find(p => p.subscriptionStatus === 'FREE');
        const paidProduct = products.find(p => p.subscriptionStatus === 'PAID');

        if (freeProduct) {
            console.log("Testing purchase on FREE product: " + freeProduct.name);
            const orderRes = await fetch('http://localhost:8080/api/public/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: freeProduct.id,
                    quantity: 1,
                    customerName: "Test Buyer",
                    customerEmail: "buyer@test.com",
                    customerPhone: "123",
                    customerAddress: "Test"
                })
            });
            console.log("FREE Purchase Status (should be 400):", orderRes.status);
            console.log("FREE Purchase Message:", await orderRes.json());
        }

        if (paidProduct) {
            console.log("Testing purchase on PAID product: " + paidProduct.name);
            const orderRes = await fetch('http://localhost:8080/api/public/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: paidProduct.id,
                    quantity: 1,
                    customerName: "Test Buyer",
                    customerEmail: "buyer@test.com",
                    customerPhone: "123",
                    customerAddress: "Test"
                })
            });
            console.log("PAID Purchase Status (should be 200):", orderRes.status);
            console.log("PAID Purchase Message:", await orderRes.json());
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testPurchaseRules();
