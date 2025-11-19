import React from 'react';

export function AnalyticsSection({ id, title, isActive, onToggle, children }) {
  return (
    <div
      style={{
        marginBottom: '8px',
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Header clicable */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '12px' }}>{isActive ? '▲' : '▼'}</span>
      </button>

      {/* Contenido colapsable */}
      {isActive && (
        <div
          style={{
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
