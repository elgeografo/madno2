import React from 'react';
import { Link } from 'react-router-dom';
import { MAP_STYLES } from '../config/mapStyles';
import { Geocoder } from './Geocoder';

/**
 * Top menu bar with semi-transparent background
 */
export function MenuBar({ mapStyleId, setMapStyleId, showTerrain, setShowTerrain, onLocationSelected }) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'rgba(128, 128, 128, 0.7)',
      backdropFilter: 'blur(4px)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      {/* Botón Home */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '6px',
          textDecoration: 'none',
          color: '#374151',
          fontSize: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="Home"
      >
        🏠
      </Link>

      {/* Map style selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 12px',
        borderRadius: '6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <label style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#374151',
          whiteSpace: 'nowrap',
        }}>
          Map style:
        </label>
        <select
          value={mapStyleId}
          onChange={(e) => setMapStyleId(e.target.value)}
          style={{
            padding: '6px 8px',
            fontSize: '13px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            background: 'white',
            color: '#374151',
            cursor: 'pointer',
            minWidth: '150px',
          }}
        >
          {Object.values(MAP_STYLES).map(style => (
            <option key={style.id} value={style.id}>{style.name}</option>
          ))}
        </select>
      </div>

      {/* Terrain toggle switch */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 12px',
        borderRadius: '6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <label style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#374151',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}>
          Show terrain
        </label>
        <label style={{
          position: 'relative',
          display: 'inline-block',
          width: '44px',
          height: '24px',
          cursor: 'pointer',
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

      {/* Geocoder */}
      <Geocoder onLocationSelected={onLocationSelected} />
    </div>
  );
}
