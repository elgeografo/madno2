// Configuración de los mapas disponibles

// Base de datos estáticos: mismo origen que la app, bajo <base>/data/
// Al ser mismo origen no hace falta CORS. El servidor debe soportar peticiones Range.
const DATA_ROOT = `${window.location.origin}${import.meta.env.BASE_URL}data`;

export const MAPS_CONFIG = {
  madno2: {
    id: 'madno2',
    name: 'Madrid NO2',
    description: 'Visualización de niveles de NO2 en Madrid',
    // Configuración de datos
    dataSource: {
      type: 'parquet', // 'csv' o 'parquet'
      // Para CSV (legacy):
      csvBase: '/data/madno2024',
      // Para Parquet: <DATA_ROOT>/parquet/year=YYYY/month=MM/data.parquet
      parquetBase: `${DATA_ROOT}/parquet`,
    },
    initialViewState: {
      longitude: -3.7038,
      latitude: 40.4168,
      zoom: 10,
      pitch: 30,
      bearing: 0,
    },
    h3Resolution: 9,
    defaultYear: 2001,
    // Configuración de capas a mostrar
    layers: {
      h3Hexagons: true,
      basemap: true,
    },
  },
};
