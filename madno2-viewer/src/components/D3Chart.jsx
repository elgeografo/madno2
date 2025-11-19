import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { renderLineChartWithTooltip, renderBarChartWithTooltip } from '../utils/d3Renderers';
import { ExpandedChartModal } from './ExpandedChartModal';

// Component for D3 chart visualization with tooltips and zoom
export function D3Chart({ data, chartType, metadata, isLoading, onClear }) {
  const svgRef = useRef(null);
  const [showExpanded, setShowExpanded] = useState(false);

  useEffect(() => {
    if (!data || !chartType || !svgRef.current) return;

    console.log('🎨 D3Chart receiving data:', {
      type: chartType,
      dataLength: Array.isArray(data) ? data.length : 'not an array',
      firstItem: Array.isArray(data) ? data[0] : data,
      allData: data
    });

    // Clear previous SVG
    d3.select(svgRef.current).selectAll('*').remove();

    // Render based on chart type
    if (chartType === 'line') {
      renderLineChartWithTooltip(svgRef.current, data, 400, 250);
    } else if (chartType === 'bar') {
      renderBarChartWithTooltip(svgRef.current, data, 400, 250);
    } else if (chartType === 'summary') {
      // For summary, we don't render SVG chart, it will be shown as HTML table
      // SVG is hidden and the table is shown instead
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
        {/* Header with title and buttons */}
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
            {isLoading ? 'Loading...' : hasData ? 'Visualization' : 'No data'}
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
                title="Expand chart"
              >
                🔍 Expand
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
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Chart area */}
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
              Processing data...
            </div>
          ) : hasData ? (
            chartType === 'summary' ? (
              // Show table for statistical summary
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
              // Show SVG for charts
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
              Select an analysis and press "Calculate"<br />to visualize the results
            </div>
          )}
        </div>
      </div>

      {/* Expanded chart modal */}
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
