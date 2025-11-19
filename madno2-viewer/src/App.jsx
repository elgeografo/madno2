import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { MapView } from './pages/MapView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/map/:mapId" element={<MapView />} />
      </Routes>
    </Router>
  );
}

export default App;
