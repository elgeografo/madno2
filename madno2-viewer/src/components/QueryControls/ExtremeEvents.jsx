import React, { useState } from 'react';
import ParquetDataManager from '../../utils/ParquetDataManager';
import { HelpModal } from '../HelpModal';
import { ANALYSIS_HELP } from '../../i18n/helpContent';
import { useI18n } from '../../i18n/useI18n';

export function ExtremeEvents({ parquetBaseUrl, selectedHexId, onClearHexId, onExecute, setIsLoading }) {
  const { t, tList, lang } = useI18n();
  const months = tList('calendar.months');
  const [analysisType, setAnalysisType] = useState('peak_days');
  const [year, setYear] = useState(2001);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(null); // null = whole month
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
          // Top N most polluted days
          const peakResult = await manager.getExtremePeakDays(
            year, month, day, hour, topN, selectedHexId
          );
          data = peakResult.data;
          sqlQuery = peakResult.sqlQuery;

          metadata = {
            type: t('extreme.typePeakDays', { topN }),
            year,
            month,
            day: day || t('common.wholeMonth'),
            hour: hour !== null ? `${hour}:00` : t('common.allHours'),
            scope: selectedHexId ? t('common.hexagonScope', { id: selectedHexId }) : t('common.wholeSurface'),
            topN,
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        case 'consecutive_days':
          // Episodes of consecutive days above the threshold
          const consecutiveResult = await manager.getExtremeConsecutiveDays(
            year, month, threshold, consecutiveDays, selectedHexId
          );
          data = consecutiveResult.data;
          sqlQuery = consecutiveResult.sqlQuery;

          metadata = {
            type: t('extreme.typeConsecutiveDays', { days: consecutiveDays, threshold }),
            year,
            month,
            threshold,
            consecutiveDays,
            scope: selectedHexId ? t('common.hexagonScope', { id: selectedHexId }) : t('common.wholeSurface'),
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        case 'percentile':
          // Days above a given percentile
          const percentileResult = await manager.getExtremePercentile(
            year, month, day, hour, percentile, selectedHexId
          );
          data = percentileResult.data;
          sqlQuery = percentileResult.sqlQuery;

          metadata = {
            type: t('extreme.typePercentile', { percentile }),
            year,
            month,
            day: day || t('common.wholeMonth'),
            hour: hour !== null ? `${hour}:00` : t('common.allHours'),
            percentile,
            scope: selectedHexId ? t('common.hexagonScope', { id: selectedHexId }) : t('common.wholeSurface'),
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        case 'duration':
          // Days where the threshold was exceeded for N consecutive hours
          const durationResult = await manager.getExtremeDuration(
            year, month, threshold, consecutiveHours, selectedHexId
          );
          data = durationResult.data;
          sqlQuery = durationResult.sqlQuery;

          metadata = {
            type: t('extreme.typeDuration', { hours: consecutiveHours, threshold }),
            year,
            month,
            threshold,
            consecutiveHours,
            scope: selectedHexId ? t('common.hexagonScope', { id: selectedHexId }) : t('common.wholeSurface'),
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Extreme events analysis failed:', error);
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
          <option value="peak_days">{t('extreme.peakDays')}</option>
          <option value="consecutive_days">{t('extreme.consecutiveDays')}</option>
          <option value="percentile">{t('extreme.percentile')}</option>
          <option value="duration">{t('extreme.duration')}</option>
        </select>
      </div>

      {/* Hexágono seleccionado (si existe) */}
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
              <strong>{t('common.hexagon')}</strong> {selectedHexId.substring(0, 10)}...
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
              {t('common.clear')}
            </button>
          </div>
          <div style={{ marginTop: '4px', opacity: 0.7, fontSize: '11px' }}>
            {t('common.analysisLimitedToHex')}
          </div>
        </div>
      )}

      {/* Year */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          {t('common.year')}
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
          {t('common.month')}
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
              {months[i]}
            </option>
          ))}
        </select>
      </div>

      {/* Día (opcional) - solo para peak_days y percentile */}
      {(analysisType === 'peak_days' || analysisType === 'percentile') && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Día (opcional)
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
            <option value="">{t('common.wholeMonth')}</option>
            {[...Array(31)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hora (opcional) - solo para peak_days y percentile */}
      {(analysisType === 'peak_days' || analysisType === 'percentile') && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Hora (opcional)
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
            <option value="">{t('common.allHours')}</option>
            {[...Array(24)].map((_, i) => (
              <option key={i} value={i}>
                {String(i).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Top N (solo para peak_days) */}
      {analysisType === 'peak_days' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            {t('extreme.topNDays')}
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

      {/* Umbral (para consecutive_days y duration) */}
      {(analysisType === 'consecutive_days' || analysisType === 'duration') && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            {t('common.threshold')}
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
            {t('common.thresholdReference')}
          </div>
        </div>
      )}

      {/* Días consecutivos (solo para consecutive_days) */}
      {analysisType === 'consecutive_days' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            {t('extreme.minConsecutiveDays')}
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

      {/* Horas consecutivas (solo para duration) */}
      {analysisType === 'duration' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            {t('extreme.minConsecutiveHours')}
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

      {/* Percentil (solo para percentile) */}
      {analysisType === 'percentile' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            {t('extreme.percentileLabel')}
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
            <option value={90}>{t('extreme.p90')}</option>
            <option value={95}>{t('extreme.p95')}</option>
            <option value={99}>{t('extreme.p99')}</option>
          </select>
          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
            {t('extreme.percentileHint')}
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
