import { daysInMonth } from './dateUtils';

// Genera la secuencia de frames según los filtros elegidos
export function buildFrames({ year, month, day, hour }) {
  if (!year) return [];
  const frames = [];

  // Caso 1: Año + Mes + Día => animación por horas (01..24) de ese día
  if (year && month && day && !Number.isNaN(Number(day))) {
    for (let h = 1; h <= 24; h++) frames.push({ year, month, day, hour: h });
    return frames;
  }

  // Caso 2: Año + Hora => animación por todos los días del año a esa hora
  if (year && hour !== '' && hour !== null && hour !== undefined && !(month || day)) {
    for (let m = 1; m <= 12; m++) {
      const dim = daysInMonth(year, m);
      for (let d = 1; d <= dim; d++) frames.push({ year, month: m, day: d, hour: Number(hour) });
    }
    return frames;
  }

  // Caso 3 (extra útil): Año + Mes => animación día a día y hora a hora de ese mes
  if (year && month && !day && (hour === '' || hour === undefined)) {
    const dim = daysInMonth(year, month);
    for (let d = 1; d <= dim; d++) {
      for (let h = 1; h <= 24; h++) frames.push({ year, month, day: d, hour: h });
    }
    return frames;
  }

  // Caso 4: Solo Año => hora a hora y día a día de todo el año
  if (year && !(month || day || (hour !== '' && hour !== undefined))) {
    for (let m = 1; m <= 12; m++) {
      const dim = daysInMonth(year, m);
      for (let d = 1; d <= dim; d++) {
        for (let h = 1; h <= 24; h++) frames.push({ year, month: m, day: d, hour: h });
      }
    }
    return frames;
  }

  // Si se proporciona una combinación no contemplada, no generamos nada.
  return [];
}
