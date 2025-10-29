// Configuración de los diferentes mapas disponibles
export const MAPS_CONFIG = {
  madno2: {
    id: 'madno2',
    name: 'Madrid NO2',
    description: 'Visualización de niveles de NO2 en Madrid',
    dataBase: '/data/madno2024',
    initialViewState: {
      longitude: -3.7038,
      latitude: 40.4168,
      zoom: 10,
      pitch: 30,
      bearing: 0,
    },
    h3Resolution: 9,
    defaultYear: 2024,
    // Configuración de capas a mostrar
    layers: {
      h3Hexagons: true,
      basemap: true,
    },
  },
  // Aquí puedes añadir más configuraciones de mapas
  alcarria: {
    id: 'alcarria',
    name: 'La Alcarria',
    description: 'Visualización de datos en La Alcarria (Pastrana)',
    initialViewState: {
      longitude: -2.92,
      latitude: 40.42,
      zoom: 10,
      pitch: 45,
      bearing: 0,
    },
    // Configuración de capas a mostrar
    layers: {
      h3Hexagons: false,       // NO mostrar capa H3
      basemap: true,            // Mapa base
      geojsonChoropleth: true,  // Mostrar capa coropleta GeoJSON
    },
    // Configuración de capa GeoJSON
    geojson: {
      url: 'https://datos1.geoso2.es/spain/alcarria/poblacion/alcarria_municpios.geojson',
      matchProperty: 'NATCODE',  // Propiedad del GeoJSON para hacer match (últimos 5 dígitos) - EN MAYÚSCULAS
      opacity: 0.8,
      lineColor: [255, 255, 255, 200],  // Borde blanco
      lineWidth: 2,
    },
    // Configuración de visualización por provincias (modo estático)
    provinceMode: {
      property: 'ALCARRIA_C',  // Propiedad para colorear
      colorMap: {
        1: [139, 69, 19],      // Marrón (brown)
        2: [34, 139, 34],      // Verde (green)
        3: [255, 215, 0],      // Amarillo (yellow)
      },
      defaultColor: [128, 128, 128],  // Gris por defecto
    },
    // Configuración de datos de población (modo dinámico)
    population: {
      csvUrl: 'https://datos1.geoso2.es/spain/alcarria/poblacion/ALCARRIA%20Pob.csv',
      availableYears: ['2024', '2022', '2020', '2015'],
      maxElevation: 5000,  // Altura máxima de extrusión en metros
    },
    // Modos de visualización disponibles
    visualizationModes: [
      { id: 'provincias', label: 'Provincias', type: 'static' },
      { id: '2024', label: 'Población 2024', type: 'population' },
      { id: '2022', label: 'Población 2022', type: 'population' },
      { id: '2020', label: 'Población 2020', type: 'population' },
      { id: '2015', label: 'Población 2015', type: 'population' },
    ],
    defaultVisualizationMode: 'provincias',
    // Indicador de qué controles mostrar
    controls: {
      mapStyleSelector: true,
      controlPanel: false,
      animationPanel: false,
      legendSelector: true,  // Control para selección de modo de visualización
    }
  },
  example: {
    id: 'example',
    name: 'Ejemplo Región',
    description: 'Mapa de ejemplo para otra región',
    dataBase: '/data/example',
    initialViewState: {
      longitude: 0,
      latitude: 0,
      zoom: 8,
      pitch: 30,
      bearing: 0,
    },
    h3Resolution: 9,
    defaultYear: 2024,
  },
};
