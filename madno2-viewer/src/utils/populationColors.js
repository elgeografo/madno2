/**
 * Interpola entre dos valores
 * @param {number} value - Valor actual
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number} - Valor normalizado entre 0 y 1
 */
function normalize(value, min, max) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

/**
 * Interpola entre dos colores RGB
 * @param {Array} color1 - Color inicial [r, g, b]
 * @param {Array} color2 - Color final [r, g, b]
 * @param {number} factor - Factor de interpolación (0 a 1)
 * @returns {Array} - Color interpolado [r, g, b]
 */
function interpolateColor(color1, color2, factor) {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * factor),
    Math.round(color1[1] + (color2[1] - color1[1]) * factor),
    Math.round(color1[2] + (color2[2] - color1[2]) * factor),
  ];
}

/**
 * Genera un color basado en población usando gradiente azul → rojo
 * @param {number} population - Valor de población
 * @param {number} min - Población mínima
 * @param {number} max - Población máxima
 * @returns {Array} - Color RGB [r, g, b]
 */
export function getPopulationColor(population, min, max) {
  // Normalizar el valor entre 0 y 1
  const normalized = normalize(population, min, max);

  // Gradiente directo azul → morado → rojo
  // A medida que aumenta, el azul disminuye y el rojo aumenta
  const red = Math.round(normalized * 255);
  const blue = Math.round((1 - normalized) * 255);
  const green = 0; // Sin componente verde para mantener el gradiente azul-rojo

  return [red, green, blue];
}

/**
 * Calcula la elevación basada en población
 * @param {number} population - Valor de población
 * @param {number} min - Población mínima
 * @param {number} max - Población máxima
 * @param {number} maxHeight - Altura máxima en metros (default: 5000)
 * @returns {number} - Elevación en metros
 */
export function getPopulationElevation(population, min, max, maxHeight = 5000) {
  const normalized = normalize(population, min, max);
  // Escala logarítmica para que las diferencias pequeñas sean visibles
  return Math.pow(normalized, 0.5) * maxHeight;
}
