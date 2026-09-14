import React, { useState } from 'react';
import { AnalyticsSection } from './AnalyticsSection';
import { TemporalAnalysis } from './QueryControls/TemporalAnalysis';
import { SpatialAnalysis } from './QueryControls/SpatialAnalysis';
import { ExtremeEvents } from './QueryControls/ExtremeEvents';
import { ComparativeAnalysis } from './QueryControls/ComparativeAnalysis';
import { StatisticsAnalysis } from './QueryControls/StatisticsAnalysis';
import { D3Chart } from './D3Chart';
import { useI18n } from '../i18n/useI18n';

export function AnalyticsPanel({ isOpen, onToggle, parquetBaseUrl, selectedHexId, onClearHexId, onHighlightHexagons, onSpatialAnalysisExecute }) {
  const { t } = useI18n();
  // Analysis panel backed by Parquet queries
  const [activeSection, setActiveSection] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState(null);
  const [chartMetadata, setChartMetadata] = useState(null); // Metadatos del análisis
  const [isLoading, setIsLoading] = useState(false);

  const handleSectionToggle = (sectionId) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  const handleClearChart = () => {
    setChartData(null);
    setChartType(null);
    setChartMetadata(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          background: 'rgba(128, 128, 128, 0.7)',
          backdropFilter: 'blur(4px)',
          border: 'none',
          borderRadius: '0 8px 8px 0',
          padding: '16px 8px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '20px',
          boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
        }}
      >
        ▶️
      </button>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '450px',
          zIndex: 20,
          background: 'rgba(128, 128, 128, 0.7)',
          backdropFilter: 'blur(4px)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          color: 'white',
        }}
      >
        {/* Header with close button */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {t('analytics.panelTitle')}
          </h2>
          <button
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px',
            }}
          >
            ◀️
          </button>
        </div>

        {/* Scrollable collapsible sections */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          <AnalyticsSection
            id="temporal"
            title={t('analytics.section1')}
            isActive={activeSection === 'temporal'}
            onToggle={() => handleSectionToggle('temporal')}
          >
            <TemporalAnalysis
              parquetBaseUrl={parquetBaseUrl}
              selectedHexId={selectedHexId}
              onClearHexId={onClearHexId}
              onExecute={(data, type, metadata) => {
                setChartData(data);
                setChartType(type);
                setChartMetadata(metadata);
              }}
              setIsLoading={setIsLoading}
            />
          </AnalyticsSection>

          <AnalyticsSection
            id="spatial"
            title={t('analytics.section2')}
            isActive={activeSection === 'spatial'}
            onToggle={() => handleSectionToggle('spatial')}
          >
            <SpatialAnalysis
              parquetBaseUrl={parquetBaseUrl}
              onExecute={(data, type, metadata) => {
                setChartData(data);
                setChartType(type);
                setChartMetadata(metadata);
              }}
              setIsLoading={setIsLoading}
              onHighlightHexagons={onHighlightHexagons}
              onSpatialAnalysisExecute={onSpatialAnalysisExecute}
            />
          </AnalyticsSection>

          <AnalyticsSection
            id="extreme"
            title={t('analytics.section3')}
            isActive={activeSection === 'extreme'}
            onToggle={() => handleSectionToggle('extreme')}
          >
            <ExtremeEvents
              parquetBaseUrl={parquetBaseUrl}
              selectedHexId={selectedHexId}
              onClearHexId={onClearHexId}
              onExecute={(data, type, metadata) => {
                setChartData(data);
                setChartType(type);
                setChartMetadata(metadata);
              }}
              setIsLoading={setIsLoading}
            />
          </AnalyticsSection>

          <AnalyticsSection
            id="comparative"
            title={t('analytics.section4')}
            isActive={activeSection === 'comparative'}
            onToggle={() => handleSectionToggle('comparative')}
          >
            <ComparativeAnalysis
              parquetBaseUrl={parquetBaseUrl}
              selectedHexId={selectedHexId}
              onClearHexId={onClearHexId}
              onExecute={(data, type, metadata) => {
                setChartData(data);
                setChartType(type);
                setChartMetadata(metadata);
              }}
              setIsLoading={setIsLoading}
            />
          </AnalyticsSection>

          <AnalyticsSection
            id="statistics"
            title={t('analytics.section5')}
            isActive={activeSection === 'statistics'}
            onToggle={() => handleSectionToggle('statistics')}
          >
            <StatisticsAnalysis
              parquetBaseUrl={parquetBaseUrl}
              selectedHexId={selectedHexId}
              onClearHexId={onClearHexId}
              onExecute={(data, type, metadata) => {
                setChartData(data);
                setChartType(type);
                setChartMetadata(metadata);
              }}
              setIsLoading={setIsLoading}
            />
          </AnalyticsSection>

          <AnalyticsSection
            id="advanced"
            title={t('analytics.section6')}
            isActive={activeSection === 'advanced'}
            onToggle={() => handleSectionToggle('advanced')}
          >
            <div style={{ padding: '12px', fontSize: '13px' }}>
              <p style={{ margin: 0, opacity: 0.7 }}>{t('analytics.comingSoon')}</p>
            </div>
          </AnalyticsSection>
        </div>

        {/* D3 chart area pinned to the bottom */}
        <D3Chart
          data={chartData}
          chartType={chartType}
          metadata={chartMetadata}
          isLoading={isLoading}
          onClear={handleClearChart}
        />
      </div>
    </>
  );
}
