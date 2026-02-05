const http = require('http');

async function doRequest(path, method, data, token = null) {
    const bodyStr = data ? JSON.stringify(data) : '';
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(options, (res) => {
            let resBody = '';
            res.on('data', (chunk) => resBody += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: resBody ? JSON.parse(resBody) : {} });
                } catch (e) {
                    resolve({ status: res.statusCode, data: resBody });
                }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function run() {
    const login = await doRequest('/auth/signin', 'POST', { username: 'superadmin_final', password: 'admin123' });
    if (!login.data.token) {
        console.log("Admin login failed");
        return;
    }
    const token = login.data.token;
    const companies = await doRequest('/superadmin/companies', 'GET', null, token);

    companies.data.forEach(c => {
        console.log(`ID: ${c.id} | Name: ${c.name} | Status: ${c.subscriptionStatus}`);
    });
}

run();
