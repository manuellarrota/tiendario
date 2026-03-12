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
    return CATEGORY_EMOJI_MAP[category] || DEFAULT_EMOJI;
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

/**
 * Returns a placeholder image URL based on the product category.
 * @param {string} category - The product category name
 * @param {string} productName - Optional product name to include in search
 * @returns {string} The placeholder image URL
 */
export const getCategoryPlaceholder = (category, productName = '') => {
    const keyword = CATEGORY_KEYWORDS[category] || 'product,package,box';
    const seed = productName ? encodeURIComponent(productName) : Math.random().toString(36).substring(7);
    return `https://loremflickr.com/400/400/${keyword.split(',')[0]}?random=${seed}`;
};

export default getCategoryEmoji;
