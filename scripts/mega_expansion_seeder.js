const http = require('http');

const API_BASE = '/api';
const PORT = 8080;
const HOST = 'localhost';

const SECTORS = {
    "Ferretería": [
        { name: "Martillo de Acero 16oz", sku: "SKU-V10-FER-1", basePrice: 15, description: "Martillo de acero forjado con mango ergonómico antideslizante." },
        { name: "Set Destornilladores x6", sku: "SKU-V10-FER-2", basePrice: 12, description: "Juego de 6 destornilladores de precisión con puntas imantadas." },
        { name: "Taladro Inalámbrico 18V", sku: "SKU-V10-FER-3", basePrice: 85, description: "Taladro percutor inalámbrico con dos baterías de litio." },
        { name: "Sierra Circular 7-1/4\"", sku: "SKU-V10-FER-4", basePrice: 120, description: "Sierra potente para cortes precisos en madera y derivados." },
        { name: "Juego de Llaves Allen", sku: "SKU-V10-FER-5", basePrice: 10, description: "Set de llaves hexagonales de acero cromo vanadio." },
        { name: "Pinza Amperimétrica Digital", sku: "SKU-V10-FER-6", basePrice: 45, description: "Multímetro digital con pinza para medición de corriente." },
        { name: "Nivel de Burbuja 24\"", sku: "SKU-V10-FER-7", basePrice: 18, description: "Nivel magnético de aluminio con tres burbujas de precisión." },
        { name: "Caja de Herramientas 20\"", sku: "SKU-V10-FER-8", basePrice: 35, description: "Caja metálica reforzada con bandeja organizadora." },
        { name: "Escalera de Aluminio", sku: "SKU-V10-FER-9", basePrice: 75, description: "Escalera tijera de 4 peldaños, ligera y muy resistente." },
        { name: "Juego de Brocas Titanio", sku: "SKU-V10-FER-10", basePrice: 22, description: "Set de 13 brocas recubiertas de titanio para metal." }
    ],
    "Supermercado": [
        { name: "Aceite de Girasol 1L", sku: "SKU-V10-SUP-1", basePrice: 3.50, description: "Aceite vegetal puro para todo tipo de cocciones." },
        { name: "Leche Entera 1L", sku: "SKU-V10-SUP-2", basePrice: 1.50, description: "Leche entera de larga vida enriquecida con vitaminas A y D." },
        { name: "Café Molido 250g", sku: "SKU-V10-SUP-3", basePrice: 4.20, description: "Café tostado intenso ideal para cafetera de filtro o prensa." },
        { name: "Jabón en Polvo 800g", sku: "SKU-V10-SUP-4", basePrice: 5.00, description: "Detergente potente para ropa blanca y de color." },
        { name: "Pasta Dental 120g", sku: "SKU-V10-SUP-5", basePrice: 2.80, description: "Protección total para encías y dientes con flúor." },
        { name: "Papel Higiénico 4 rollos", sku: "SKU-V10-SUP-6", basePrice: 3.00, description: "Papel higiénico doble hoja extra suave al tacto." },
        { name: "Galletas de Avena", sku: "SKU-V10-SUP-7", basePrice: 1.20, description: "Snack saludable de avena y miel, libre de grasas trans." },
        { name: "Té Verde Pack x20", sku: "SKU-V10-SUP-8", basePrice: 2.10, description: "Té verde orgánico en sobres individuales." },
        { name: "Mayonesa Clásica 450g", sku: "SKU-V10-SUP-9", basePrice: 2.50, description: "Aderezo cremoso con el sabor tradicional de hogar." },
        { name: "Atún en Lomitos 170g", sku: "SKU-V10-SUP-10", basePrice: 1.90, description: "Lomos de atún en aceite vegetal de alta calidad." }
    ],
    "Tecnología": [
        { name: "Smartphone X1 128GB", sku: "SKU-V10-TEC-1", basePrice: 200, description: "Móvil con pantalla AMOLED y triple cámara de 50MP." },
        { name: "Laptop Pro 15\"", sku: "SKU-V10-TEC-2", basePrice: 800, description: "Computadora con 16GB RAM y 512GB SSD ultrarrápida." },
        { name: "Tablet Max 10\"", sku: "SKU-V10-TEC-3", basePrice: 150, description: "Ideal para estudio y entretenimiento con pantalla FHD." },
        { name: "Smartwatch Fit Pro", sku: "SKU-V10-TEC-4", basePrice: 55, description: "Reloj con sensor de ritmo cardíaco y GPS integrado." },
        { name: "Cámara IP 360", sku: "SKU-V10-TEC-5", basePrice: 40, description: "Seguridad para el hogar con visión nocturna y audio bi-direccional." },
        { name: "Disco Externo SSD 1TB", sku: "SKU-V10-TEC-6", basePrice: 95, description: "Almacenamiento portátil de alta velocidad USB-C." },
        { name: "Teclado Gamer Mecánico", sku: "SKU-V10-TEC-7", basePrice: 70, description: "Teclas mecánicas azules con iluminación RGB personalizable." },
        { name: "Mouse Inalámbrico", sku: "SKU-V10-TEC-8", basePrice: 25, description: "Diseño ergonómico silencioso con batería recargable." },
        { name: "Cargador Rápido 65W", sku: "SKU-V10-TEC-9", basePrice: 30, description: "Carga laptops y smartphones compatibles a máxima velocidad." },
        { name: "Cable HDMI 2.1 2m", sku: "SKU-V10-TEC-10", basePrice: 12, description: "Soporta resolución hasta 8K y altas tasas de refresco." }
    ],
    "Alimentos": [
        { name: "Pan Integral Artesanal", sku: "SKU-V10-ALI-1", basePrice: 2.50, description: "Hecho con masa madre y semillas de linaza." },
        { name: "Mermelada de Fresa", sku: "SKU-V10-ALI-2", basePrice: 4.00, description: "Artesanal con trozos de fruta y bajo contenido de azúcar." },
        { name: "Queso Parmesano 100g", sku: "SKU-V10-ALI-3", basePrice: 3.20, description: "Queso madurado de sabor intenso, rallado para ensaladas." },
        { name: "Aceitunas Verdes 250g", sku: "SKU-V10-ALI-4", basePrice: 2.80, description: "Aceitunas de primera selección rellenas con pimiento." },
        { name: "Vino Malbec 750ml", sku: "SKU-V10-ALI-5", basePrice: 15.00, description: "Vino tinto reserva de cuerpo equilibrado." },
        { name: "Cerveza IPA 500ml", sku: "SKU-V10-ALI-6", basePrice: 4.50, description: "Cerveza artesanal con lúpulos importados y aroma intenso." },
        { name: "Sal de Mar 500g", sku: "SKU-V10-ALI-7", basePrice: 1.80, description: "Sal marina gruesa sin aditivos para parrilla y cocina." },
        { name: "Salsa Pomodoro 350g", sku: "SKU-V10-ALI-8", basePrice: 2.40, description: "Salsa de tomate italiana con albahaca fresca." },
        { name: "Miel Orgánica 500g", sku: "SKU-V10-ALI-9", basePrice: 6.50, description: "Miel pura de flores silvestres recolectada a mano." },
        { name: "Chocolate Negro 70%", sku: "SKU-V10-ALI-10", basePrice: 3.50, description: "Chocolate amargo premium de exportación." }
    ],
    "Hogar": [
        { name: "Lámpara LED Modern", sku: "SKU-V10-HOG-1", basePrice: 25, description: "Control táctil y 3 niveles de brillo regulables." },
        { name: "Silla ergonómica Pro", sku: "SKU-V10-HOG-2", basePrice: 150, description: "Soporte lumbar ajustable y malla transpirable." },
        { name: "Almohada Inteligente", sku: "SKU-V10-HOG-3", basePrice: 22, description: "De espuma viscoelástica que se adapta a tu cuello." },
        { name: "Set de Sábanas 1000H", sku: "SKU-V10-HOG-4", basePrice: 45, description: "Algodón de fibra larga para máxima suavidad." },
        { name: "Espejo Circular 60cm", sku: "SKU-V10-HOG-5", basePrice: 35, description: "Marco metálico negro de diseño minimalista." },
        { name: "Difusor Aromático", sku: "SKU-V10-HOG-6", basePrice: 28, description: "Ultrasónico con luces LED de colores cambiantes." },
        { name: "Alfombra Baño Soft", sku: "SKU-V10-HOG-7", basePrice: 12, description: "Microfibra de alta absorción y base antideslizante." },
        { name: "Organizador de Zapatos", sku: "SKU-V10-HOG-8", basePrice: 20, description: "Estructura ligera para 20 pares de zapatos." },
        { name: "Perchero de Madera", sku: "SKU-V10-HOG-9", basePrice: 15, description: "Natural de pino con 4 ganchos metálicos." },
        { name: "Cuadro Canvas Moderno", sku: "SKU-V10-HOG-10", basePrice: 30, description: "Impresión de alta definición sobre lienzo." }
    ],
    "Belleza": [
        { name: "Kit Skin Care Bio", sku: "SKU-V10-BEL-1", basePrice: 45, description: "Rutina completa de 3 pasos con ingredientes naturales." },
        { name: "Perfume Aqua Sport", sku: "SKU-V10-BEL-2", basePrice: 60, description: "Fragancia de larga duración con notas marinas." },
        { name: "Serum Vitamina C", sku: "SKU-V10-BEL-3", basePrice: 18, description: "Tratamiento antioxidante para iluminar la piel." },
        { name: "Protector Solar 50+", sku: "SKU-V10-BEL-4", basePrice: 22, description: "Toque seco con efecto invisible ante los rayos UV." },
        { name: "Máscara pestañas Max", sku: "SKU-V10-BEL-5", basePrice: 12, description: "Efecto pestañas postizas con volumen dramático." },
        { name: "Labial Mate Intenso", sku: "SKU-V10-BEL-6", basePrice: 10, description: "Color saturado que no mancha hasta por 12 horas." },
        { name: "Crema Hidratante Coco", sku: "SKU-V10-BEL-7", basePrice: 14, description: "Humectación profunda para pieles extra secas." },
        { name: "Champú Sólido", sku: "SKU-V10-BEL-8", basePrice: 9, description: "Reparación sin sulfatos con aroma a lavanda." },
        { name: "Esmalte Gel Finish", sku: "SKU-V10-BEL-9", basePrice: 7, description: "Brillo extremo sin necesidad de lámpara UV." },
        { name: "Plancha Cabello Pro", sku: "SKU-V10-BEL-10", basePrice: 55, description: "Placas de cerámica que protegen el brillo natural." }
    ],
    "Deportes": [
        { name: "Mat de Yoga Premium", sku: "SKU-V10-DEP-1", basePrice: 20, description: "Antideslizante de 6mm de grosor para pilates y yoga." },
        { name: "Set Pesas 10kg", sku: "SKU-V10-DEP-2", basePrice: 35, description: "Pareja de mancuernas con recubrimiento de neopreno." },
        { name: "Banda de Resistencia", sku: "SKU-V10-DEP-3", basePrice: 8, description: "Banda de tela elástica para tonificación muscular." },
        { name: "Balón Fútbol N5", sku: "SKU-V10-DEP-4", basePrice: 25, description: "Cosido a mano de alta durabilidad en césped." },
        { name: "Botella Agua 750ml", sku: "SKU-V10-DEP-5", basePrice: 15, description: "Acero inoxidable con aislamiento térmico." },
        { name: "Cuerda con Contador", sku: "SKU-V10-DEP-6", basePrice: 10, description: "Ajustable con pantalla LCD para saltos." },
        { name: "Mochila Impermeable", sku: "SKU-V10-DEP-7", basePrice: 32, description: "Compartimento para laptop y calzado deportivo." },
        { name: "Guantes Boxeo Trainer", sku: "SKU-V10-DEP-8", basePrice: 40, description: "Protección premium con cierre de velcro seguro." },
        { name: "Rodillo Abdominal Pro", sku: "SKU-V10-DEP-9", basePrice: 18, description: "Doble rueda para mayor estabilidad en el core." },
        { name: "Toalla Microfibra L", sku: "SKU-V10-DEP-10", basePrice: 12, description: "Secado ultra rápido, ocupa muy poco espacio." }
    ],
    "Mascotas": [
        { name: "Alimento Perro 3kg", sku: "SKU-V10-MAS-1", basePrice: 18, description: "Equilibrado para adultos raza mediana." },
        { name: "Cama Mascotas Plush", sku: "SKU-V10-MAS-2", basePrice: 30, description: "Circular ultra suave con borde para descanso." },
        { name: "Correa Extensible 5m", sku: "SKU-V10-MAS-3", basePrice: 12, description: "Freno de un solo botón y clip reforzado." },
        { name: "Mordedor Goma Natural", sku: "SKU-V10-MAS-4", basePrice: 7, description: "Estimula la limpieza dental mientras juegan." },
        { name: "Champú Aloe Vera", sku: "SKU-V10-MAS-5", basePrice: 9, description: "Especial para pieles sensibles y pelaje brilloso." },
        { name: "Cepillo Doble Cara", sku: "SKU-V10-MAS-6", basePrice: 10, description: "Desenreda y remueve el pelo muerto fácilmente." },
        { name: "Snack Gato Salmón", sku: "SKU-V10-MAS-7", basePrice: 3, description: "Premios crujientes con centro suave." },
        { name: "Rascador Gatos 3N", sku: "SKU-V10-MAS-8", basePrice: 45, description: "Torre con poste de sisal y hamaca integrada." },
        { name: "Plato Acero Doble", sku: "SKU-V10-MAS-9", basePrice: 14, description: "Base antideslizante para comida y agua." },
        { name: "Bolsas Desecho Bio", sku: "SKU-V10-MAS-10", basePrice: 5, description: "Pack de 6 rollos amigables con el ambiente." }
    ],
    "Moda": [
        { name: "Camiseta Algodón 100%", sku: "SKU-V10-MOD-1", basePrice: 15, description: "Básica de cuello redondo disponible en varios colores." },
        { name: "Jean Clásico Azul", sku: "SKU-V10-MOD-2", basePrice: 40, description: "Corte recto de denim resistente y confortable." },
        { name: "Sudadera Capucha", sku: "SKU-V10-MOD-3", basePrice: 35, description: "Interior de polar suave perfecta para el invierno." },
        { name: "Zapatillas Blancas", sku: "SKU-V10-MOD-4", basePrice: 65, description: "Estilo urbano de cuero sintético lavable." },
        { name: "Cinturón de Cuero", sku: "SKU-V10-MOD-5", basePrice: 20, description: "Cuero auténtico con hebilla metálica clásica." },
        { name: "Medias Pack x3", sku: "SKU-V10-MOD-6", basePrice: 9, description: "Cojín acolchado ideal para deporte o casual." },
        { name: "Gorra Streetwear", sku: "SKU-V10-MOD-7", basePrice: 18, description: "Ajustable tipo de béisbol con logo bordado." },
        { name: "Chaqueta Viento", sku: "SKU-V10-MOD-8", basePrice: 50, description: "Tela impermeable ultraligera con bolsillos." },
        { name: "Lentes de Sol 400UV", sku: "SKU-V10-MOD-9", basePrice: 45, description: "Lentes polarizados con montura de policarbonato." },
        { name: "Pantalón Chino Beige", sku: "SKU-V10-MOD-10", basePrice: 38, description: "Elegancia casual ideal para oficina." }
    ],
    "Juguetería": [
        { name: "Bloques de Construcción", sku: "SKU-V10-JUG-1", basePrice: 40, description: "500 piezas compatibles con marcas líderes." },
        { name: "Muñeca Fashion", sku: "SKU-V10-JUG-2", basePrice: 25, description: "Incluye 3 sets de ropa y accesorios diversos." },
        { name: "Auto Control Remoto", sku: "SKU-V10-JUG-3", basePrice: 50, description: "4WD todoterreno con batería recargable USB." },
        { name: "Juego de Estrategia", sku: "SKU-V10-JUG-4", basePrice: 30, description: "Para 2-4 jugadores, diversión asegurada en familia." },
        { name: "Peluche Oso 40cm", sku: "SKU-V10-JUG-5", basePrice: 22, description: "Hipoalergénico y extra suave para abrazar." },
        { name: "Set Pintura Kids", sku: "SKU-V10-JUG-6", basePrice: 18, description: "Maletín con acuarelas, lápices y pinceles." },
        { name: "Rompecabezas 1000P", sku: "SKU-V10-JUG-7", basePrice: 15, description: "Paisaje de alta calidad troquelado preciso." },
        { name: "Kit Volcán Científico", sku: "SKU-V10-JUG-8", basePrice: 20, description: "Experimento educativo para aprender geología." },
        { name: "Lanzador de Dardos", sku: "SKU-V10-JUG-9", basePrice: 35, description: "Incluye 30 dardos de espuma de largo alcance." },
        { name: "Karaoke Bluetooth", sku: "SKU-V10-JUG-10", basePrice: 45, description: "Con luces LED y función de cambio de voz." }
    ]
};

