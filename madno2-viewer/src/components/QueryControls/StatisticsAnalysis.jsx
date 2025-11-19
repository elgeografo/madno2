import React, { useState } from 'react';
import ParquetDataManager from '../../utils/ParquetDataManager';
import { HelpModal } from '../HelpModal';
import { ANALYSIS_HELP } from '../../utils/analysisHelpContent';

export function StatisticsAnalysis({ parquetBaseUrl, selectedHexId, onClearHexId, onExecute, setIsLoading }) {
  const [analysisType, setAnalysisType] = useState('summary');
  const [year, setYear] = useState(2001);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(null); // null = entire month
  const [showHelp, setShowHelp] = useState(false);

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const manager = ParquetDataManager.getInstance(parquetBaseUrl);
      let data = null;
      let metadata = null;
      let sqlQuery = null;

      switch (analysisType) {
        case 'summary':
          // Complete statistical summary
          const summaryResult = await manager.getStatisticsSummary(
            year, month, day, selectedHexId
          );
          data = summaryResult.data;
          sqlQuery = summaryResult.sqlQuery;

          metadata = {
            type: 'Statistical Summary',
            year,
            month,
            day: day || 'Entire month',
            scope: selectedHexId ? `Hexagon ${selectedHexId}` : 'Entire surface',
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          // For statistical summary, we will display the data as a table
          onExecute(data, 'summary', metadata);
          break;

        case 'compliance':
          // Regulatory compliance
          const complianceResult = await manager.getStatisticsCompliance(
            year, month, day, selectedHexId
          );
          data = complianceResult.data;
          sqlQuery = complianceResult.sqlQuery;

          metadata = {
            type: 'Regulatory Compliance',
            year,
            month,
            day: day || 'Entire month',
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
      console.error('Error in statistical analysis:', error);
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
          <option value="summary">Statistical Summary</option>
          <option value="compliance">Regulatory Compliance</option>
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

      {/* Information about the analysis */}
      {analysisType === 'summary' && (
        <div style={{
          marginBottom: '12px',
          padding: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          fontSize: '11px',
          opacity: 0.8
        }}>
          Will display descriptive statistics: mean, median, standard deviation, percentiles, etc.
        </div>
      )}

      {analysisType === 'compliance' && (
        <div style={{
          marginBottom: '12px',
          padding: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          fontSize: '11px',
          opacity: 0.8
        }}>
          Will evaluate compliance with EU limits: 40 µg/m³ (annual limit) and 200 µg/m³ (alert)
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
