import React, { useState } from 'react';
import ParquetDataManager from '../../utils/ParquetDataManager';
import { HelpModal } from '../HelpModal';
import { ANALYSIS_HELP } from '../../utils/analysisHelpContent';

export function ExtremeEvents({ parquetBaseUrl, selectedHexId, onClearHexId, onExecute, setIsLoading }) {
  const [analysisType, setAnalysisType] = useState('peak_days');
  const [year, setYear] = useState(2001);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(null); // null = entire month
  const [hour, setHour] = useState(null); // null = all hours
  const [topN, setTopN] = useState(10);
  const [threshold, setThreshold] = useState(80); // µg/m³
  const [consecutiveDays, setConsecutiveDays] = useState(3);
  const [consecutiveHours, setConsecutiveHours] = useState(8);
  const [percentile, setPercentile] = useState(95);
  const [showHelp, setShowHelp] = useState(false);

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const manager = ParquetDataManager.getInstance(parquetBaseUrl);
      let data = null;
      let metadata = null;
      let sqlQuery = null;

      switch (analysisType) {
        case 'peak_days':
          // Top N days with highest pollution
          const peakResult = await manager.getExtremePeakDays(
            year, month, day, hour, topN, selectedHexId
          );
          data = peakResult.data;
          sqlQuery = peakResult.sqlQuery;

          metadata = {
            type: `Top ${topN} most polluted days`,
            year,
            month,
            day: day || 'Entire month',
            hour: hour !== null ? `${hour}:00` : 'All hours',
            scope: selectedHexId ? `Hexagon ${selectedHexId}` : 'Entire surface',
            topN,
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        case 'consecutive_days':
          // Episodes of consecutive days exceeding threshold
          const consecutiveResult = await manager.getExtremeConsecutiveDays(
            year, month, threshold, consecutiveDays, selectedHexId
          );
          data = consecutiveResult.data;
          sqlQuery = consecutiveResult.sqlQuery;

          metadata = {
            type: `Episodes of ${consecutiveDays}+ consecutive days > ${threshold} µg/m³`,
            year,
            month,
            threshold,
            consecutiveDays,
            scope: selectedHexId ? `Hexagon ${selectedHexId}` : 'Entire surface',
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        case 'percentile':
          // Days that exceed a specific percentile
          const percentileResult = await manager.getExtremePercentile(
            year, month, day, hour, percentile, selectedHexId
          );
          data = percentileResult.data;
          sqlQuery = percentileResult.sqlQuery;

          metadata = {
            type: `Days exceeding percentile ${percentile}`,
            year,
            month,
            day: day || 'Entire month',
            hour: hour !== null ? `${hour}:00` : 'All hours',
            percentile,
            scope: selectedHexId ? `Hexagon ${selectedHexId}` : 'Entire surface',
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        case 'duration':
          // Days where threshold was exceeded for N consecutive hours
          const durationResult = await manager.getExtremeDuration(
            year, month, threshold, consecutiveHours, selectedHexId
          );
          data = durationResult.data;
          sqlQuery = durationResult.sqlQuery;

          metadata = {
            type: `Days with ${consecutiveHours}+ consecutive hours > ${threshold} µg/m³`,
            year,
            month,
            threshold,
            consecutiveHours,
            scope: selectedHexId ? `Hexagon ${selectedHexId}` : 'Entire surface',
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error in extreme events analysis:', error);
      alert('Error calculating analysis: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentHelp = ANALYSIS_HELP[analysisType];

  return (
    <div style={{ padding: '12px', fontSize: '13px' }}>
      {/* Analysis type with help button */}
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
          <option value="peak_days">Days with highest pollution</option>
          <option value="consecutive_days">Consecutive episodes</option>
          <option value="percentile">Percentile analysis</option>
          <option value="duration">Event duration</option>
        </select>
      </div>

      {/* Selected hexagon (if exists) */}
      {selectedHexId && (
        <div style={{
          marginBottom: '12px',
          padding: '8px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <strong>Hexagon:</strong> {selectedHexId.substring(0, 10)}...
            </span>
            <button
              onClick={onClearHexId}
              style={{
                background: 'rgba(239, 68, 68, 0.8)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Clear
            </button>
          </div>
          <div style={{ marginTop: '4px', opacity: 0.7, fontSize: '11px' }}>
            Analysis limited to this hexagon
          </div>
        </div>
      )}

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

      {/* Day (optional) - only for peak_days and percentile */}
      {(analysisType === 'peak_days' || analysisType === 'percentile') && (
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
      )}

      {/* Hour (optional) - only for peak_days and percentile */}
      {(analysisType === 'peak_days' || analysisType === 'percentile') && (
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
      )}

      {/* Top N (only for peak_days) */}
      {analysisType === 'peak_days' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Number of days (Top N)
          </label>
          <input
            type="number"
            min={5}
            max={31}
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

      {/* Threshold (for consecutive_days and duration) */}
      {(analysisType === 'consecutive_days' || analysisType === 'duration') && (
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

      {/* Consecutive days (only for consecutive_days) */}
      {analysisType === 'consecutive_days' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Minimum consecutive days
          </label>
          <input
            type="number"
            min={2}
            max={10}
            value={consecutiveDays}
            onChange={(e) => setConsecutiveDays(Number(e.target.value))}
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

      {/* Consecutive hours (only for duration) */}
      {analysisType === 'duration' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Minimum consecutive hours
          </label>
          <input
            type="number"
            min={2}
            max={24}
            value={consecutiveHours}
            onChange={(e) => setConsecutiveHours(Number(e.target.value))}
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

      {/* Percentile (only for percentile) */}
      {analysisType === 'percentile' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Percentile
          </label>
          <select
            value={percentile}
            onChange={(e) => setPercentile(Number(e.target.value))}
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
            <option value={90}>P90 (90th percentile)</option>
            <option value={95}>P95 (95th percentile)</option>
            <option value={99}>P99 (99th percentile)</option>
          </select>
          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
            Identifies values in the upper tail of the distribution
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
