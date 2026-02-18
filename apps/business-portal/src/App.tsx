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

// Placeholder pages - will build these in Phase 2+

function EventDetails() {
  return <div><h1 className="text-2xl font-bold">Event Details</h1><p className="text-muted-foreground mt-2">View event details</p></div>;
}

function Offers() {
  return <div><h1 className="text-2xl font-bold">Offers</h1><p className="text-muted-foreground mt-2">Manage exclusive offers</p></div>;
}

function Subscription() {
  return <div><h1 className="text-2xl font-bold">Subscription</h1><p className="text-muted-foreground mt-2">Manage your subscription plan</p></div>;
}

function Settings() {
  return <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground mt-2">Account settings</p></div>;
}

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
