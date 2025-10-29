import React, { useState } from 'react';

/**
 * Componente de geocodificación usando Nominatim (OpenStreetMap)
 */
export function Geocoder({ onLocationSelected }) {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchLocation = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      // API de Nominatim (OpenStreetMap) - servicio gratuito
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}` +
        `&format=json` +
        `&limit=5` +
        `&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            // User-Agent requerido por Nominatim
            'User-Agent': 'madno2-viewer'
          }
        }
      );

      const results = await response.json();
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error al buscar ubicación:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchText.trim()) {
      searchLocation(searchText);
    }
  };

  const handleSelectLocation = (location) => {
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);

    setSearchText(location.display_name);
    setShowSuggestions(false);
    setSuggestions([]);

    // Llamar al callback con las coordenadas
    onLocationSelected({ latitude: lat, longitude: lon, zoom: 14 });
  };

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(255, 255, 255, 0.9)',
      padding: '8px 12px',
      borderRadius: '6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      minWidth: '300px',
    }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1, gap: '8px' }}>
        <input
          type="text"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            // Búsqueda automática mientras escribe
            if (e.target.value.length >= 3) {
              searchLocation(e.target.value);
            } else {
              setSuggestions([]);
              setShowSuggestions(false);
            }
          }}
          placeholder="Buscar dirección..."
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={isSearching || !searchText.trim()}
          style={{
            padding: '6px 12px',
            background: isSearching ? '#9ca3af' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSearching ? 'wait' : 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
          }}
        >
          {isSearching ? '🔍' : '🔍 Buscar'}
        </button>
      </form>

      {/* Lista de sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1000,
        }}>
          {suggestions.map((location, index) => (
            <div
              key={index}
              onClick={() => handleSelectLocation(location)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                fontSize: '13px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '2px' }}>
                {location.display_name.split(',')[0]}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                {location.display_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
