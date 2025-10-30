import React from 'react';

export function HexTooltip({ pickedHex, pointerPos }) {
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
      <div><strong>Hex ID:</strong> {pickedHex.h3 || 'N/A'}</div>
      <div><strong>Valor:</strong> {Number(pickedHex.value ?? 0).toFixed(2)}</div>
    </div>
  );
}
