import Papa from 'papaparse';

/**
 * Carga y parsea el CSV de población
 * @param {string} url - URL del archivo CSV
 * @returns {Promise<Object>} - Objeto con código de municipio como key y datos de población por año
 */
export async function loadPopulationCSV(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter: ';',
        complete: (results) => {
          try {
            const populationData = {};

            console.log('CSV parsing - first row sample:', results.data[0]);
            console.log('CSV parsing - column names:', Object.keys(results.data[0] || {}));

            // Procesar cada fila del CSV
            results.data.forEach((row, index) => {
              // La primera columna (sin nombre o con espacios) tiene el formato "16005 Albalate de las Nogueras"
              // Buscar la columna que no es un año (2024, 2022, etc.)
              const municipalityColumnName = Object.keys(row).find(key =>
                key.trim() === '' || !['2024', '2022', '2020', '2015', '2000'].includes(key)
              );

              const fullValue = municipalityColumnName ? row[municipalityColumnName] : null;

              if (index === 0) {
                console.log('CSV first row - municipalityColumnName:', JSON.stringify(municipalityColumnName));
                console.log('CSV first row - fullValue:', JSON.stringify(fullValue));
              }

              if (fullValue) {
                // Extraer los primeros 5 dígitos (código de municipio)
                const municipalityCode = fullValue.trim().substring(0, 5);

                if (index === 0) {
                  console.log('CSV first row - extracted code:', municipalityCode);
                }

                // Extraer valores de población para cada año
                populationData[municipalityCode] = {
                  code: municipalityCode,
                  name: fullValue.substring(6).trim(), // Nombre después del código
                  '2024': parseInt(row['2024']) || 0,
                  '2022': parseInt(row['2022']) || 0,
                  '2020': parseInt(row['2020']) || 0,
                  '2015': parseInt(row['2015']) || 0,
                  '2000': parseInt(row['2000']) || 0,
                };
              }
            });

            console.log('Population data loaded:', Object.keys(populationData).length, 'municipalities');
            console.log('Population data keys (first 10):', Object.keys(populationData).slice(0, 10));
            resolve(populationData);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error loading population CSV:', error);
    throw error;
  }
}

/**
 * Extrae los últimos 5 dígitos de un código
 * @param {string} code - Código completo (ej: "ES16005")
 * @returns {string} - Últimos 5 dígitos (ej: "16005")
 */
export function extractMunicipalityCode(code) {
  if (!code) return '';
  const codeStr = String(code);
  return codeStr.slice(-5);
}

/**
 * Obtiene el rango (min, max) de población para un año específico
 * @param {Object} populationData - Datos de población
 * @param {string} year - Año a analizar
 * @returns {Object} - {min, max}
 */
export function getPopulationRange(populationData, year) {
  const values = Object.values(populationData)
    .map(d => d[year])
    .filter(v => v > 0);

  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

/**
 * Pre-calcula los rangos de población para todos los años disponibles
 * @param {Object} populationData - Datos de población
 * @param {Array<string>} years - Lista de años a analizar
 * @returns {Object} - Objeto con rangos por año: { '2024': {min, max}, ... }
 */
export function calculateAllRanges(populationData, years) {
  const ranges = {};

  years.forEach(year => {
    ranges[year] = getPopulationRange(populationData, year);
  });

  console.log('Pre-calculated population ranges:', ranges);
  return ranges;
}
