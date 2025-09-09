import React, { useState, useEffect, useRef } from 'react';
import { DeckGL } from '@deck.gl/react';
import { H3HexagonLayer, TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import Papa from 'papaparse';
import { cellToLatLng } from 'h3-js';
import { edgeLength, UNITS } from 'h3-js/legacy';

// ================== CONFIG ==================
const H3_RES = 9;
const RADIUS_METERS = edgeLength(H3_RES, UNITS.m); // radio aprox. del hex de H3 en metros
// Carpeta base donde están los CSV/GeoJSON. Ajusta si tus datos están en otra ruta.
const DATA_BASE = '/data/madno2020';
const ANIM_MS = 1000; // 1s por frame
// ===========================================

const INITIAL_VIEW_STATE = {
  longitude: -3.7038,
  latitude: 40.4168,
  zoom: 10,
  pitch: 30,
  bearing: 0,
};

// Helpers para nombres de archivos y calendario
const pad2 = (n) => String(n).padStart(2, '0');
const buildFileName = ({ year, month, day, hour, res = H3_RES, ext = 'csv' }) =>
  `points_${year}${pad2(month)}${pad2(day)}_${pad2(hour)}_res${res}.${ext}`;

const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

// Color helper para mantener consistencia en transiciones
const colorFromValue = (v) => {
  const val = Number(v) || 0;
  const a = val <= 0 ? 0 : 255; // ocultar cuando está en 0 (fade-out invisible)
  return [
    Math.min(255, Math.max(0, Math.round(val * 4))),
    80,
    180 - Math.min(180, Math.max(0, Math.round(val * 2))),
    a,
  ];
};

// Genera la secuencia de frames según los filtros elegidos
function buildFrames({ year, month, day, hour }) {
  if (!year) return [];
  const frames = [];

  // Caso 1: Año + Mes + Día => animación por horas (00..23) de ese día
  if (year && month && day && !Number.isNaN(Number(day))) {
    for (let h = 0; h < 24; h++) frames.push({ year, month, day, hour: h });
    return frames;
  }

  // Caso 2: Año + Hora => animación por todos los días del año a esa hora
  if (year && hour !== '' && hour !== null && hour !== undefined && !(month || day)) {
    for (let m = 1; m <= 12; m++) {
      const dim = daysInMonth(year, m);
      for (let d = 1; d <= dim; d++) frames.push({ year, month: m, day: d, hour: Number(hour) });
    }
    return frames;
  }

  // Caso 3 (extra útil): Año + Mes => animación día a día y hora a hora de ese mes
  if (year && month && !day && (hour === '' || hour === undefined)) {
    const dim = daysInMonth(year, month);
    for (let d = 1; d <= dim; d++) {
      for (let h = 0; h < 24; h++) frames.push({ year, month, day: d, hour: h });
    }
    return frames;
  }

  // Caso 4: Solo Año => hora a hora y día a día de todo el año
  if (year && !(month || day || (hour !== '' && hour !== undefined))) {
    for (let m = 1; m <= 12; m++) {
      const dim = daysInMonth(year, m);
      for (let d = 1; d <= dim; d++) {
        for (let h = 0; h < 24; h++) frames.push({ year, month: m, day: d, hour: h });
      }
    }
    return frames;
  }

  // Si se proporciona una combinación no contemplada, no generamos nada.
  return [];
}

function App() {
  const [data, setData] = useState([]);
  const [pickedHex, setPickedHex] = useState(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });

  // Controles de visualización
  const [radius, setRadius] = useState(RADIUS_METERS); // metros, [0, RADIUS_METERS]
  const [elevationScale, setElevationScale] = useState(5); // [0, 20]
  const [opacity, setOpacity] = useState(0.8); // [0, 1]

  // Filtros de animación
  //const thisYear = new Date().getFullYear();
  const thisYear = 2024;
  const [year, setYear] = useState(thisYear); // Siempre obligatorio (por defecto: año actual)
  const [month, setMonth] = useState(''); // 1..12 o ''
  const [day, setDay] = useState(''); // 1..31 o '' (controlado por month)
  const [hour, setHour] = useState(''); // 0..23 o ''

  // Secuencia y reproducción
  const [frames, setFrames] = useState([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  // Cache de datos ya cargados (filename -> array de features)
  const cacheRef = useRef(new Map());
  const dataArrayRef = useRef([]); // arreglo persistente para mantener orden y referencias
  const dataIndexRef = useRef(new Map()); // h3 -> índice en dataArrayRef

  // Recalcular la línea temporal cuando cambian los filtros
  useEffect(() => {
    const f = buildFrames({ year, month: month ? Number(month) : '', day: day ? Number(day) : '', hour: hour });
    setFrames(f);
    setFrameIdx(0);
  }, [year, month, day, hour]);

  // Cargar datos del frame actual
  useEffect(() => {
    if (frames.length === 0) {
      setData([]);
      dataArrayRef.current = [];
      dataIndexRef.current = new Map();
      return;
    }
    const cur = frames[frameIdx];
    const filename = buildFileName(cur);
    const path = `${DATA_BASE}/${filename}`;

    const cached = cacheRef.current.get(path);
    if (cached) {
      // Actualizar el arreglo persistente en orden estable
      const indexMap = dataIndexRef.current;
      const arr = dataArrayRef.current;

      // Marcar presentes en este frame
      const present = new Set();

      // Actualizar / crear entradas para los h3 presentes
      for (const row of cached) {
        const i = indexMap.get(row.h3);
        if (i !== undefined) {
          const obj = arr[i];
          obj.prevValue = obj.value;
          obj.value = row.value;
          obj.coordinates = row.coordinates; // por si cambian (no debería)
          present.add(row.h3);
        } else {
          const obj = { h3: row.h3, coordinates: row.coordinates, value: row.value, prevValue: 0 };
          arr.push(obj);
          indexMap.set(row.h3, arr.length - 1);
          present.add(row.h3);
        }
      }

      // Para los que no están presentes en este frame, hacer fade a 0 manteniendo objeto y posición
      for (let i = 0; i < arr.length; i++) {
        const obj = arr[i];
        if (!present.has(obj.h3)) {
          obj.prevValue = obj.value;
          obj.value = 0;
        }
      }

      setData(arr.slice());
      return;
    }

    fetch(path)
      .then((resp) => {
        if (!resp.ok) throw new Error(`No se pudo cargar ${path}`);
        return resp.text();
      })
      .then((csvText) => {
        const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true }).data;
        const processed = parsed
          .filter((d) => d && d.h3_index)
          .map((d) => {
            const [lat, lng] = cellToLatLng(d.h3_index);
            return {
              h3: d.h3_index,
              coordinates: [lng, lat],
              value: Number(d.value) || 0,
            };
          });
        cacheRef.current.set(path, processed);
        // Actualizar el arreglo persistente en orden estable
        const indexMap = dataIndexRef.current;
        const arr = dataArrayRef.current;
        const present = new Set();

        for (const row of processed) {
          const i = indexMap.get(row.h3);
          if (i !== undefined) {
            const obj = arr[i];
            obj.prevValue = obj.value;
            obj.value = row.value;
            obj.coordinates = row.coordinates;
            present.add(row.h3);
          } else {
            const obj = { h3: row.h3, coordinates: row.coordinates, value: row.value, prevValue: 0 };
            arr.push(obj);
            indexMap.set(row.h3, arr.length - 1);
            present.add(row.h3);
          }
        }

        for (let i = 0; i < arr.length; i++) {
          const obj = arr[i];
          if (!present.has(obj.h3)) {
            obj.prevValue = obj.value;
            obj.value = 0;
          }
        }

        setData(arr.slice());
      })
      .catch((err) => {
        console.warn(err.message);
        // Si falta un frame, mostramos vacío pero seguimos
        setData([]);
      });
  }, [frames, frameIdx]);

  // Reproducción
  useEffect(() => {
    if (!playing) return;
    if (timerRef.current) return; // ya hay un timer

    timerRef.current = setInterval(() => {
      setFrameIdx((idx) => {
        if (frames.length === 0) return 0;
        const next = idx + 1;
        return next >= frames.length ? 0 : next; // loop
      });
    }, ANIM_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, frames]);

  const handlePlay = () => setPlaying(true);
  const handlePause = () => setPlaying(false);
  const handleStop = () => {
    setPlaying(false);
    setFrameIdx(0);
  };

  const coverage = Math.max(0.05, Math.min(1, radius / RADIUS_METERS)); // 0..1

  const layers = [
    new TileLayer({
      id: 'osm-tiles',
      data: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      renderSubLayers: (subProps) => {
        const tile = subProps.tile;
        const img = subProps.data;
        const bbox = tile && tile.bbox;
        if (!img || !bbox) {
          return null; // aún no hay datos o bbox; evita inicializar BitmapLayer con valores undefined
        }
        const { west, south, east, north } = bbox;
        return new BitmapLayer(subProps, {
          data: null, // evitar que BitmapLayer intente iterar sobre la imagen como si fuera un array
          image: img,
          bounds: [west, south, east, north]
        });
      }
    }),
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
        getElevation: { duration: 800, enter: (d) => d.prevValue ?? 0 },
        getFillColor: { duration: 800, enter: (d) => colorFromValue(d.prevValue ?? 0) },
      },
      getFillColor: (d) => colorFromValue(d.value),
      getElevation: (d) => d.value,
    }),
  ];

  const curFrame = frames[frameIdx];
  const label = curFrame
    ? `${curFrame.year}-${pad2(curFrame.month)}-${pad2(curFrame.day)} ${pad2(curFrame.hour)}:00`
    : '—';

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* Panel de controles (arriba-izquierda) */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          background: 'rgba(255,255,255,0.9)',
          padding: '10px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '12px',
          minWidth: '260px',
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          <label><strong>Radio (m)</strong> — máx {Math.round(RADIUS_METERS)}</label>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.round(RADIUS_METERS))}
            step={Math.max(1, Math.round(RADIUS_METERS / 100))}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div>{Math.round(radius)} m</div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label><strong>Elevation scale</strong> — 0 a 20</label>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={elevationScale}
            onChange={(e) => setElevationScale(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div>{elevationScale}</div>
        </div>

        <div>
          <label><strong>Transparencia</strong> — 0 (opaco) a 1 (transparente)</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div>{opacity.toFixed(2)}</div>
        </div>
      </div>

      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        onClick={({ object, x, y }) => {
          if (object) {
            setPickedHex(object);
            setPointerPos({ x, y });
          } else {
            setPickedHex(null);
          }
        }}
      >
      </DeckGL>

      {/* Tooltip de hexágono */}
      {pickedHex && (
        <div
          style={{
            position: 'absolute',
            left: pointerPos.x,
            top: pointerPos.y,
            background: 'white',
            padding: '4px',
            fontSize: '12px',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        >
          <div><strong>Hex ID:</strong> {pickedHex.hexagon}</div>
          <div><strong>Valor:</strong> {Number(pickedHex.object?.value ?? 0).toFixed(2)}</div>
        </div>
      )}

      {/* Panel de animación (abajo-derecha) */}
      <div
        style={{
          position: 'absolute',
          right: 10,
          bottom: 10,
          zIndex: 11,
          background: 'rgba(255,255,255,0.95)',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '12px',
          minWidth: '300px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label><strong>Año*</strong></label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || '')}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label><strong>Mes</strong></label>
            <select value={month} onChange={(e) => { setMonth(e.target.value); setDay(''); }} style={{ width: '100%' }}>
              <option value="">—</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{pad2(i + 1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label><strong>Día</strong></label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              style={{ width: '100%' }}
              disabled={!month}
            >
              <option value="">—</option>
              {month &&
                [...Array(daysInMonth(year || thisYear, Number(month)))].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{pad2(i + 1)}</option>
                ))}
            </select>
          </div>
          <div>
            <label><strong>Hora</strong></label>
            <select value={hour} onChange={(e) => setHour(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%' }}>
              <option value="">—</option>
              {[...Array(24)].map((_, i) => (
                <option key={i} value={i}>{pad2(i)}:00</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={handlePlay} disabled={frames.length === 0 || playing}>▶️ Play</button>
            <button onClick={handlePause} disabled={!playing}>⏸️ Pause</button>
            <button onClick={handleStop} disabled={frames.length === 0}>⏹️ Stop</button>
            <div style={{ marginLeft: 'auto', fontFamily: 'monospace' }}>
              <strong>{label}</strong>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            step={1}
            value={Math.min(frameIdx, Math.max(0, frames.length - 1))}
            onChange={(e) => setFrameIdx(Number(e.target.value))}
            style={{ width: '100%', marginTop: 6 }}
            disabled={frames.length < 2}
          />
          <div style={{ textAlign: 'right' }}>{frames.length} frames</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            <em>
              Lógica del filtro:
              <br />
              - Año + Mes + Día → recorre horas del día.
              <br />
              - Año + Hora → recorre todos los días del año a esa hora.
              <br />
              - Solo Año (o Año + Mes) → recorre días y horas.
            </em>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
