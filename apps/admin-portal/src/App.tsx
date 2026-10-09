import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { AdminLayout } from './components/layout/AdminLayout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import VenueManager from './pages/VenueManager';
import PromotionsManager from './pages/PromotionsManager';
import UserManager from './pages/UserManager';
import Analytics from './pages/Analytics';
import VerificationsManager from './pages/VerificationsManager';
import ReportsManager from './pages/ReportsManager';
import AuditLog from './pages/AuditLog';
import EventsManager from './pages/EventsManager';
import NewsManager from './pages/NewsManager';
import CommunitiesManager from './pages/CommunitiesManager';
import Health from './pages/Health';
import Settings from './pages/Settings';

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
            <Route path="/verifications" element={<VerificationsManager />} />
            {/* Seven routes the sidebar has linked to since it was written.
                Until now the catch-all below swallowed every one of them, so
                clicking Reports or Audit log silently returned you to
                Overview — a dead link that looks like a misclick. */}
            <Route path="/reports" element={<ReportsManager />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/events" element={<EventsManager />} />
            <Route path="/news" element={<NewsManager />} />
            <Route path="/communities" element={<CommunitiesManager />} />
            <Route path="/health" element={<Health />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
