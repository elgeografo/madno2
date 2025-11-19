import React, { useState } from 'react';
import ParquetDataManager from '../../utils/ParquetDataManager';
import { HelpModal } from '../HelpModal';
import { ANALYSIS_HELP } from '../../utils/analysisHelpContent';

export function ExtremeEvents({ parquetBaseUrl, selectedHexId, onClearHexId, onExecute, setIsLoading }) {
  const [analysisType, setAnalysisType] = useState('peak_days');
  const [year, setYear] = useState(2001);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(null); // null = todo el mes
  const [hour, setHour] = useState(null); // null = todas las horas
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
          // Top N días con mayor contaminación
          const peakResult = await manager.getExtremePeakDays(
            year, month, day, hour, topN, selectedHexId
          );
          data = peakResult.data;
          sqlQuery = peakResult.sqlQuery;

          metadata = {
            type: `Top ${topN} días más contaminados`,
            year,
            month,
            day: day || 'Todo el mes',
            hour: hour !== null ? `${hour}:00` : 'Todas las horas',
            scope: selectedHexId ? `Hexágono ${selectedHexId}` : 'Toda la superficie',
            topN,
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        case 'consecutive_days':
          // Episodios de días consecutivos que superan umbral
          const consecutiveResult = await manager.getExtremeConsecutiveDays(
            year, month, threshold, consecutiveDays, selectedHexId
          );
          data = consecutiveResult.data;
          sqlQuery = consecutiveResult.sqlQuery;

          metadata = {
            type: `Episodios de ${consecutiveDays}+ días consecutivos > ${threshold} µg/m³`,
            year,
            month,
            threshold,
            consecutiveDays,
            scope: selectedHexId ? `Hexágono ${selectedHexId}` : 'Toda la superficie',
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        case 'percentile':
          // Días que superan un percentil específico
          const percentileResult = await manager.getExtremePercentile(
            year, month, day, hour, percentile, selectedHexId
          );
          data = percentileResult.data;
          sqlQuery = percentileResult.sqlQuery;

          metadata = {
            type: `Días que superan percentil ${percentile}`,
            year,
            month,
            day: day || 'Todo el mes',
            hour: hour !== null ? `${hour}:00` : 'Todas las horas',
            percentile,
            scope: selectedHexId ? `Hexágono ${selectedHexId}` : 'Toda la superficie',
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        case 'duration':
          // Días donde se superó el umbral durante N horas consecutivas
          const durationResult = await manager.getExtremeDuration(
            year, month, threshold, consecutiveHours, selectedHexId
          );
          data = durationResult.data;
          sqlQuery = durationResult.sqlQuery;

          metadata = {
            type: `Días con ${consecutiveHours}+ horas consecutivas > ${threshold} µg/m³`,
            year,
            month,
            threshold,
            consecutiveHours,
            scope: selectedHexId ? `Hexágono ${selectedHexId}` : 'Toda la superficie',
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          onExecute(data, 'bar', metadata);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error en análisis de eventos extremos:', error);
      alert('Error al calcular el análisis: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentHelp = ANALYSIS_HELP[analysisType];

  return (
    <div style={{ padding: '12px', fontSize: '13px' }}>
      {/* Tipo de análisis con botón de ayuda */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontWeight: '600' }}>
            Tipo de análisis
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
            title="Ver ayuda sobre este análisis"
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
          <option value="peak_days">Días con mayor contaminación</option>
          <option value="consecutive_days">Episodios consecutivos</option>
          <option value="percentile">Análisis de percentiles</option>
          <option value="duration">Duración de eventos</option>
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
              <strong>Hexágono:</strong> {selectedHexId.substring(0, 10)}...
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
              Limpiar
            </button>
          </div>
          <div style={{ marginTop: '4px', opacity: 0.7, fontSize: '11px' }}>
            Análisis limitado a este hexágono
          </div>
        </div>
      )}

      {/* Año */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          Año
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

      {/* Mes */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          Mes
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
              {new Date(2000, i, 1).toLocaleString('es-ES', { month: 'long' })}
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
            <option value="">Todo el mes</option>
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
            <option value="">Todas las horas</option>
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
            Número de días (Top N)
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
            Umbral (µg/m³)
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
            Referencia: 40 µg/m³ (límite anual UE), 200 µg/m³ (alerta horaria)
          </div>
        </div>
      )}

      {/* Días consecutivos (solo para consecutive_days) */}
      {analysisType === 'consecutive_days' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
            Días consecutivos mínimos
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
            Horas consecutivas mínimas
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
            Percentil
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
            <option value={90}>P90 (percentil 90)</option>
            <option value={95}>P95 (percentil 95)</option>
            <option value={99}>P99 (percentil 99)</option>
          </select>
          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
            Identifica valores en la cola superior de la distribución
          </div>
        </div>
      )}

      {/* Botón calcular */}
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
        Calcular
      </button>

      {/* Modal de ayuda */}
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
