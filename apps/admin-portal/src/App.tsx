import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { AdminLayout } from './components/layout/AdminLayout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import VenueManager from './pages/VenueManager';
import PromotionsManager from './pages/PromotionsManager';
import UserManager from './pages/UserManager';
import Analytics from './pages/Analytics';

function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/venues" element={<VenueManager />} />
            <Route path="/promotions" element={<PromotionsManager />} />
            <Route path="/users" element={<UserManager />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
