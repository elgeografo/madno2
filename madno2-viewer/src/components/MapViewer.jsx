import React from 'react';
import { DeckGL } from '@deck.gl/react';

export function MapViewer({ layers, onClick, onHover, viewState, onViewStateChange, initialViewState }) {
  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={onViewStateChange}
      initialViewState={initialViewState}
      controller={true}
      layers={layers}
      onClick={onClick}
      onHover={onHover}
      getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
    />
  );
}
