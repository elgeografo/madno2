// Color helper para mantener consistencia en transiciones
export const colorFromValue = (v) => {
  const val = Number(v) || 0;
  const a = val <= 0 ? 0 : 255; // ocultar cuando está en 0 (fade-out invisible)
  return [
    Math.min(255, Math.max(0, Math.round(val * 4))),
    80,
    180 - Math.min(180, Math.max(0, Math.round(val * 2))),
    a,
  ];
};
