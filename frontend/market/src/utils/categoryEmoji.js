/**
 * Maps product categories to emoji icons.
 * Shared across all components that display category icons.
 */
const CATEGORY_EMOJI_MAP = {
    'Alimentos': '🍎',
    'Ferretería': '🛠️',
    'Supermercado': '🛒',
    'Tecnología': '💻',
    'Hogar': '🏠',
    'Belleza': '💄',
    'Deportes': '⚽',
    'Mascotas': '🐾',
    'Moda': '👕',
    'Ropa': '👕',
    'Juguetería': '🧸',
    'Restaurante': '🍴',
    'Farmacia': '💊',
    'Zapatería': '👞',
    'Librería / Papelería': '📚',
    'Panadería': '🥐',
};

const DEFAULT_EMOJI = '📦';

/**
 * Returns the emoji icon for a given category.
 * @param {string} category - The product category name
 * @returns {string} The emoji icon
 */
export const getCategoryEmoji = (category) => {
    if (!category) return DEFAULT_EMOJI;
    const key = Object.keys(CATEGORY_EMOJI_MAP).find(k => k.toLowerCase() === category.toLowerCase().trim());
    return key ? CATEGORY_EMOJI_MAP[key] : DEFAULT_EMOJI;
};

const CATEGORY_KEYWORDS = {
    'Alimentos': 'food,fruit,vegetables',
    'Ferretería': 'tools,hardware,hammer',
    'Supermercado': 'grocery,supermarket,market',
    'Tecnología': 'gadget,technology,electronic',
    'Hogar': 'home,interior,furniture',
    'Belleza': 'beauty,cosmetics,makeup',
    'Deportes': 'sports,fitness,workout',
    'Mascotas': 'pets,dog,cat,animal',
    'Moda': 'fashion,clothes,clothing',
    'Ropa': 'fashion,clothes,clothing',
    'Juguetería': 'toys,play,game',
    'Restaurante': 'restaurant,meal,dinner',
    'Farmacia': 'pharmacy,medicine,medical',
    'Zapatería': 'shoes,footwear,boots',
    'Librería / Papelería': 'books,stationery,office',
    'Panadería': 'bakery,bread,pastry',
};

export const getCategoryPlaceholder = (category, productName = '') => {
    const emoji = getCategoryEmoji(category);
    const catName = category || 'General';
    const cleanProductName = productName ? productName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#f0f4f8;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#d9e2ec;stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#grad)" />
        <text x="50%" y="45%" font-size="120" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
        <text x="50%" y="72%" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#627d98" text-anchor="middle">${catName}</text>
        ${cleanProductName ? `<text x="50%" y="85%" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#829ab1" text-anchor="middle" opacity="0.9">${cleanProductName.length > 30 ? cleanProductName.substring(0, 30) + '...' : cleanProductName}</text>` : ''}
    </svg>`;
    
    // btoa(unescape(encodeURIComponent())) is necessary for base64 encoding unicode (emojis) correctly
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

export default getCategoryEmoji;
