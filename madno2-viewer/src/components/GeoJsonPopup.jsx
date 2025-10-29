import React from 'react';

/**
 * Popup que se muestra al hacer click sobre una feature de GeoJSON
 */
export function GeoJsonPopup({ feature, onClose, populationData, municipalityCode, selectedYear, availableYears }) {
  if (!feature) return null;

  const { properties } = feature;
  const popData = populationData && municipalityCode ? populationData[municipalityCode] : null;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2000,
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        fontSize: '14px',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Botón de cerrar */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'transparent',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          color: '#666',
          padding: '4px 8px',
          lineHeight: '1',
        }}
        title="Cerrar"
      >
        ×
      </button>

      {/* Título */}
      <div style={{
        marginBottom: '16px',
        fontSize: '18px',
        fontWeight: 'bold',
        borderBottom: '2px solid #667eea',
        paddingBottom: '10px',
        paddingRight: '30px',
        color: '#1f2937',
      }}>
        {popData ? popData.name : 'Información de la Feature'}
      </div>

      {/* Datos de población si existen */}
      {popData && availableYears && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '15px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#1f2937',
          }}>
            Evolución de Población
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280' }}>Año</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#6b7280' }}>Población</th>
              </tr>
            </thead>
            <tbody>
              {availableYears.map((year) => {
                const isSelected = year === selectedYear;
                return (
                  <tr
                    key={year}
                    style={{
                      background: isSelected ? '#eff6ff' : 'transparent',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <td style={{
                      padding: '8px',
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#667eea' : '#374151',
                    }}>
                      {year} {isSelected && '→'}
                    </td>
                    <td style={{
                      padding: '8px',
                      textAlign: 'right',
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#667eea' : '#374151',
                    }}>
                      {popData[year]?.toLocaleString() || 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
