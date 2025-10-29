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
      <div><strong>Hex ID:</strong> {pickedHex.hexagon}</div>
      <div><strong>Valor:</strong> {Number(pickedHex.object?.value ?? 0).toFixed(2)}</div>
    </div>
  );
}
