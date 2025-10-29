import React from 'react';

/**
 * Selector de leyenda para visualización (provincias o años de población)
 */
export function LegendSelector({ selectedMode, setSelectedMode, modes }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        right: 10,
        zIndex: 11,
        background: 'rgba(255,255,255,0.95)',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        minWidth: '140px',
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#1f2937' }}>
        Visualización
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setSelectedMode(mode.id)}
            style={{
              padding: '8px 16px',
              border: selectedMode === mode.id ? '2px solid #667eea' : '1px solid #d1d5db',
              background: selectedMode === mode.id ? '#667eea' : 'white',
              color: selectedMode === mode.id ? 'white' : '#374151',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: selectedMode === mode.id ? '600' : '400',
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
            onMouseOver={(e) => {
              if (selectedMode !== mode.id) {
                e.target.style.background = '#f3f4f6';
              }
            }}
            onMouseOut={(e) => {
              if (selectedMode !== mode.id) {
                e.target.style.background = 'white';
              }
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
