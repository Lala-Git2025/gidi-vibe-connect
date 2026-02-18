import { useNavigate } from 'react-router-dom';
import { Building2, Eye, Calendar, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { useVenueStats } from '../hooks/useVenues';
import { useEventStats } from '../hooks/useEvents';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, subscription } = useBusinessAuth();
  const { data: venueStats, isLoading: loadingVenueStats } = useVenueStats();
  const { data: eventStats, isLoading: loadingEventStats } = useEventStats();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {profile?.full_name}! Here's your business overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Venues"
          value={loadingVenueStats ? '-' : venueStats?.totalVenues || 0}
          icon={Building2}
          description={`${subscription?.max_venues || 0} venues allowed`}
        />
        <StatCard
          title="Profile Views"
          value={loadingVenueStats ? '-' : venueStats?.totalViews || 0}
          icon={Eye}
          description="Last 30 days"
        />
        <StatCard
          title="Active Events"
          value={loadingEventStats ? '-' : eventStats?.upcomingEvents || 0}
          icon={Calendar}
          description="Upcoming events"
        />
        <StatCard
          title="Active Offers"
          value="0"
          icon={Tag}
          description="Current promotions"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <button
              onClick={() => navigate('/venues/new')}
              className="p-4 border rounded-lg hover:bg-accent transition-colors text-left"
            >
              <Building2 className="h-6 w-6 mb-2 text-primary" />
              <h3 className="font-semibold">Add Venue</h3>
              <p className="text-sm text-muted-foreground">Create a new venue listing</p>
            </button>
            <button
              onClick={() => navigate('/events')}
              className="p-4 border rounded-lg hover:bg-accent transition-colors text-left"
            >
              <Calendar className="h-6 w-6 mb-2 text-primary" />
              <h3 className="font-semibold">Create Event</h3>
              <p className="text-sm text-muted-foreground">Add an upcoming event</p>
            </button>
            <button
              onClick={() => {
                if (subscription?.can_create_offers) {
                  navigate('/offers');
                } else {
                  navigate('/subscription');
                }
              }}
              className="p-4 border rounded-lg hover:bg-accent transition-colors text-left"
            >
              <Tag className="h-6 w-6 mb-2 text-primary" />
              <h3 className="font-semibold">New Offer</h3>
              <p className="text-sm text-muted-foreground">
                Create a special promotion
                {!subscription?.can_create_offers && (
                  <span className="block text-primary text-xs mt-1">Premium required</span>
                )}
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Info */}
      {subscription?.tier === 'Free' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Upgrade to Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Unlock more features with a Premium subscription:
            </p>
            <ul className="space-y-2 text-sm mb-4">
              <li className="flex items-center">
                <span className="text-primary mr-2">✓</span>
                Up to 3 venues
              </li>
              <li className="flex items-center">
                <span className="text-primary mr-2">✓</span>
                50 photos per venue
              </li>
              <li className="flex items-center">
                <span className="text-primary mr-2">✓</span>
                Analytics dashboard
              </li>
              <li className="flex items-center">
                <span className="text-primary mr-2">✓</span>
                Create exclusive offers
              </li>
              <li className="flex items-center">
                <span className="text-primary mr-2">✓</span>
                Menu management
              </li>
            </ul>
            <Button onClick={() => navigate('/subscription')}>
              View Plans
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
