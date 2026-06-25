/**
 * Devuelve la ruta estática del ícono generado por IA para cada categoría.
 * @param {string} categoryName - Nombre de la categoría
 * @returns {string|null} - Ruta de la imagen en public/assets/categories/ o null si no hay ícono
 */
export const getCategoryIconUrl = (categoryName) => {
    if (!categoryName) return null;
    
    // Mapeo del nombre en la base de datos al nombre del archivo estático
    const nameMap = {
        'supermercado': 'supermercado.png',
        'zapatería': 'zapateria.png',
        'zapateria': 'zapateria.png',
        'electrónica / celulares': 'electronica.png',
        'electrónica': 'electronica.png',
        'restaurante': 'restaurante.png',
        'farmacia': 'farmacia.png',
        'librería / papelería': 'libreria.png',
        'librería': 'libreria.png',
        'panadería': 'panaderia.png'
    };

    const key = categoryName.toLowerCase().trim();
    const fileName = nameMap[key];

    if (fileName) {
        return `/assets/categories/${fileName}`;
    }

    // Si la categoría viene con el campo imageUrl (de la base de datos) 
    // lo ideal sería leerlo directamente en el componente, pero esta función
    // sirve como fallback perfecto para los estáticos.
    return null;
};
