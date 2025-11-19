import React, { useState } from 'react';
import ParquetDataManager from '../../utils/ParquetDataManager';
import { HelpModal } from '../HelpModal';
import { ANALYSIS_HELP } from '../../utils/analysisHelpContent';

export function ComparativeAnalysis({ parquetBaseUrl, selectedHexId, onClearHexId, onExecute, setIsLoading }) {
  const [year1, setYear1] = useState(2001);
  const [year2, setYear2] = useState(2020);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(null); // null = todo el mes (promedio)
  const [showHelp, setShowHelp] = useState(false);

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const manager = ParquetDataManager.getInstance(parquetBaseUrl);

      const result = await manager.getComparativeHourly(
        year1, year2, month, day, selectedHexId
      );

      const data = result.data;
      const sqlQuery = result.sqlQuery;

      const metadata = {
        type: `Comparación ${year1} vs ${year2}`,
        year1,
        year2,
        month,
        day: day || 'Todo el mes (promediado)',
        scope: selectedHexId ? `Hexágono ${selectedHexId}` : 'Toda la superficie',
        sqlQuery: sqlQuery,
        parquetBaseUrl: parquetBaseUrl
      };

      onExecute(data, 'line', metadata);
    } catch (error) {
      console.error('Error en análisis comparativo:', error);
      alert('Error al calcular el análisis: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentHelp = ANALYSIS_HELP['comparative_years'];

  return (
    <div style={{ padding: '12px', fontSize: '13px' }}>
      {/* Header con botón de ayuda */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontWeight: '600' }}>
            Comparar dos años
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
        <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
          Compara el patrón horario (24h) de dos años diferentes
        </div>
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

      {/* Año 1 */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          Año 1
        </label>
        <input
          type="number"
          min={2001}
          max={2025}
          value={year1}
          onChange={(e) => setYear1(Number(e.target.value))}
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

      {/* Año 2 */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
          Año 2
        </label>
        <input
          type="number"
          min={2001}
          max={2025}
          value={year2}
          onChange={(e) => setYear2(Number(e.target.value))}
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
          <option value="">Todo el mes (promediado)</option>
          {[...Array(31)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
          Si no seleccionas día, se promedian todos los días del mes
        </div>
      </div>

      {/* Información sobre el gráfico */}
      <div style={{
        marginBottom: '12px',
        padding: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        fontSize: '11px',
        opacity: 0.8
      }}>
        El gráfico mostrará 2 líneas (una por año) con las 24 horas del día en el eje X
      </div>

      {/* Botón calcular */}
      <button
        onClick={handleCalculate}
        disabled={year1 === year2}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: '600',
          border: 'none',
          borderRadius: '4px',
          background: year1 === year2 ? 'rgba(128, 128, 128, 0.5)' : 'rgba(99, 102, 241, 0.9)',
          color: 'white',
          cursor: year1 === year2 ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (year1 !== year2) {
            e.currentTarget.style.background = 'rgba(79, 70, 229, 0.9)';
          }
        }}
        onMouseLeave={(e) => {
          if (year1 !== year2) {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.9)';
          }
        }}
      >
        {year1 === year2 ? 'Selecciona años diferentes' : 'Calcular'}
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
