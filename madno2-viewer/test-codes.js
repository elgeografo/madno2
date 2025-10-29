// Test del matching de códigos
const extractMunicipalityCode = (code) => {
  if (!code) return '';
  const codeStr = String(code);
  return codeStr.slice(-5);
};

// Ejemplos del GeoJSON (natcode)
const geojsonCodes = ['ES16005', 'ES16009', 'ES16011'];

// Ejemplos del CSV (primeros 5 dígitos)
const csvCodes = ['16005', '16009', '16011'];

console.log('Testing code extraction:');
geojsonCodes.forEach(natcode => {
  const extracted = extractMunicipalityCode(natcode);
  const matches = csvCodes.includes(extracted);
  console.log(`  ${natcode} -> ${extracted} (matches: ${matches})`);
});
