/**
 * DEMO DATA — Tiendario Demo Mode
 * Datos ficticios para la demo interactiva. No tocan el backend.
 * Tienda demo: "Ferretería Central" — San Cristóbal, Táchira.
 */

export const DEMO_STORE = {
    name: 'Ferretería Central',
    owner: 'Pedro Ramírez',
    location: 'San Cristóbal, Táchira',
    latitude: 7.789354,
    longitude: -72.219738,
    subscriptionStatus: 'TRIAL',
    daysLeft: 28,
};

export const DEMO_PRODUCTS = [
    { id: 1,  name: 'Tornillos Autorroscantes 2"',  price: 1.50,  stock: 250, category: 'Fijaciones',   barcode: 'TOR-200', image: '🔩' },
    { id: 2,  name: 'Pintura Blanca Latex 1L',       price: 8.00,  stock: 42,  category: 'Pinturas',     barcode: 'PNT-001', image: '🪣' },
    { id: 3,  name: 'Pala de Jardín',                price: 12.00, stock: 18,  category: 'Herramientas', barcode: 'HER-PAL', image: '⛏️' },
    { id: 4,  name: 'Cable Eléctrico 1.5mm x mt',    price: 0.80,  stock: 500, category: 'Eléctrico',   barcode: 'ELE-CAB', image: '🔌' },
    { id: 5,  name: 'Cemento Gris 42.5 kg',          price: 22.00, stock: 35,  category: 'Construcción', barcode: 'CEM-001', image: '🧱' },
    { id: 6,  name: 'Bombillo LED 9W E27',           price: 3.50,  stock: 120, category: 'Eléctrico',   barcode: 'ELE-LED', image: '💡' },
    { id: 7,  name: 'Lija Madera #120',              price: 0.50,  stock: 300, category: 'Acabados',     barcode: 'ACB-LIJ', image: '🪵' },
    { id: 8,  name: 'Tubo PVC 1/2" x 6m',           price: 4.20,  stock: 80,  category: 'Plomería',     barcode: 'PLO-TUB', image: '🚿' },
    { id: 9,  name: 'Candado 40mm Seguridad',        price: 7.00,  stock: 55,  category: 'Seguridad',    barcode: 'SEG-CAN', image: '🔒' },
    { id: 10, name: 'Martillo 300g Mango Madera',    price: 9.50,  stock: 28,  category: 'Herramientas', barcode: 'HER-MAR', image: '🔨' },
    { id: 11, name: 'Silicona Transparente 280ml',   price: 5.00,  stock: 90,  category: 'Adhesivos',    barcode: 'ADH-SIL', image: '🧴' },
    { id: 12, name: 'Tablón de Madera 1" x 10" x 2m', price: 18.00, stock: 22, category: 'Madera',      barcode: 'MAD-TAB', image: '🪵' },
    { id: 13, name: 'Flexómetro 5m Stanley',         price: 11.00, stock: 40,  category: 'Herramientas', barcode: 'HER-FLX', image: '📏' },
    { id: 14, name: 'Arena Fina x Saco 25kg',        price: 6.00,  stock: 60,  category: 'Construcción', barcode: 'CON-ARE', image: '🏖️' },
    { id: 15, name: 'Pintura Anticorrosiva 1L Gris', price: 10.50, stock: 30,  category: 'Pinturas',     barcode: 'PNT-ANC', image: '🎨' },
];

// Últimas 7 semanas de ventas para el gráfico del dashboard
export const DEMO_SALES_CHART = [
    { day: 'Lun', amount: 185 },
    { day: 'Mar', amount: 240 },
    { day: 'Mié', amount: 310 },
    { day: 'Jue', amount: 195 },
    { day: 'Vie', amount: 420 },
    { day: 'Sáb', amount: 510 },
    { day: 'Hoy', amount: 280 },
];

export const DEMO_SUMMARY = {
    totalProducts: 15,
    revenueToday: 280.00,
    revenueYesterday: 510.00,
    revenueGrowth: -45,
    shopAov: 18.60,
    lowStockCount: 2,
    pendingOrders: 3,
    preparingOrders: 1,
    readyOrders: 2,
    cancelledOrders: 0,
    topProductName: 'Cemento Gris 42.5 kg',
    topProductQty: 18,
    paymentMethods: { CASH: 12, TRANSFER: 6, CARD: 3 },
    totalOrdersCount: 21,
};

export const DEMO_RECENT_SALES = [
    { id: 'VT-0021', customer: 'Carlos M.',  total: 44.50, method: 'Efectivo',      time: 'Hace 12 min' },
    { id: 'VT-0020', customer: 'Ana R.',     total: 22.00, method: 'Transferencia', time: 'Hace 38 min' },
    { id: 'VT-0019', customer: 'Luis G.',    total: 8.00,  method: 'Efectivo',      time: 'Hace 1h 10m' },
    { id: 'VT-0018', customer: 'María P.',   total: 71.50, method: 'Transferencia', time: 'Hace 2h' },
    { id: 'VT-0017', customer: 'José B.',    total: 15.30, method: 'Efectivo',      time: 'Hace 3h' },
];

export const DEMO_CUSTOMER = {
    name: 'Carlos Medina',
    email: 'carlos@demo.com',
    loyaltyPoints: 120,
};
