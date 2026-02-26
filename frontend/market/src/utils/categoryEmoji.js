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

export default getCategoryEmoji;
