import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RADIUS_METERS } from '../config/constants';
import { DEFAULT_MAP_STYLE } from '../config/mapStyles';
import { MAPS_CONFIG } from '../config/mapsConfig';
import { buildFrames } from '../utils/frameBuilder';
import { useDataLoader } from '../hooks/useDataLoader';
import { useParquetDataLoaderCompat } from '../hooks/useParquetDataLoader';
import { useAnimation } from '../hooks/useAnimation';
import { useHexPicker } from '../hooks/useHexPicker';
import { createLayers } from '../layers/createLayers';
import { loadGeoJSON } from '../utils/geojsonLoader';
import { loadPopulationCSV, extractMunicipalityCode, calculateAllRanges } from '../utils/populationLoader';
import { ControlPanel } from '../components/ControlPanel';
import { MenuBar } from '../components/MenuBar';
import { AnimationPanel } from '../components/AnimationPanel';
import { LegendSelector } from '../components/LegendSelector';
import { PopulationInfoPanel } from '../components/PopulationInfoPanel';
import { HexTooltip } from '../components/HexTooltip';
import { MapViewer } from '../components/MapViewer';

export function MapView() {
  const { mapId } = useParams();
  const mapConfig = MAPS_CONFIG[mapId];

  // Controles de visualización
  const [radius, setRadius] = useState(RADIUS_METERS);
  const [elevationScale, setElevationScale] = useState(5);
  const [opacity, setOpacity] = useState(0.8);
  const [mapStyleId, setMapStyleId] = useState(DEFAULT_MAP_STYLE);

  // Filtros de animación
  const [year, setYear] = useState(mapConfig?.defaultYear);
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');

  // Secuencia y reproducción
  const [frames, setFrames] = useState([]);

  // Estado para datos GeoJSON
  const [geojsonData, setGeojsonData] = useState(null);

  // Estado para datos de población
  const [populationData, setPopulationData] = useState(null);
  const [populationRanges, setPopulationRanges] = useState(null);

  // Estado para modo de visualización (provincias o año específico)
  const [visualizationMode, setVisualizationMode] = useState(
    mapConfig?.defaultVisualizationMode || 'provincias'
  );

  // Estado para el panel de información de población
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [selectedMunicipalityName, setSelectedMunicipalityName] = useState(null);

  // Estado para capa de relieve
  const [showTerrain, setShowTerrain] = useState(false);

  // Estado para controlar la vista del mapa
  const [viewState, setViewState] = useState(mapConfig?.initialViewState);

  // Configuración de controles (por defecto todos activos si no se especifica)
  const controls = mapConfig?.controls || {
    mapStyleSelector: true,
    controlPanel: true,
    animationPanel: true,
  };

  // Configuración de capas (por defecto todas activas si no se especifica)
  const layersConfig = mapConfig?.layers || {
    h3Hexagons: true,
    basemap: true,
  };

  // Recalcular la línea temporal cuando cambian los filtros
  useEffect(() => {
    if (!mapConfig) return;
    const f = buildFrames({ year, month: month ? Number(month) : '', day: day ? Number(day) : '', hour: hour });
    setFrames(f);
  }, [mapConfig, year, month, day, hour]);

  // Cargar GeoJSON si está configurado
  useEffect(() => {
    if (!mapConfig) return;
    const loadGeojsonData = async () => {
      if (layersConfig.geojsonChoropleth && mapConfig.geojson?.url) {
        try {
          const data = await loadGeoJSON(mapConfig.geojson.url);
          setGeojsonData(data);
        } catch (error) {
          console.error('Error loading GeoJSON for map:', mapId, error);
          setGeojsonData(null);
        }
      } else {
        setGeojsonData(null);
      }
    };

    loadGeojsonData();
  }, [mapConfig, mapId, layersConfig.geojsonChoropleth]);

  // Cargar datos de población si está configurado
  useEffect(() => {
    if (!mapConfig) return;
    const loadPopulationData = async () => {
      if (mapConfig.population?.csvUrl) {
        try {
          const data = await loadPopulationCSV(mapConfig.population.csvUrl);
          setPopulationData(data);

          // Pre-calcular rangos para todos los años disponibles
          if (mapConfig.population?.availableYears) {
            const ranges = calculateAllRanges(data, mapConfig.population.availableYears);
            setPopulationRanges(ranges);
          }

          console.log('Population data loaded successfully');
        } catch (error) {
          console.error('Error loading population data:', error);
          setPopulationData(null);
          setPopulationRanges(null);
        }
      } else {
        setPopulationData(null);
        setPopulationRanges(null);
      }
    };

    loadPopulationData();
  }, [mapConfig]);

  // Hooks personalizados
  const { frameIdx, setFrameIdx, playing, handlePlay, handlePause, handleStop } = useAnimation(frames);

  // Seleccionar el loader apropiado según la configuración
  const dataSourceType = mapConfig?.dataSource?.type || 'csv';
  const h3DataCsv = useDataLoader(frames, frameIdx);
  const h3DataParquet = useParquetDataLoaderCompat(
    frames,
    frameIdx,
    mapConfig?.dataSource?.parquetBase
  );

  // Usar el loader apropiado
  const h3Data = dataSourceType === 'parquet' ? h3DataParquet : h3DataCsv;

  const { pickedHex, pointerPos, handleClick } = useHexPicker();
  // Solo usar datos si la capa H3 está activada
  const data = layersConfig.h3Hexagons ? h3Data : [];

  // Si no existe la configuración del mapa, mostrar error
  if (!mapConfig) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6'
      }}>
        <h1 style={{ fontSize: '2rem', color: '#1f2937', marginBottom: '16px' }}>
          Mapa no encontrado
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          El mapa "{mapId}" no existe en la configuración.
        </p>
        <Link
          to="/"
          style={{
            padding: '12px 24px',
            background: '#667eea',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600'
          }}
        >
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  // Crear capas
  const layers = createLayers(data, {
    radius,
    elevationScale,
    opacity,
    mapStyleId,
    layersConfig,
    geojsonData,
    geojsonConfig: mapConfig.geojson,
    populationData,
    populationRanges,
    maxElevation: mapConfig.population?.maxElevation,
    visualizationMode,
    provinceConfig: mapConfig.provinceMode,
    showTerrain
  });

  // Manejador de click mejorado para soportar GeoJSON y H3
  const handleClickEvent = (info) => {
    // Si es GeoJSON, actualizar el panel de información
    if (info.layer?.id === 'geojson-choropleth-layer' && info.object) {
      // Extraer código de municipio para mostrar datos de población
      if (mapConfig.geojson?.matchProperty && info.object.properties && populationData) {
        const natcode = info.object.properties[mapConfig.geojson.matchProperty];
        const municipalityCode = extractMunicipalityCode(natcode);
        const popData = populationData[municipalityCode];

        if (popData) {
          setSelectedMunicipalityName(popData.name);
          setSelectedMunicipality(popData);
        }
      }
    } else {
      // Si no es GeoJSON, usar el manejador existente para H3
      handleClick(info);
    }
  };

  // Manejador para cambiar la ubicación del mapa desde el geocodificador
  const handleLocationSelected = ({ latitude, longitude, zoom }) => {
    setViewState({
      ...viewState,
      longitude,
      latitude,
      zoom,
      transitionDuration: 1000, // Animación suave de 1 segundo
    });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Barra de menú superior */}
      <MenuBar
        mapStyleId={mapStyleId}
        setMapStyleId={setMapStyleId}
        showTerrain={showTerrain}
        setShowTerrain={setShowTerrain}
        onLocationSelected={handleLocationSelected}
      />

      {/* Renderizar controles condicionalmente según configuración del mapa */}
      {controls.controlPanel && (
        <ControlPanel
          radius={radius}
          setRadius={setRadius}
          elevationScale={elevationScale}
          setElevationScale={setElevationScale}
          opacity={opacity}
          setOpacity={setOpacity}
        />
      )}

      {controls.legendSelector && mapConfig.visualizationModes && (
        <LegendSelector
          selectedMode={visualizationMode}
          setSelectedMode={setVisualizationMode}
          modes={mapConfig.visualizationModes}
        />
      )}

      <MapViewer
        layers={layers}
        onClick={handleClickEvent}
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }) => setViewState(newViewState)}
        initialViewState={mapConfig.initialViewState}
      />

      {/* Tooltip para hexágonos H3 */}
      <HexTooltip pickedHex={pickedHex} pointerPos={pointerPos} />

      {/* Panel de información de población en esquina inferior derecha */}
      <PopulationInfoPanel
        municipalityName={selectedMunicipalityName}
        populationData={selectedMunicipality}
        availableYears={mapConfig.population?.availableYears}
        selectedYear={visualizationMode !== 'provincias' ? visualizationMode : null}
      />

      {controls.animationPanel && (
        <AnimationPanel
          frames={frames}
          frameIdx={frameIdx}
          setFrameIdx={setFrameIdx}
          playing={playing}
          handlePlay={handlePlay}
          handlePause={handlePause}
          handleStop={handleStop}
        />
      )}
    </div>
  );
}
