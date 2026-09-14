import React, { useState } from 'react';
import ParquetDataManager from '../../utils/ParquetDataManager';
import { HelpModal } from '../HelpModal';
import { ANALYSIS_HELP } from '../../i18n/helpContent';
import { useI18n } from '../../i18n/useI18n';

export function SpatialAnalysis({ parquetBaseUrl, onExecute, setIsLoading, onHighlightHexagons, onSpatialAnalysisExecute }) {
  const { t, tList, lang } = useI18n();
  const months = tList('calendar.months');
  const [analysisType, setAnalysisType] = useState('hotspots');
  const [year, setYear] = useState(2001);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(null); // null = whole month
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

      // Tell the map to load data for the analysis period
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
          // Find the N hexagons with the highest average concentration
          const result = await manager.getSpatialHotspots(year, month, day, hour, topN);
          data = result.data;
          sqlQuery = result.sqlQuery;

          console.log('📊 Hotspot data:', data);
          console.log('📊 Hexagon count:', data.length);

          metadata = {
            type: t('spatial.typeHotspots'),
            year,
            month,
            day: day || t('common.wholeMonth'),
            hour: hour !== null ? `${hour}:00` : t('common.allHours'),
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
          // Find hexagons above a threshold
          const thresholdResult = await manager.getSpatialThreshold(year, month, day, hour, threshold);
          data = thresholdResult.data;
          sqlQuery = thresholdResult.sqlQuery;

          metadata = {
            type: t('spatial.typeThreshold', { threshold }),
            year,
            month,
            day: day || t('common.wholeMonth'),
            hour: hour !== null ? `${hour}:00` : t('common.allHours'),
            threshold,
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          // Highlight hexagons above the threshold
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
      console.error('Spatial analysis failed:', error);
      alert(t('common.errorCalculating') + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentHelp = ANALYSIS_HELP[lang]?.[analysisType] || ANALYSIS_HELP.en[analysisType];

  return (
    <div style={{ padding: '12px', fontSize: '13px' }}>
      {/* Spatial analysis type with help button */}
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
          <option value="hotspots">{t('spatial.hotspots')}</option>
          <option value="threshold">{t('spatial.threshold')}</option>
        </select>
      </div>

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

      {/* Day (optional) */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          {t('common.dayOptional')}
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

      {/* Hour (optional) */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          {t('common.hourOptional')}
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

      {/* Top N (hotspots only) */}
      {analysisType === 'hotspots' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            {t('spatial.topN')}
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

      {/* Threshold (threshold analysis only) */}
      {analysisType === 'threshold' && (
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