async function doRequest(path, method, data, token = null) {
    const bodyStr = data ? JSON.stringify(data) : '';
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST, port: PORT, path: API_BASE + path, method: method,
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;
        const req = http.request(options, (res) => {
            let resBody = ''; res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: resBody ? JSON.parse(resBody) : {} }); }
                catch (e) { resolve({ status: res.statusCode, data: resBody }); }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function run() {
    console.log("🚀 Iniciando Gran Expansión del Catálogo (100 Productos)...");
    for (let i = 1; i <= 10; i++) {
        const username = `manager_v2_${i}`;
        const password = 'password123';
        console.log(`\n🏪 Tienda ${i} (${username})...`);
        const login = await doRequest('/auth/signin', 'POST', { username, password });
        if (login.status !== 200) continue;
        const managerToken = login.data.token;
        const existingCats = await doRequest('/categories', 'GET', null, managerToken);
        const catMap = {};
        if (Array.isArray(existingCats.data)) existingCats.data.forEach(c => catMap[c.name] = c.id);

        for (const catName in SECTORS) {
            if (!catMap[catName]) {
                await doRequest('/categories', 'POST', { name: catName, description: `Sector ${catName}` }, managerToken);
                const updatedCats = await doRequest('/categories', 'GET', null, managerToken);
                updatedCats.data.forEach(c => catMap[c.name] = c.id);
            }
        }
        for (const [catName, products] of Object.entries(SECTORS)) {
            const categoryId = catMap[catName];
            for (const p of products) {
                const variance = (Math.random() * (p.basePrice * 0.2)) - (p.basePrice * 0.1);
                const finalPrice = Math.max(0.5, p.basePrice + variance).toFixed(2);
                const prodData = { name: p.name, sku: p.sku, price: finalPrice, stock: Math.floor(Math.random() * 80) + 10, description: p.description, category: { id: categoryId } };
                const prodRes = await doRequest('/products', 'POST', prodData, managerToken);
                if (prodRes.status === 200) process.stdout.write(".");
            }
        }
    }
    console.log("\n🎉 Expansión finalizada con éxito.");
}
run();
