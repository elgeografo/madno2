import React, { useState } from 'react';
import ParquetDataManager from '../../utils/ParquetDataManager';
import { HelpModal } from '../HelpModal';
import { ANALYSIS_HELP } from '../../utils/analysisHelpContent';

export function TemporalAnalysis({ parquetBaseUrl, selectedHexId, onClearHexId, onExecute, setIsLoading }) {
  const [analysisType, setAnalysisType] = useState('hourly');
  const [yearFrom, setYearFrom] = useState(2001);
  const [yearTo, setYearTo] = useState(2001);
  const [selectedMonth, setSelectedMonth] = useState(null); // null = entire year
  const [selectedWeekdays, setSelectedWeekdays] = useState([]); // Array of days [0-6]
  const [showHelp, setShowHelp] = useState(false);

  const weekdays = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ];

  const toggleWeekday = (day) => {
    if (selectedWeekdays.includes(day)) {
      setSelectedWeekdays(selectedWeekdays.filter(d => d !== day));
    } else {
      setSelectedWeekdays([...selectedWeekdays, day]);
    }
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const manager = ParquetDataManager.getInstance(parquetBaseUrl);
      let data = null;
      let metadata = null;

      switch (analysisType) {
        case 'hourly':
          data = await manager.getHourlyAverages(yearFrom, selectedMonth, selectedWeekdays, selectedHexId);
          const sqlQuery = manager.buildHourlyQuery(yearFrom, selectedMonth, selectedWeekdays, selectedHexId);
          metadata = {
            type: 'Peak Hours (average per hour of day)',
            year: yearFrom,
            month: selectedMonth,
            weekdays: selectedWeekdays,
            hexId: selectedHexId,
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };
          onExecute(data, 'line', metadata);
          break;
        case 'seasonal':
          data = await manager.getSeasonalAverages(yearFrom, yearTo);
          metadata = {
            type: 'Seasonal Analysis',
            yearFrom,
            yearTo
          };
          onExecute(data, 'bar', metadata);
          break;
        case 'weekday':
          data = await manager.getWeekdayAverages(yearFrom, selectedMonth);
          metadata = {
            type: 'Days of the Week',
            year: yearFrom,
            month: selectedMonth
          };
          onExecute(data, 'bar', metadata);
          break;
        case 'yearly':
          data = await manager.getYearlyTrend(yearFrom, yearTo);
          metadata = {
            type: 'Yearly Evolution',
            yearFrom,
            yearTo
          };
          onExecute(data, 'line', metadata);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error in temporal analysis:', error);
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
          <option value="hourly">Peak hours (average per hour of day)</option>
          <option value="seasonal">Seasonal (by season of year)</option>
          <option value="weekday">Days of the week</option>
          <option value="yearly">Yearly evolution</option>
        </select>
      </div>

      {/* Year from / Year */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          {analysisType === 'hourly' || analysisType === 'weekday' ? 'Year' : 'Year from'}
        </label>
        <input
          type="number"
          min={2001}
          max={2025}
          value={yearFrom}
          onChange={(e) => setYearFrom(Number(e.target.value))}
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

      {/* Year to (only for seasonal and yearly) */}
      {(analysisType === 'seasonal' || analysisType === 'yearly') && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Year to
          </label>
          <input
            type="number"
            min={yearFrom}
            max={2025}
            value={yearTo}
            onChange={(e) => setYearTo(Number(e.target.value))}
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

      {/* Month (only for hourly and weekday) */}
      {(analysisType === 'hourly' || analysisType === 'weekday') && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Month {analysisType === 'hourly' && '(optional)'}
          </label>
          <select
            value={selectedMonth || ''}
            onChange={(e) => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))}
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
            {analysisType === 'hourly' && <option value="">Entire year</option>}
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Weekday selector (only for hourly) */}
      {analysisType === 'hourly' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Days of the week (optional)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {weekdays.map(day => (
              <button
                key={day.value}
                onClick={() => toggleWeekday(day.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: `2px solid ${selectedWeekdays.includes(day.value) ? 'rgba(99, 102, 241, 1)' : 'rgba(255,255,255,0.3)'}`,
                  borderRadius: '4px',
                  background: selectedWeekdays.includes(day.value) ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.9)',
                  color: selectedWeekdays.includes(day.value) ? 'rgba(99, 102, 241, 1)' : '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {day.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.7 }}>
            {selectedWeekdays.length === 0 ? 'All days' : `${selectedWeekdays.length} day(s) selected`}
          </div>
        </div>
      )}

      {/* Selected hexagon ID field */}
      {selectedHexId && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Hexagon ID
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={selectedHexId}
              readOnly
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '12px',
                border: '2px solid rgba(99, 102, 241, 0.5)',
                borderRadius: '4px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#374151',
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={onClearHexId}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.2)',
                color: 'rgba(239, 68, 68, 1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
              title="Clear hexagon selection"
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
            Analysis applied only to this hexagon
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
