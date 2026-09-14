import React from 'react';
import { useI18n } from '../i18n/useI18n';

export function HexTooltip({ pickedHex, pointerPos }) {
  const { t } = useI18n();

  if (!pickedHex) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: pointerPos.x,
        top: pointerPos.y,
        background: 'white',
        padding: '4px',
        fontSize: '12px',
        borderRadius: '4px',
        pointerEvents: 'none',
      }}
    >
      <div><strong>{t('tooltip.hexId')}</strong> {pickedHex.h3 || t('population.notAvailable')}</div>
      <div><strong>{t('tooltip.value')}</strong> {Number(pickedHex.value ?? 0).toFixed(2)}</div>
    </div>
  );
}
