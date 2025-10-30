import { TileLayer, TerrainLayer } from '@deck.gl/geo-layers';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer } from '@deck.gl/layers';
import { BitmapLayer } from '@deck.gl/layers';
import { colorFromValue } from '../utils/colorUtils';
import { RADIUS_METERS } from '../config/constants';
import { MAP_STYLES } from '../config/mapStyles';
import { getFeatureColor } from '../utils/geojsonLoader';
import { getPopulationColor, getPopulationElevation } from '../utils/populationColors';
import { extractMunicipalityCode } from '../utils/populationLoader';

export function createLayers(data, {
  radius,
  elevationScale,
  opacity,
  mapStyleId,
  layersConfig,
  geojsonData,
  geojsonConfig,
  populationData,
  populationRanges,
  maxElevation,
  visualizationMode,
  provinceConfig,
  showTerrain
}) {
  const coverage = Math.max(0.05, Math.min(1, radius / RADIUS_METERS)); // 0..1

  // Obtener la URL del estilo seleccionado
  const selectedStyle = Object.values(MAP_STYLES).find(style => style.id === mapStyleId);
  const tileUrl = selectedStyle ? selectedStyle.url : MAP_STYLES.CARTO_DARK.url;

  // Configuración por defecto de capas (si no se especifica)
  const layers = layersConfig || {
    h3Hexagons: true,
    basemap: true,
  };

  const result = [];

  // Añadir capa de mapa base
  if (layers.basemap && !showTerrain) {
    // Mapa base plano normal
    result.push(
      new TileLayer({
        id: 'osm-tiles',
        data: tileUrl,
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        renderSubLayers: (subProps) => {
          const tile = subProps.tile;
          const img = subProps.data;
          const bbox = tile && tile.bbox;
          if (!img || !bbox) {
            return null;
          }
          const { west, south, east, north } = bbox;
          return new BitmapLayer(subProps, {
            data: null,
            image: img,
            bounds: [west, south, east, north]
          });
        }
      })
    );
  }

  // Añadir capa de relieve/terreno 3D si está activada
  if (showTerrain && layers.basemap) {
    const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibHVpc2l6cXVpZXJkb21lc2EiLCJhIjoiY2tlOHFkaXk3MXo4MDJ6b2JudHloNXV6aCJ9.Yvr3aJ8qLWuh2BpEJbH7Sg';

    result.push(
      new TerrainLayer({
        id: 'terrain-layer',
        minZoom: 0,
        maxZoom: 23,
        opacity: 1,
        strategy: 'no-overlap',
        visible: true,
        elevationDecoder: {
          rScaler: 6553.6,
          gScaler: 25.6,
          bScaler: 0.1,
          offset: -10000
        },
        elevationData: `https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.png?access_token=${MAPBOX_ACCESS_TOKEN}`,
        texture: tileUrl,
        wireframe: false,
        color: [255, 255, 255],
        operation: 'terrain+draw',
      })
    );
  }

  // Añadir capa H3 si está configurada
  if (layers.h3Hexagons) {
    result.push(
      new H3HexagonLayer({
        id: 'h3-layer',
        data,
        pickable: true,
        autoHighlight: true,
        highlightColor: [0, 0, 255, 100],
        extruded: true,
        opacity: opacity,
        coverage: coverage,
        elevationScale: elevationScale,
        getHexagon: (d) => d.h3,
        getId: (d) => d.h3,
        transitions: {
          getElevation: { duration: 1000, enter: (d) => d.prevValue ?? 0 },
          getFillColor: { duration: 1000, enter: (d) => colorFromValue(d.prevValue ?? 0) },
        },
        getFillColor: (d) => colorFromValue(d.value),
        getElevation: (d) => d.value,
      })
    );
  }

  // Añadir capa GeoJSON choropleth si está configurada
  if (layers.geojsonChoropleth && geojsonData && geojsonConfig) {
    // Determinar modo de visualización
    const isPopulationMode = visualizationMode && visualizationMode !== 'provincias';
    const isProvinceMode = visualizationMode === 'provincias';

    // Obtener rango para el año seleccionado si estamos en modo población
    const currentRange = isPopulationMode && populationRanges ? populationRanges[visualizationMode] : null;

    console.log('Creating GeoJSON layer - mode:', visualizationMode, 'isPopulation:', isPopulationMode, 'hasRange:', !!currentRange);
    if (populationData && geojsonData) {
      console.log('  Population data keys (first 5):', Object.keys(populationData).slice(0, 5));
      console.log('  GeoJSON first feature natcode:', geojsonData.features?.[0]?.properties?.[geojsonConfig.matchProperty]);
    }

    let debugLogShown = false;
    result.push(
      new GeoJsonLayer({
        id: 'geojson-choropleth-layer',
        data: geojsonData,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false, // SIN EXTRUSIÓN por ahora
        autoHighlight: true,
        highlightColor: [255, 255, 255, 100],
        lineWidthMinPixels: geojsonConfig.lineWidth || 1,
        getFillColor: (feature) => {
          // MODO POBLACIÓN: Colorear por gradiente según población
          if (isPopulationMode && populationData && currentRange) {
            const natcode = feature.properties[geojsonConfig.matchProperty];
            const municipalityCode = extractMunicipalityCode(natcode);
            const popData = populationData[municipalityCode];

            // DEBUG: Log solo una vez
            if (!debugLogShown) {
              console.log('  First feature DEBUG:');
              console.log('    natcode:', natcode);
              console.log('    municipalityCode:', municipalityCode);
              console.log('    has popData:', !!popData);
              console.log('    year:', visualizationMode);
              console.log('    value:', popData?.[visualizationMode]);
              debugLogShown = true;
            }

            if (popData && popData[visualizationMode]) {
              const population = popData[visualizationMode];
              const color = getPopulationColor(
                population,
                currentRange.min,
                currentRange.max
              );
              const alpha = Math.round((geojsonConfig.opacity || 0.8) * 255);
              return [...color, alpha];
            }
          }

          // MODO PROVINCIAS: Colorear por código de provincia
          if (isProvinceMode && provinceConfig) {
            const color = getFeatureColor(
              feature,
              provinceConfig.property,
              provinceConfig.colorMap,
              provinceConfig.defaultColor
            );
            const alpha = Math.round((geojsonConfig.opacity || 0.6) * 255);
            return [...color, alpha];
          }

          // Color por defecto (gris)
          return [200, 200, 200, 180];
        },
        getLineColor: geojsonConfig.lineColor || [255, 255, 255, 200],
        getLineWidth: geojsonConfig.lineWidth || 2,
        // Transiciones suaves al cambiar de modo/año
        transitions: {
          getFillColor: 500,
        },
        updateTriggers: {
          getFillColor: [visualizationMode, populationData, populationRanges, provinceConfig],
        },
      })
    );
  }

  return result;
}
