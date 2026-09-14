import React from 'react';
import { useI18n } from '../i18n/useI18n';

/**
 * Tooltip shown when hovering over a GeoJSON feature.
 */
export function GeoJsonTooltip({ feature, pointerPos }) {
  const { t } = useI18n();

  if (!feature || !pointerPos) return null;

  const { properties } = feature;

  return (
    <div
      style={{
        position: 'absolute',
        left: pointerPos.x + 10,
        top: pointerPos.y + 10,
        zIndex: 1000,
        pointerEvents: 'none',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '12px',
        borderRadius: '6px',
        fontSize: '13px',
        maxWidth: '300px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '6px' }}>
        {t('population.info')}
      </div>
      {Object.entries(properties).map(([key, value]) => (
        <div key={key} style={{ marginBottom: '4px' }}>
          <span style={{ color: '#88ccff', fontWeight: '500' }}>{key}:</span>{' '}
          <span>{value !== null && value !== undefined ? String(value) : t('population.notAvailable')}</span>
        </div>
      ))}
    </div>
  );
}
