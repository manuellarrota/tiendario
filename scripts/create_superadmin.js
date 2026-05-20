const http = require('http');

const API_BASE = '/api';
const HOST = 'localhost';
const PORT = 8080;

function doRequest(path, method, data) {
    const bodyStr = data ? JSON.stringify(data) : '';
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: API_BASE + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        };

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
    console.log("👑 Creando/Verificando Super Admin...");

    const adminUser = {
        username: "admin@nugar.com",
        password: "admin123",
        companyName: "Nugar HQ",
        email: "admin@nugar.com"
    };

    // 1. Intentar Login
    console.log("1. Intentando login...");
    let login = await doRequest('/auth/signin', 'POST', { username: adminUser.username, password: adminUser.password });

    if (login.status !== 200) {
        console.log("   Login falló (posiblemente no existe). Intentando registro...");
        // 2. Registro
        const signup = await doRequest('/auth/signup', 'POST', adminUser);
        if (signup.status === 200 || signup.status === 201) {
            console.log("   ✅ Usuario creado exitosamente.");
        } else {
            console.log("   ❌ Error creando usuario:", signup.data);
            if (signup.data.message && signup.data.message.includes("taken")) {
                console.log("   (El usuario ya existe pero la contraseña quizas no coincide, o error de login previo)");
            }
            // Si falla registro y login, abortamos
            if (login.status !== 200) return;
        }
    } else {
        console.log("   ✅ Login exitoso. Usuario ya existe.");
    }

    console.log("⚠️ NOTA: El usuario ha sido creado/verificado. Ahora debes ejecutar el comando SQL para darle rol ADMIN.");
    console.log("   docker exec -i nugar-db psql -U user -d nugar -c \"UPDATE users SET roles = 'ROLE_ADMIN' WHERE username = 'admin@nugar.com';\"");
}

run();
