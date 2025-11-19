import React from 'react';
import { RADIUS_METERS } from '../config/constants';

export function ControlPanel({ radius, setRadius, elevationScale, setElevationScale, opacity, setOpacity }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 10,
        bottom: 10,
        zIndex: 10,
        background: 'rgba(128, 128, 128, 0.7)',
        backdropFilter: 'blur(4px)',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        fontSize: '13px',
        minWidth: '320px',
        width: '320px',
        color: 'white',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontWeight: '600', display: 'block', marginBottom: '4px' }}>
          Radio: {Math.round(radius)} m
        </label>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.round(RADIUS_METERS))}
          step={Math.max(1, Math.round(RADIUS_METERS / 100))}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontWeight: '600', display: 'block', marginBottom: '4px' }}>
          Escala de elevación: {elevationScale}
        </label>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={elevationScale}
          onChange={(e) => setElevationScale(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ fontWeight: '600', display: 'block', marginBottom: '4px' }}>
          Opacidad: {opacity.toFixed(2)}
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
