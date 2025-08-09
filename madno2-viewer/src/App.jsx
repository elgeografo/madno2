import React, { useState, useEffect } from 'react';
import { DeckGL } from '@deck.gl/react';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import Papa from 'papaparse';
import { cellToLatLng } from 'h3-js';
import { edgeLength, UNITS } from 'h3-js/legacy';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const INITIAL_VIEW_STATE = {
  longitude: -3.7038,
  latitude: 40.4168,
  zoom: 10,
  pitch: 30,
  bearing: 0,
};

function App() {
  const [data, setData] = useState([]);
  const [pickedHex, setPickedHex] = useState(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch('/data/points-2001-01-05_08_L08.csv')
      .then(response => response.text())
      .then(csvText => {
        const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true }).data;
        const processed = parsed.map(d => {
          const [lat, lng] = cellToLatLng(d.h3_index);
          return {
            coordinates: [lng, lat],
            no2: d.no2
          };
        });
        setData(processed);
      })
      .catch(console.error);
  }, []);
  const radiusMeters = edgeLength(8, UNITS.m); // ≈1220.63
  const layers = [
    new HexagonLayer({
      id: 'hexagon-layer',
      data,
      pickable: true,      // habilita detección de clics
      autoHighlight: true,  // resalta al pasar el cursor
      highlightColor: [0, 0, 255, 100],
      extruded: true,
      //radius: 1000,
      radius : radiusMeters,
      elevationScale: 4,
      getPosition: d => d.coordinates,
      getElevationWeight: d => d.no2,
      getColorWeight: d => d.no2
    })
  ];
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
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
        <Map
          mapStyle="mapbox://styles/mapbox/light-v10"
          mapboxAccessToken={MAPBOX_TOKEN}
        />
      </DeckGL>
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
            pointerEvents: 'none'
          }}
        >
          <div><strong>Hex ID:</strong> {pickedHex.hexagon}</div>
          <div><strong>Valor:</strong> {pickedHex.elevationValue.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
}

export default App;