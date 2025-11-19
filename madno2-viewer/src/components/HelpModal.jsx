import React from 'react';
import ReactDOM from 'react-dom';

export function HelpModal({ isOpen, onClose, title, description, sqlQuery, example }) {
  if (!isOpen) return null;

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(50, 50, 50, 0.98)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'white' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '28px',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              padding: '0 8px',
              lineHeight: '1',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          >
            ×
          </button>
        </div>

        {/* Contenido */}
        <div style={{ padding: '24px' }}>
          {/* Descripción */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
              ¿Qué hace esta consulta?
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', margin: 0 }}>
              {description}
            </p>
          </div>

          {/* Query SQL */}
          {sqlQuery && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                Consulta SQL
              </h3>
              <pre
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#a3e635',
                  overflow: 'auto',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontFamily: 'monospace',
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                {sqlQuery}
              </pre>
            </div>
          )}

          {/* Ejemplo */}
          {example && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                Ejemplo de uso
              </h3>
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  padding: '14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  lineHeight: '1.6',
                }}
              >
                {example}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'rgba(99, 102, 241, 0.9)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(79, 70, 229, 0.9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.9)'; }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );

  // Usar portal para renderizar en document.body
  return ReactDOM.createPortal(modalContent, document.body);
}
