import React from 'react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  const maps = [
    {
      id: 'madno2',
      title: 'Madrid NO2',
      description: 'Visualization of NO2 levels in Madrid during 2024',
      path: '/map/madno2',
      region: 'Madrid, Spain',
      status: 'active'
    },
    {
      id: 'alcarria',
      title: 'La Alcarria',
      description: 'Data visualization in La Alcarria (Pastrana area)',
      path: '/map/alcarria',
      region: 'La Alcarria, Guadalajara',
      status: 'active'
    },
    {
      id: 'example',
      title: 'Other Region',
      description: 'Coming soon: Visualization for another region',
      path: '/map/example',
      region: 'To be defined',
      status: 'coming-soon'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        textAlign: 'center',
        color: 'white',
        marginBottom: '60px'
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '700',
          marginBottom: '20px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
        }}>
          GeosO2 Viewer
        </h1>
        <p style={{
          fontSize: '1.25rem',
          opacity: 0.9,
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Geospatial visualization platform for environmental data
        </p>
      </div>

      {/* Cards Grid */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '30px',
        padding: '0 20px'
      }}>
        {maps.map(map => (
          <div
            key={map.id}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              position: 'relative',
              opacity: map.status === 'coming-soon' ? 0.7 : 1
            }}
          >
            {map.status === 'coming-soon' && (
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#fbbf24',
                color: '#78350f',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                Coming Soon
              </div>
            )}

            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '600',
              marginBottom: '12px',
              color: '#1f2937'
            }}>
              {map.title}
            </h2>

            <div style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '1rem' }}>📍</span>
              {map.region}
            </div>

            <p style={{
              color: '#4b5563',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              {map.description}
            </p>

            {map.status === 'active' ? (
              <Link
                to={map.path}
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'transform 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Access map →
              </Link>
            ) : (
              <button
                disabled
                style={{
                  display: 'inline-block',
                  background: '#d1d5db',
                  color: '#6b7280',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'not-allowed'
                }}
              >
                In development
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        maxWidth: '1200px',
        margin: '60px auto 0',
        textAlign: 'center',
        color: 'white',
        opacity: 0.8,
        fontSize: '0.875rem'
      }}>
        <p>Geospatial visualization project for environmental data</p>
        <p style={{ marginTop: '8px' }}>© 2024 - Universidad Politécnica de Madrid</p>
      </div>
    </div>
  );
}
