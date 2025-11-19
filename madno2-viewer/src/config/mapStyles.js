// Available map styles
export const MAP_STYLES = {
  CARTO_DARK: {
    id: 'carto-dark',
    name: 'CartoDB Dark',
    url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © CARTO'
  },
  CARTO_LIGHT: {
    id: 'carto-light',
    name: 'CartoDB Light',
    url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © CARTO'
  },
  OSM_STANDARD: {
    id: 'osm-standard',
    name: 'OSM Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  CARTO_VOYAGER: {
    id: 'carto-voyager',
    name: 'CartoDB Voyager',
    url: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © CARTO'
  },
  STAMEN_TONER: {
    id: 'stamen-toner',
    name: 'Stamen Toner',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
    attribution: '© Stamen Design, © OpenStreetMap contributors'
  },
  SATELLITE: {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community'
  },
  TERRAIN: {
    id: 'terrain',
    name: 'Terrain',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
    attribution: '© Stamen Design, © OpenStreetMap contributors'
  },
  ESRI_TOPO: {
    id: 'esri-topo',
    name: 'Topographic (contour lines)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, HERE, Garmin, Intermap, INCREMENT P, GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), © OpenStreetMap contributors, GIS User Community'
  },
  OPEN_TOPO: {
    id: 'open-topo',
    name: 'OpenTopoMap (marked contours)',
    url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © OpenTopoMap (CC-BY-SA)'
  }
};

// Default style
export const DEFAULT_MAP_STYLE = MAP_STYLES.CARTO_DARK.id;
