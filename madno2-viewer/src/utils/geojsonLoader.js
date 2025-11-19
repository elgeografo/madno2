/**
 * Carga un archivo GeoJSON desde una URL
 * @param {string} url - URL del archivo GeoJSON
 * @returns {Promise<Object>} - GeoJSON data
 */
export async function loadGeoJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading GeoJSON:', error);
    throw error;
  }
}

/**
 * Obtiene el color para un feature basado en una propiedad y un mapa de colores
 * @param {Object} feature - GeoJSON feature
 * @param {string} property - Nombre de la propiedad a usar
 * @param {Object} colorMap - Mapa de valores a colores RGB
 * @param {Array} defaultColor - Color por defecto [r, g, b]
 * @returns {Array} - Color RGB [r, g, b, a]
 */
export function getFeatureColor(feature, property, colorMap, defaultColor = [128, 128, 128]) {
  const value = feature.properties[property];
  const color = colorMap[value] || defaultColor;
  return color;
}
