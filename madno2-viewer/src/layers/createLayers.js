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
  showTerrain,
  selectedHexId,
  highlightedHexIds = []
}) {
  const coverage = Math.max(0.05, Math.min(1, radius / RADIUS_METERS)); // 0..1

  // Obtener la URL del estilo seleccionado
  const selectedStyle = Object.values(MAP_STYLES).find(style => style.id === mapStyleId) || MAP_STYLES.OSM_DARK;
  const tileUrl = selectedStyle.url;
  const tileFilter = selectedStyle.filter || null;

  // Carga de teselas. Si el estilo define un filtro CSS, se aplica en un canvas
  // (p. ej. inversión de colores para obtener OSM en modo oscuro).
  const loadTile = async ({ url, signal }) => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Tesela no disponible: ${url}`);
    const bitmap = await createImageBitmap(await response.blob());
    if (!tileFilter) return bitmap;
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.filter = tileFilter;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas;
  };

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
        id: `basemap-tiles-${selectedStyle.id}`,
        data: tileUrl,
        getTileData: loadTile,
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        // Estrategia para evitar parpadeos durante zoom
        refinementStrategy: 'best-available',  // Muestra tiles de menor resolución mientras carga
        // Zoom extra para permitir overzooming (escalar tiles cuando no están disponibles)
        maxRequests: 20,  // Aumentar requests simultáneas para carga más rápida
        // Mantener tiles antiguas visibles durante transición
        onTileLoad: () => {},  // Evita que se eliminen tiles antes de tiempo
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
            bounds: [west, south, east, north],
            // Transición suave al aparecer
            opacity: subProps.opacity !== undefined ? subProps.opacity : 1,
          });
        }
      })
    );
  }

  // Añadir capa de relieve/terreno 3D si está activada
  if (showTerrain && layers.basemap) {
    // Elevación: teselas Terrarium (AWS Open Data / Mapzen), sin API key.
    // Codificación: altura = (R * 256 + G + B / 256) - 32768
    result.push(
      new TerrainLayer({
        id: 'terrain-layer',
        minZoom: 0,
        maxZoom: 23,
        opacity: 1,
        strategy: 'no-overlap',
        visible: true,
        elevationDecoder: {
          rScaler: 256,
          gScaler: 1,
          bScaler: 1 / 256,
          offset: -32768
        },
        elevationData: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
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

    // Capa adicional para hexágonos resaltados (análisis espacial)
    if (highlightedHexIds.length > 0) {
      const highlightedHexData = data.filter(d => highlightedHexIds.includes(d.h3));

      if (highlightedHexData.length > 0) {
        result.push(
          new H3HexagonLayer({
            id: 'h3-highlighted-layer',
            data: highlightedHexData,
            pickable: true,
            extruded: true,
            opacity: 0.9,
            coverage: coverage * 1.03,
            elevationScale: elevationScale,
            getHexagon: (d) => d.h3,
            getFillColor: [255, 140, 0, 200], // Naranja brillante para múltiples hexágonos
            getElevation: (d) => d.value * 1.3, // 30% más alto
            stroked: true,
            filled: true,
            getLineColor: [255, 255, 255, 200], // Borde blanco semi-transparente
            lineWidthMinPixels: 2,
            lineWidthMaxPixels: 3,
          })
        );
      }
    }

    // Capa adicional para el hexágono seleccionado (sobrepuesta con borde)
    // Esta capa va después para que aparezca sobre los resaltados
    if (selectedHexId) {
      const selectedHexData = data.filter(d => d.h3 === selectedHexId);

      if (selectedHexData.length > 0) {
        result.push(
          new H3HexagonLayer({
            id: 'h3-selected-layer',
            data: selectedHexData,
            pickable: true,
            extruded: true,
            opacity: 1,
            coverage: coverage * 1.05, // Ligeramente más grande
            elevationScale: elevationScale,
            getHexagon: (d) => d.h3,
            getFillColor: [255, 255, 0, 220], // Amarillo brillante
            getElevation: (d) => d.value * 1.5, // 50% más alto
            stroked: true,
            filled: true,
            getLineColor: [255, 255, 255, 255], // Borde blanco
            lineWidthMinPixels: 3,
            lineWidthMaxPixels: 5,
          })
        );
      }
    }
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
