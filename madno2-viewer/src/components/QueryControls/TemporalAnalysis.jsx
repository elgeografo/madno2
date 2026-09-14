import React, { useState } from 'react';
import ParquetDataManager from '../../utils/ParquetDataManager';
import { HelpModal } from '../HelpModal';
import { ANALYSIS_HELP } from '../../i18n/helpContent';
import { useI18n } from '../../i18n/useI18n';

export function TemporalAnalysis({ parquetBaseUrl, selectedHexId, onClearHexId, onExecute, setIsLoading }) {
  const { t, tList, lang } = useI18n();
  const [analysisType, setAnalysisType] = useState('hourly');
  const [yearFrom, setYearFrom] = useState(2001);
  const [yearTo, setYearTo] = useState(2001);
  const [selectedMonth, setSelectedMonth] = useState(null); // null = whole year
  const [selectedWeekdays, setSelectedWeekdays] = useState([]); // Array of days [0-6]
  const [showHelp, setShowHelp] = useState(false);

  const weekdays = tList('calendar.weekdaysShort').map((label, value) => ({ value, label }));
  const months = tList('calendar.months');

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
            type: t('temporal.typeHourly'),
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
            type: t('temporal.typeSeasonal'),
            yearFrom,
            yearTo
          };
          onExecute(data, 'bar', metadata);
          break;
        case 'weekday':
          data = await manager.getWeekdayAverages(yearFrom, selectedMonth);
          metadata = {
            type: t('temporal.typeWeekday'),
            year: yearFrom,
            month: selectedMonth
          };
          onExecute(data, 'bar', metadata);
          break;
        case 'yearly':
          data = await manager.getYearlyTrend(yearFrom, yearTo);
          metadata = {
            type: t('temporal.typeYearly'),
            yearFrom,
            yearTo
          };
          onExecute(data, 'line', metadata);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Temporal analysis failed:', error);
      alert(t('common.errorCalculating') + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentHelp = ANALYSIS_HELP[lang]?.[analysisType] || ANALYSIS_HELP.en[analysisType];

  return (
    <div style={{ padding: '12px', fontSize: '13px' }}>
      {/* Analysis type with help button */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontWeight: '600' }}>
            {t('common.analysisType')}
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
            title={t('help.viewHelp')}
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
          <option value="hourly">{t('temporal.hourly')}</option>
          <option value="seasonal">{t('temporal.seasonal')}</option>
          <option value="weekday">{t('temporal.weekday')}</option>
          <option value="yearly">{t('temporal.yearly')}</option>
        </select>
      </div>

      {/* Year from / Year */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          {analysisType === 'hourly' || analysisType === 'weekday' ? t('common.year') : t('common.yearFrom')}
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

      {/* Year to (seasonal and yearly only) */}
      {(analysisType === 'seasonal' || analysisType === 'yearly') && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            {t('common.yearTo')}
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

      {/* Month (hourly and weekday only) */}
      {(analysisType === 'hourly' || analysisType === 'weekday') && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            {t('common.month')} {analysisType === 'hourly' && t('common.optional')}
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
            {analysisType === 'hourly' && <option value="">{t('common.wholeYear')}</option>}
            {months.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Weekday selector (hourly only) */}
      {analysisType === 'hourly' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            {t('temporal.weekdaysOptional')}
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
            {selectedWeekdays.length === 0 ? t('common.allDays') : t('common.daysSelected', { count: selectedWeekdays.length })}
          </div>
        </div>
      )}

      {/* Selected hexagon ID */}
      {selectedHexId && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            {t('common.hexagonId')}
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
              title={t('common.clearHexSelection')}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
            {t('common.analysisAppliedToHex')}
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
        {t('common.calculate')}
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
