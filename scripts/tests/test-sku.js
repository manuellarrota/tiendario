// Native fetch used
async function testSkuGeneration() {
    const randomUser = 'manager_' + Math.floor(Math.random() * 1000000);
    const signupRes = await fetch('http://localhost:8080/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: randomUser, password: 'password', role: ['manager'] })
    });
    console.log('Signup status:', signupRes.status, 'User:', randomUser);

    const loginRes = await fetch('http://localhost:8080/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: randomUser, password: 'password' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful. Roles:', loginData.roles);

    console.log('Login successful, token retrieved.');

    const suggestRes = await fetch('http://localhost:8080/api/products/suggest-sku?name=Coca%20Cola%201.5L&category=Bebidas', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!suggestRes.ok) {
        console.log('Error Status:', suggestRes.status);
        console.log('Error Body:', await suggestRes.text());
        return;
    }

    const suggestData = await suggestRes.json();
    console.log('Suggested SKU:', suggestData.suggestedSku);

    if (suggestData.suggestedSku && suggestData.suggestedSku.includes('COCA')) {
        console.log('SKU Generation SUCCESS');
    } else {
        console.log('SKU Generation FAILED or format mismatch');
    }
}

testSkuGeneration();
