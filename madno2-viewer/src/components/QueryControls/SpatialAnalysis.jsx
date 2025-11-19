import React, { useState } from 'react';
import ParquetDataManager from '../../utils/ParquetDataManager';
import { HelpModal } from '../HelpModal';
import { ANALYSIS_HELP } from '../../utils/analysisHelpContent';

export function SpatialAnalysis({ parquetBaseUrl, onExecute, setIsLoading, onHighlightHexagons, onSpatialAnalysisExecute }) {
  const [analysisType, setAnalysisType] = useState('hotspots');
  const [year, setYear] = useState(2001);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(null); // null = entire month
  const [hour, setHour] = useState(null); // null = all hours
  const [topN, setTopN] = useState(10);
  const [threshold, setThreshold] = useState(80); // µg/m³
  const [showHelp, setShowHelp] = useState(false);

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const manager = ParquetDataManager.getInstance(parquetBaseUrl);
      let data = null;
      let metadata = null;
      let sqlQuery = null;

      // Notify the map to load data from the analysis period
      if (onSpatialAnalysisExecute) {
        onSpatialAnalysisExecute({
          year,
          month,
          day,
          hour
        });
      }

      switch (analysisType) {
        case 'hotspots':
          // Find the N hexagons with highest average concentration
          const result = await manager.getSpatialHotspots(year, month, day, hour, topN);
          data = result.data;
          sqlQuery = result.sqlQuery;

          console.log('📊 Hotspots data:', data);
          console.log('📊 Number of hexagons:', data.length);

          metadata = {
            type: 'Hotspots - Most polluted zones',
            year,
            month,
            day: day || 'Entire month',
            hour: hour !== null ? `${hour}:00` : 'All hours',
            topN,
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          // Highlight hexagons on the map
          if (onHighlightHexagons && data.length > 0) {
            const hexIds = data.map(row => row.h3_index);
            onHighlightHexagons(hexIds);
          }

          onExecute(data, 'bar', metadata);
          break;

        case 'threshold':
          // Find hexagons that exceed a threshold
          const thresholdResult = await manager.getSpatialThreshold(year, month, day, hour, threshold);
          data = thresholdResult.data;
          sqlQuery = thresholdResult.sqlQuery;

          metadata = {
            type: `Hexagons > ${threshold} µg/m³`,
            year,
            month,
            day: day || 'Entire month',
            hour: hour !== null ? `${hour}:00` : 'All hours',
            threshold,
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          // Highlight hexagons that exceed the threshold
          if (onHighlightHexagons && data.length > 0) {
            const hexIds = data.map(row => row.h3_index);
            onHighlightHexagons(hexIds);
          }

          onExecute(data, 'bar', metadata);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error in spatial analysis:', error);
      alert('Error calculating analysis: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentHelp = ANALYSIS_HELP[analysisType];

  return (
    <div style={{ padding: '12px', fontSize: '13px' }}>
      {/* Spatial analysis type with help button */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontWeight: '600' }}>
            Analysis type
          </label>
          <button
            onClick={() => setShowHelp(true)}
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: 'rgba(99, 102, 241, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
            }}
            title="View help about this analysis"
          >
            ?
          </button>
        </div>
        <select
          value={analysisType}
          onChange={(e) => setAnalysisType(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '13px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.9)',
            color: '#374151',
          }}
        >
          <option value="hotspots">Hotspots (Top N zones)</option>
          <option value="threshold">Exceed threshold</option>
        </select>
      </div>

      {/* Year */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          Year
        </label>
        <input
          type="number"
          min={2001}
          max={2025}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '13px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.9)',
            color: '#374151',
          }}
        />
      </div>

      {/* Month */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          Month
        </label>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '13px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.9)',
            color: '#374151',
          }}
        >
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      {/* Day (optional) */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          Day (optional)
        </label>
        <select
          value={day || ''}
          onChange={(e) => setDay(e.target.value === '' ? null : Number(e.target.value))}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '13px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.9)',
            color: '#374151',
          }}
        >
          <option value="">Entire month</option>
          {[...Array(31)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Hour (optional) */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          Hour (optional)
        </label>
        <select
          value={hour !== null ? hour : ''}
          onChange={(e) => setHour(e.target.value === '' ? null : Number(e.target.value))}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '13px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.9)',
            color: '#374151',
          }}
        >
          <option value="">All hours</option>
          {[...Array(24)].map((_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, '0')}:00
            </option>
          ))}
        </select>
      </div>

      {/* Top N (only for hotspots) */}
      {analysisType === 'hotspots' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Number of zones (Top N)
          </label>
          <input
            type="number"
            min={5}
            max={50}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '13px',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.9)',
              color: '#374151',
            }}
          />
        </div>
      )}

      {/* Threshold (only for threshold) */}
      {analysisType === 'threshold' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Threshold (µg/m³)
          </label>
          <input
            type="number"
            min={0}
            max={500}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '13px',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.9)',
              color: '#374151',
            }}
          />
          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
            Reference: 40 µg/m³ (EU annual limit), 200 µg/m³ (hourly alert)
          </div>
        </div>
      )}

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: '600',
          border: 'none',
          borderRadius: '4px',
          background: 'rgba(99, 102, 241, 0.9)',
          color: 'white',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(79, 70, 229, 0.9)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.9)';
        }}
      >
        Calculate
      </button>

      {/* Help modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title={currentHelp?.title}
        description={currentHelp?.description}
        sqlQuery={currentHelp?.sqlQuery}
        example={currentHelp?.example}
      />
    </div>
  );
}
