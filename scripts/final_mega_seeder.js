const http = require('http');

const API_BASE = '/api';
const PORT = 8080;
const HOST = 'localhost';

const SECTORS = {
    "Ferretería": [
        { name: "Martillo de Acero 16oz", sku: "SKU-FER-HAMMER-V5", basePrice: 15, description: "Martillo de acero forjado con mango ergonómico antideslizante. Ideal para trabajos de construcción y carpintería profesional." },
        { name: "Set Destornilladores x6", sku: "SKU-FER-DRIVE-V5", basePrice: 12, description: "Juego de 6 destornilladores de precisión con puntas imantadas. Incluye planos y Philips de diversas medidas." },
        { name: "Taladro Inalámbrico 18V", sku: "SKU-FER-DRILL-V5", basePrice: 85, description: "Taladro percutor inalámbrico de 18V con dos baterías de litio. Potencia y versatilidad para perforar madera, metal y concreto." }
    ],
    "Supermercado": [
        { name: "Aceite de Girasol 1L", sku: "SKU-SUP-OIL-V5", basePrice: 3.50, description: "Aceite de girasol 100% puro, refinado y saludable. Ideal para cocinar y aderezar ensaladas." },
        { name: "Leche Entera 1L", sku: "SKU-SUP-MILK-V5", basePrice: 1.50, description: "Leche entera de vaca pasteurizada y homogeneizada. Fuente natural de calcio y vitaminas para toda la familia." },
        { name: "Café Molido 250g", sku: "SKU-SUP-COFFEE-V5", basePrice: 4.20, description: "Café tostado y molido de altura. Aroma intenso y cuerpo equilibrado para disfrutar de un café gourmet en casa." }
    ],
    "Tecnología": [
        { name: "Smartphone X1", sku: "SKU-PHONE-X1-V5", basePrice: 200, description: "Smartphone con pantalla AMOLED de 6.5 pulgadas, procesador octa-core y cámara triple de 50MP. Rendimiento excepcional al mejor precio." },
        { name: "Laptop Pro 15", sku: "SKU-LAPTOP-P15-V5", basePrice: 800, description: "Computadora portátil con procesador de última generación, 16GB RAM y 512GB SSD. Perfecta para diseño, programación y trabajo intensivo." }
    ],
    "Alimentos": [
        { name: "Pan Integral 500g", sku: "SKU-SUP-BREAD-V5", basePrice: 2.50, description: "Pan molde integral con semillas de chía y linaza. Hecho artesanalmente, sin conservantes artificiales." },
        { name: "Mermelada de Fresa", sku: "SKU-SUP-JAM-V5", basePrice: 4.00, description: "Mermelada artesanal de fresas naturales recolectadas a mano. Menos azúcar y más fruta en cada bocado." }
    ],
    "Hogar": [
        { name: "Lámpara LED Escritorio", sku: "SKU-HOME-LAMP-V5", basePrice: 25.00, description: "Lámpara de escritorio con ajuste de brillo y temperatura de color. Brazo flexible y puerto de carga USB." },
        { name: "Silla Ergonómica Pro", sku: "SKU-HOME-CHAIR-V5", basePrice: 150.00, description: "Silla de oficina ergonómica con soporte lumbar ajustable y malla transpirable. Comodidad total para largas jornadas." }
    ],
    "Belleza": [
        { name: "Kit Skin Care Bio", sku: "SKU-BEAUTY-KIT-V5", basePrice: 45.00, description: "Kit completo de cuidado facial con ingredientes orgánicos. Incluye limpiador, tónico y crema hidratante." },
        { name: "Perfume Aqua Sport", sku: "SKU-BEAUTY-PERF-V5", basePrice: 60.00, description: "Fragancia fresca y dinámica para el día a día. Notas críticas y base de madera de cedro." }
    ],
    "Deportes": [
        { name: "Mat de Yoga Antideslizante", sku: "SKU-SPORT-MAT-V5", basePrice: 20.00, description: "Mat de yoga de alta densidad con superficie antideslizante. Grosor de 6mm para máxima amortiguación." },
        { name: "Set de Pesas 10kg", sku: "SKU-SPORT-DUMB-V5", basePrice: 35.00, description: "Pareja de mancuernas ajustables de 5kg cada una. Recubrimiento de neopreno para un agarre seguro y suave." }
    ],
    "Mascotas": [
        { name: "Alimento Premium Perro 3kg", sku: "SKU-PET-FOOD-V5", basePrice: 18.00, description: "Alimento balanceado premium para perros adultos. Rico en proteínas y omega 3 para un pelaje brillante." },
        { name: "Cama Mascotas Plush", sku: "SKU-PET-BED-V5", basePrice: 30.00, description: "Cama ultra suave y acolchada para perros y gatos. Base antideslizante y lavable en máquina." }
    ]
};

async function doRequest(path, method, data, token = null) {
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
    console.log("🚀 Iniciando Mega Seeder Categorizado...");

    for (let i = 1; i <= 10; i++) {
        const username = `manager_v2_${i}`;
        const password = 'password123';

        console.log(`\n🏪 Procesando Tienda ${i} (${username})...`);

        const login = await doRequest('/auth/signin', 'POST', { username, password });
        if (login.status !== 200) {
            console.log(`   ❌ ERROR: No se pudo entrar con ${username}`);
            continue;
        }
        const managerToken = login.data.token;

        // 1. Obtener/Crear Categorías
        const existingCats = await doRequest('/categories', 'GET', null, managerToken);
        const catMap = {};
        if (Array.isArray(existingCats.data)) {
            existingCats.data.forEach(c => catMap[c.name] = c.id);
        }

        for (const catName in SECTORS) {
            if (!catMap[catName]) {
                const res = await doRequest('/categories', 'POST', { name: catName, description: `Sector ${catName}` }, managerToken);
                // Necesitamos re-obtener para tener el ID
                const updatedCats = await doRequest('/categories', 'GET', null, managerToken);
                updatedCats.data.forEach(c => catMap[c.name] = c.id);
                console.log(`   📂 Categoría creada: ${catName}`);
            }
        }

        // 2. Añadir Productos
        for (const [catName, products] of Object.entries(SECTORS)) {
            const categoryId = catMap[catName];
            for (const p of products) {
                const variance = (Math.random() * (p.basePrice * 0.2)) - (p.basePrice * 0.1);
                const finalPrice = Math.max(0.5, p.basePrice + variance).toFixed(2);

                const prodData = {
                    name: p.name,
                    sku: p.sku,
                    price: finalPrice,
                    stock: Math.floor(Math.random() * 80) + 10,
                    description: p.description,
                    category: { id: categoryId }
                };

                const prodRes = await doRequest('/products', 'POST', prodData, managerToken);
                if (prodRes.status === 200) {
                    console.log(`      ✅ Producto [${catName}] ${p.sku} ($${finalPrice})`);
                } else {
                    // Ignoramos errores de límite de plan silenciosamente o con nota corta
                    if (prodRes.status === 400 && JSON.stringify(prodRes.data).includes("Límite")) {
                        // Plan FREE limit reached, normal.
                    } else {
                        console.log(`      ⚠️ Error en ${p.sku}: ${JSON.stringify(prodRes.data)}`);
                    }
                }
            }
        }
    }
    console.log("\n🎉 Mega Seeder Finalizado.");
}

run();
