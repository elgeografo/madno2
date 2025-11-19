import React from 'react';
import { MAP_STYLES } from '../config/mapStyles';

export function MapStyleSelector({ mapStyleId, setMapStyleId, showTerrain, setShowTerrain }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 90,
        zIndex: 10,
        background: 'rgba(255,255,255,0.9)',
        padding: '10px',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '12px',
        minWidth: '200px',
      }}
    >
      <label><strong>Estilo de mapa</strong></label>
      <select
        value={mapStyleId}
        onChange={(e) => setMapStyleId(e.target.value)}
        style={{ width: '100%', padding: '4px', marginTop: '4px', marginBottom: '8px' }}
      >
        {Object.values(MAP_STYLES).map(style => (
          <option key={style.id} value={style.id}>{style.name}</option>
        ))}
      </select>

      {/* Switch para capa de relieve */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <label style={{ cursor: 'pointer', flex: 1 }}>
          Mostrar relieve
        </label>
        <label style={{
          position: 'relative',
          display: 'inline-block',
          width: '44px',
          height: '24px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={showTerrain}
            onChange={(e) => setShowTerrain(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute',
            cursor: 'pointer',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: showTerrain ? '#667eea' : '#ccc',
            transition: '0.3s',
            borderRadius: '24px',
          }}>
            <span style={{
              position: 'absolute',
              content: '',
              height: '18px',
              width: '18px',
              left: showTerrain ? '23px' : '3px',
              bottom: '3px',
              backgroundColor: 'white',
              transition: '0.3s',
              borderRadius: '50%',
            }} />
          </span>
        </label>
      </div>
    </div>
  );
}
