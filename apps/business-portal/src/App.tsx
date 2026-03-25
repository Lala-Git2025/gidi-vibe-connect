import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BusinessAuthProvider } from './contexts/BusinessAuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Venues from './pages/Venues';
import VenueForm from './pages/VenueForm';
import VenueDetails from './pages/VenueDetails';
import Analytics from './pages/Analytics';
import Events from './pages/Events';
import EventForm from './pages/EventForm';
import EventDetails from './pages/EventDetails';
import Offers from './pages/Offers';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';
function App() {
  return (
    <BrowserRouter>
      <BusinessAuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes with dashboard layout */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/venues" element={<Venues />} />
            <Route path="/venues/new" element={<VenueForm />} />
            <Route path="/venues/:venueId" element={<VenueDetails />} />
            <Route path="/venues/:venueId/edit" element={<VenueForm />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/new" element={<EventForm />} />
            <Route path="/events/:eventId" element={<EventDetails />} />
            <Route path="/events/:eventId/edit" element={<EventForm />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BusinessAuthProvider>
    </BrowserRouter>
  );
}

export default App;
