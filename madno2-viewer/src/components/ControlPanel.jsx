import React from 'react';
import { RADIUS_METERS } from '../config/constants';

export function ControlPanel({ radius, setRadius, elevationScale, setElevationScale, opacity, setOpacity }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
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
  );
}
