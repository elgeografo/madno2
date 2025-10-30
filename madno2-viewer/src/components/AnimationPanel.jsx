import React from 'react';
import { pad2, daysInMonth } from '../utils/dateUtils';

export function AnimationPanel({
  frames,
  frameIdx,
  setFrameIdx,
  playing,
  handlePlay,
  handlePause,
  handleStop,
}) {
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
        bottom: 220,
        zIndex: 11,
        background: 'rgba(128, 128, 128, 0.7)',
        backdropFilter: 'blur(4px)',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        fontSize: '13px',
        minWidth: '320px',
        width: '320px',
        color: 'white',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '8px' }}>
          <button
            onClick={handlePlay}
            disabled={frames.length === 0 || playing}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: 'none',
              borderRadius: '4px',
              background: (frames.length === 0 || playing) ? 'rgba(200,200,200,0.5)' : 'rgba(255,255,255,0.9)',
              color: '#374151',
              cursor: (frames.length === 0 || playing) ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            ▶️
          </button>
          <button
            onClick={handlePause}
            disabled={!playing}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: 'none',
              borderRadius: '4px',
              background: !playing ? 'rgba(200,200,200,0.5)' : 'rgba(255,255,255,0.9)',
              color: '#374151',
              cursor: !playing ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            ⏸️
          </button>
          <button
            onClick={handleStop}
            disabled={frames.length === 0}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: 'none',
              borderRadius: '4px',
              background: frames.length === 0 ? 'rgba(200,200,200,0.5)' : 'rgba(255,255,255,0.9)',
              color: '#374151',
              cursor: frames.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            ⏹️
          </button>
          <div style={{
            marginLeft: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px',
            background: 'rgba(0,0,0,0.3)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontWeight: '600',
          }}>
            {label}
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          step={1}
          value={Math.min(frameIdx, Math.max(0, frames.length - 1))}
          onChange={(e) => setFrameIdx(Number(e.target.value))}
          style={{ width: '100%', marginBottom: '4px' }}
          disabled={frames.length < 2}
        />
        <div style={{ textAlign: 'right', fontSize: '12px', opacity: 0.9 }}>
          {frames.length} frames
        </div>
      </div>
    </div>
  );
}
