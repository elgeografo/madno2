import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MapView } from './pages/MapView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/map/:mapId" element={<MapView />} />
        {/* Cualquier otra ruta aterriza directamente en el mapa de Madrid NO2 */}
        <Route path="*" element={<Navigate to="/map/madno2" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
