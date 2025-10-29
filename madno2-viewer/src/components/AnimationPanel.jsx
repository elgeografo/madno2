import React from 'react';
import { pad2, daysInMonth } from '../utils/dateUtils';

export function AnimationPanel({
  year,
  setYear,
  month,
  setMonth,
  day,
  setDay,
  hour,
  setHour,
  frames,
  frameIdx,
  setFrameIdx,
  playing,
  handlePlay,
  handlePause,
  handleStop,
}) {
  const thisYear = 2024;

  const curFrame = frames[frameIdx];
  const displayHour = curFrame ? (curFrame.hour === 24 ? 0 : curFrame.hour) : 0;
  const label = curFrame
    ? `${curFrame.year}-${pad2(curFrame.month)}-${pad2(curFrame.day)} ${pad2(displayHour)}:00`
    : '—';

  return (
    <div
      style={{
        position: 'absolute',
        right: 10,
        bottom: 10,
        zIndex: 11,
        background: 'rgba(255,255,255,0.95)',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '12px',
        minWidth: '300px',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label><strong>Año*</strong></label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || '')}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label><strong>Mes</strong></label>
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setDay('');
            }}
            style={{ width: '100%' }}
          >
            <option value="">—</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{pad2(i + 1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label><strong>Día</strong></label>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            style={{ width: '100%' }}
            disabled={!month}
          >
            <option value="">—</option>
            {month &&
              [...Array(daysInMonth(year || thisYear, Number(month)))].map((_, i) => (
                <option key={i + 1} value={i + 1}>{pad2(i + 1)}</option>
              ))}
          </select>
        </div>
        <div>
          <label><strong>Hora</strong></label>
          <select
            value={hour}
            onChange={(e) => setHour(e.target.value === '' ? '' : Number(e.target.value))}
            style={{ width: '100%' }}
          >
            <option value="">—</option>
            {[...Array(24)].map((_, i) => {
              const hh = i + 1; // 1..24
              return (
                <option key={hh} value={hh}>{pad2(hh)}:00</option>
              );
            })}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={handlePlay} disabled={frames.length === 0 || playing}>▶️ Play</button>
          <button onClick={handlePause} disabled={!playing}>⏸️ Pause</button>
          <button onClick={handleStop} disabled={frames.length === 0}>⏹️ Stop</button>
          <div style={{ marginLeft: 'auto', fontFamily: 'monospace' }}>
            <strong>{label}</strong>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          step={1}
          value={Math.min(frameIdx, Math.max(0, frames.length - 1))}
          onChange={(e) => setFrameIdx(Number(e.target.value))}
          style={{ width: '100%', marginTop: 6 }}
          disabled={frames.length < 2}
        />
        <div style={{ textAlign: 'right' }}>{frames.length} frames</div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          <em>
            Lógica del filtro:
            <br />
            - Año + Mes + Día → recorre horas del día.
            <br />
            - Año + Hora → recorre todos los días del año a esa hora.
            <br />
            - Solo Año (o Año + Mes) → recorre días y horas.
          </em>
        </div>
      </div>
    </div>
  );
}
