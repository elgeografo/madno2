import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { renderLineChartWithTooltip, renderBarChartWithTooltip } from '../utils/d3Renderers';
import { ExpandedChartModal } from './ExpandedChartModal';

// Componente para visualización de gráficos D3 con tooltips y zoom
export function D3Chart({ data, chartType, metadata, isLoading, onClear }) {
  const svgRef = useRef(null);
  const [showExpanded, setShowExpanded] = useState(false);

  useEffect(() => {
    if (!data || !chartType || !svgRef.current) return;

    console.log('🎨 D3Chart recibiendo datos:', {
      type: chartType,
      dataLength: Array.isArray(data) ? data.length : 'no es array',
      firstItem: Array.isArray(data) ? data[0] : data,
      allData: data
    });

    // Limpiar SVG anterior
    d3.select(svgRef.current).selectAll('*').remove();

    // Renderizar según el tipo de gráfico
    if (chartType === 'line') {
      renderLineChartWithTooltip(svgRef.current, data, 400, 250);
    } else if (chartType === 'bar') {
      renderBarChartWithTooltip(svgRef.current, data, 400, 250);
    } else if (chartType === 'summary') {
      // Para summary, no renderizamos gráfico SVG, se mostrará como tabla HTML
      // El SVG se oculta y la tabla se muestra en su lugar
    }
  }, [data, chartType]);

  const hasData = data && ((Array.isArray(data) && data.length > 0) || (Array.isArray(data) && data[0]?.data));

  return (
    <>
      <div
        style={{
          height: '350px',
          borderTop: '2px solid rgba(255,255,255,0.2)',
          background: 'rgba(50, 50, 50, 0.9)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header con título y botones */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'white' }}>
            {isLoading ? 'Cargando...' : hasData ? 'Visualización' : 'Sin datos'}
          </h3>
          {hasData && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowExpanded(true)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  borderRadius: '4px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: 'rgba(99, 102, 241, 1)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                }}
                title="Ampliar gráfico"
              >
                🔍 Ampliar
              </button>
              <button
                onClick={onClear}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Zona del gráfico */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
              Procesando datos...
            </div>
          ) : hasData ? (
            chartType === 'summary' ? (
              // Mostrar tabla para resumen estadístico
              <div style={{ width: '100%', maxWidth: '500px' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                  color: 'white'
                }}>
                  <tbody>
                    {data.map((row, index) => (
                      <tr key={index} style={{
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <td style={{
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontWeight: '500',
                          color: 'rgba(255,255,255,0.9)'
                        }}>
                          {row.label}
                        </td>
                        <td style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: 'white'
                        }}>
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // Mostrar SVG para gráficos
              <svg
                ref={svgRef}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '250px',
                }}
              />
            )
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textAlign: 'center' }}>
              Selecciona un análisis y presiona "Calcular"<br />para visualizar los resultados
            </div>
          )}
        </div>
      </div>

      {/* Modal de gráfico ampliado */}
      <ExpandedChartModal
        isOpen={showExpanded}
        onClose={() => setShowExpanded(false)}
        data={data}
        chartType={chartType}
        metadata={metadata}
      />
    </>
  );
}
