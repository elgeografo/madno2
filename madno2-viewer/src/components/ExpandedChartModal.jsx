import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import * as d3 from 'd3';
import { renderLineChartWithTooltip, renderBarChartWithTooltip } from '../utils/d3Renderers';
import ParquetDataManager from '../utils/ParquetDataManager';

export function ExpandedChartModal({ isOpen, onClose, data, chartType, metadata }) {
  const svgRef = useRef(null);
  const [legendItems, setLegendItems] = useState([]);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart', 'query', 'table'
  const [editableQuery, setEditableQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryError, setQueryError] = useState(null);

  useEffect(() => {
    if (!isOpen || !data || !chartType || !svgRef.current) return;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll('*').remove();

    // Render with larger dimensions and without internal legend
    const width = 900;
    const height = 600;

    let seriesInfo = [];
    if (chartType === 'line') {
      seriesInfo = renderLineChartWithTooltip(svgRef.current, data, width, height, false);
    } else if (chartType === 'bar') {
      seriesInfo = renderBarChartWithTooltip(svgRef.current, data, width, height);
    }

    setLegendItems(seriesInfo || []);
  }, [isOpen, data, chartType]);

  // Initialize editable query when metadata changes
  useEffect(() => {
    if (metadata?.sqlQuery) {
      setEditableQuery(metadata.sqlQuery);
    }
  }, [metadata?.sqlQuery]);

  const handleExecuteQuery = async () => {
    setIsExecuting(true);
    setQueryError(null);

    try {
      const manager = ParquetDataManager.getInstance(metadata.parquetBaseUrl);
      const result = await manager.executeCustomQuery(editableQuery);
      setQueryResult(result);
      setActiveTab('table'); // Switch to table tab automatically
    } catch (error) {
      setQueryError(error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!queryResult || queryResult.length === 0) return;

    // Build CSV
    const headers = Object.keys(queryResult[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of queryResult) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape values containing commas, quotes, or line breaks
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    }

    // Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  // Build detailed title from metadata
  const getMonthName = (month) => {
    if (!month) return 'All';
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const getDayNames = (weekdays) => {
    if (!weekdays || weekdays.length === 0) return 'All';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays.map(d => days[d]).join(', ');
  };

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Chart modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(50, 50, 50, 0.98)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header with detailed title and legend */}
        <div
          style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          {/* Detailed title (left) */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: 'white', lineHeight: '1.4' }}>
              {metadata?.type || 'Analysis'}
            </div>
            {metadata?.year && (
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>
                Year: {metadata.year}
              </div>
            )}
            {metadata?.yearFrom && metadata?.yearTo && (
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>
                Years: {metadata.yearFrom} - {metadata.yearTo}
              </div>
            )}
            {metadata?.month !== undefined && (
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
                Month: {getMonthName(metadata.month)}
              </div>
            )}
            {metadata?.weekdays !== undefined && (
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
                Days: {getDayNames(metadata.weekdays)}
              </div>
            )}
            <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
              Hexagon: {metadata?.hexId ? (
                <span style={{ fontFamily: 'monospace', fontSize: '13px', background: 'rgba(255, 255, 0, 0.2)', padding: '2px 6px', borderRadius: '3px' }}>
                  {metadata.hexId}
                </span>
              ) : 'All'}
            </div>
          </div>

          {/* Legend (right) */}
          {legendItems.length > 0 && activeTab === 'chart' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {legendItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: item.color,
                      borderRadius: '3px',
                    }}
                  />
                  <span style={{ fontSize: '16px', color: 'white', fontWeight: '500' }}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '32px',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              padding: '0 8px',
              lineHeight: '1',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '16px', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('chart')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                background: activeTab === 'chart' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                color: activeTab === 'chart' ? 'white' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                borderBottom: activeTab === 'chart' ? '2px solid rgba(99, 102, 241, 1)' : 'none',
                marginBottom: '-2px',
              }}
            >
              📊 Chart
            </button>
            <button
              onClick={() => setActiveTab('query')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                background: activeTab === 'query' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                color: activeTab === 'query' ? 'white' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                borderBottom: activeTab === 'query' ? '2px solid rgba(99, 102, 241, 1)' : 'none',
                marginBottom: '-2px',
              }}
            >
              🔍 SQL Query
            </button>
            <button
              onClick={() => setActiveTab('table')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                background: activeTab === 'table' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                color: activeTab === 'table' ? 'white' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                borderBottom: activeTab === 'table' ? '2px solid rgba(99, 102, 241, 1)' : 'none',
                marginBottom: '-2px',
              }}
            >
              📋 Table {queryResult && `(${queryResult.length} rows)`}
            </button>
          </div>
        </div>

        {/* Chart tab content */}
        {activeTab === 'chart' && (
          <svg
            ref={svgRef}
            style={{
              width: '900px',
              height: '600px',
              display: 'block',
            }}
          />
        )}

        {/* Query tab content */}
        {activeTab === 'query' && (
          <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={editableQuery}
              onChange={(e) => setEditableQuery(e.target.value)}
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: '13px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#a3e635',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                resize: 'none',
                marginBottom: '12px',
              }}
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={handleExecuteQuery}
                disabled={isExecuting}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  background: isExecuting ? 'rgba(107, 114, 128, 0.5)' : 'rgba(99, 102, 241, 0.9)',
                  color: 'white',
                  cursor: isExecuting ? 'not-allowed' : 'pointer',
                }}
              >
                {isExecuting ? '⏳ Executing...' : '▶️ Run'}
              </button>
              {queryError && (
                <div style={{ color: 'rgba(239, 68, 68, 1)', fontSize: '13px' }}>
                  ❌ Error: {queryError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table tab content */}
        {activeTab === 'table' && (
          <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            {queryResult && (
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleDownloadCSV}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.9)',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.9)';
                  }}
                >
                  📥 Download CSV
                </button>
              </div>
            )}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {queryResult ? (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                  color: 'white',
                }}>
                <thead>
                  <tr style={{ background: 'rgba(99, 102, 241, 0.2)', position: 'sticky', top: 0 }}>
                    {Object.keys(queryResult[0] || {}).map((key) => (
                      <th key={key} style={{
                        padding: '10px',
                        textAlign: 'left',
                        fontWeight: '600',
                        borderBottom: '2px solid rgba(99, 102, 241, 0.5)',
                      }}>
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.map((row, i) => (
                    <tr key={i} style={{
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                    }}>
                      {Object.values(row).map((value, j) => (
                        <td key={j} style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                        }}>
                          {typeof value === 'number' ? value.toFixed(2) : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                </table>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '14px',
                }}>
                  Execute a query from the "SQL Query" tab to see results here
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render in document.body
  return ReactDOM.createPortal(modalContent, document.body);
}
