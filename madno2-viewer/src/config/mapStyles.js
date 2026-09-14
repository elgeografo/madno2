// Estilos de mapa disponibles (todos sin API key)
//
// `filter` (opcional): filtro CSS que se aplica a cada tesela en el navegador.
// Se usa para obtener una versión oscura de OSM, que no publica un estilo dark propio.
export const MAP_STYLES = {
  OSM_DARK: {
    id: 'osm-dark',
    name: 'OSM Dark',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    filter: 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(0.9) saturate(0.6)',
    attribution: '© OpenStreetMap contributors'
  },
  OSM_STANDARD: {
    id: 'osm-standard',
    name: 'OSM Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  SATELLITE: {
    id: 'satellite',
    name: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community'
  },
  ESRI_TOPO: {
    id: 'esri-topo',
    name: 'Topográfico (curvas nivel)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, HERE, Garmin, Intermap, INCREMENT P, GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), © OpenStreetMap contributors, GIS User Community'
  },
  OPEN_TOPO: {
    id: 'open-topo',
    name: 'OpenTopoMap (curvas marcadas)',
    url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © OpenTopoMap (CC-BY-SA)'
  }
};

// Estilo por defecto
export const DEFAULT_MAP_STYLE = MAP_STYLES.OSM_DARK.id;
