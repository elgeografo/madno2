import React from 'react';

/**
 * Selector de año para visualización de población
 */
export function YearSelector({ selectedYear, setSelectedYear, availableYears }) {
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
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#1f2937' }}>
        Año de población
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            style={{
              padding: '8px 16px',
              border: selectedYear === year ? '2px solid #667eea' : '1px solid #d1d5db',
              background: selectedYear === year ? '#667eea' : 'white',
              color: selectedYear === year ? 'white' : '#374151',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: selectedYear === year ? '600' : '400',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              if (selectedYear !== year) {
                e.target.style.background = '#f3f4f6';
              }
            }}
            onMouseOut={(e) => {
              if (selectedYear !== year) {
                e.target.style.background = 'white';
              }
            }}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}
