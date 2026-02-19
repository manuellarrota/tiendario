
const http = require('http');

const postData = JSON.stringify({
    username: 'manager_pro',
    password: '123456'
});

const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/signin',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const loginResp = JSON.parse(data);
            const token = loginResp.accessToken;
            if (!token) {
                console.error('No access token in login response:', data);
                return;
            }

            const options2 = {
                hostname: 'localhost',
                port: 8080,
                path: '/api/sales',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };

            const req2 = http.request(options2, (res2) => {
                let data2 = '';
                res2.on('data', (chunk2) => { data2 += chunk2; });
                res2.on('end', () => {
                    try {
                        console.log('Raw response:', data2.substring(0, 200) + '...');
                        const sales = JSON.parse(data2);
                        if (sales.length > 0) {
                            console.log('First sale structure:', JSON.stringify(sales[0], null, 2));
                        } else {
                            console.log('No sales found.');
                        }
                    } catch (e) {
                        console.error('Error parsing sales response:', e.message);
                        console.log('Raw data was:', data2);
                    }
                });
            });
            req2.end();
        } catch (e) {
            console.error('Error parsing login response:', e.message);
        }
    });
});

req.write(postData);
req.end();
