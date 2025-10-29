import React from 'react';

/**
 * Panel de información de población que se muestra en la esquina inferior derecha
 */
export function PopulationInfoPanel({ municipalityName, populationData, availableYears, selectedYear }) {
  if (!municipalityName || !populationData) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 10,
        zIndex: 11,
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '12px',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: '250px',
        maxWidth: '350px',
        fontSize: '13px',
      }}
    >
      {/* Título con nombre del municipio */}
      <div style={{
        fontWeight: 'bold',
        marginBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
        paddingBottom: '6px',
      }}>
        {municipalityName}
      </div>

      {/* Tabla de evolución de población */}
      <div style={{
        fontSize: '13px',
        fontWeight: '600',
        marginBottom: '8px',
      }}>
        Evolución de Población
      </div>

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
      }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
            <th style={{ padding: '6px', textAlign: 'left', color: '#88ccff', fontWeight: '600' }}>Año</th>
            <th style={{ padding: '6px', textAlign: 'right', color: '#88ccff', fontWeight: '600' }}>Población</th>
          </tr>
        </thead>
        <tbody>
          {availableYears && availableYears.map((year) => {
            const isSelected = year === selectedYear;
            return (
              <tr
                key={year}
                style={{
                  background: isSelected ? 'rgba(136, 204, 255, 0.2)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <td style={{
                  padding: '6px',
                  fontWeight: isSelected ? '600' : '400',
                  color: isSelected ? '#88ccff' : 'white',
                }}>
                  {year} {isSelected && '→'}
                </td>
                <td style={{
                  padding: '6px',
                  textAlign: 'right',
                  fontWeight: isSelected ? '600' : '400',
                  color: isSelected ? '#88ccff' : 'white',
                }}>
                  {populationData[year]?.toLocaleString() || 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
