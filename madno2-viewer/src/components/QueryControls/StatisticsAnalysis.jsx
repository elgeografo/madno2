import React, { useState } from 'react';
import ParquetDataManager from '../../utils/ParquetDataManager';
import { HelpModal } from '../HelpModal';
import { ANALYSIS_HELP } from '../../utils/analysisHelpContent';

export function StatisticsAnalysis({ parquetBaseUrl, selectedHexId, onClearHexId, onExecute, setIsLoading }) {
  const [analysisType, setAnalysisType] = useState('summary');
  const [year, setYear] = useState(2001);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(null); // null = todo el mes
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
          // Resumen estadístico completo
          const summaryResult = await manager.getStatisticsSummary(
            year, month, day, selectedHexId
          );
          data = summaryResult.data;
          sqlQuery = summaryResult.sqlQuery;

          metadata = {
            type: 'Resumen Estadístico',
            year,
            month,
            day: day || 'Todo el mes',
            scope: selectedHexId ? `Hexágono ${selectedHexId}` : 'Toda la superficie',
            sqlQuery: sqlQuery,
            parquetBaseUrl: parquetBaseUrl
          };

          // Para resumen estadístico, mostraremos los datos como tabla
          onExecute(data, 'summary', metadata);
          break;

        case 'compliance':
          // Cumplimiento normativo
          const complianceResult = await manager.getStatisticsCompliance(
            year, month, day, selectedHexId
          );
          data = complianceResult.data;
          sqlQuery = complianceResult.sqlQuery;

          metadata = {
            type: 'Cumplimiento Normativo',
            year,
            month,
            day: day || 'Todo el mes',
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
      console.error('Error en análisis estadístico:', error);
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
          <option value="summary">Resumen Estadístico</option>
          <option value="compliance">Cumplimiento Normativo</option>
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

      {/* Día (opcional) */}
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

      {/* Información sobre el análisis */}
      {analysisType === 'summary' && (
        <div style={{
          marginBottom: '12px',
          padding: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          fontSize: '11px',
          opacity: 0.8
        }}>
          Mostrará estadísticas descriptivas: media, mediana, desviación estándar, percentiles, etc.
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
          Evaluará el cumplimiento de los límites de la UE: 40 µg/m³ (límite anual) y 200 µg/m³ (alerta)
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
