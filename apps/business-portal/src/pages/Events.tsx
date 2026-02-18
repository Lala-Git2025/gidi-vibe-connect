import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, MapPin, Clock, Pencil, Trash2, Eye, ExternalLink } from 'lucide-react';
import { useEvents, useDeleteEvent, useEventStats } from '../hooks/useEvents';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatDate } from '../lib/utils';

export default function Events() {
  const navigate = useNavigate();
  const { subscription } = useBusinessAuth();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const { data: events, isLoading, error } = useEvents(filter);
  const { data: stats } = useEventStats();
  const deleteEvent = useDeleteEvent();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateEvent = () => {
    // Check if user has reached monthly event limit
    const eventsThisMonth = stats?.eventsThisMonth || 0;
    const maxEvents = subscription?.max_events_per_month || 5;

    if (eventsThisMonth >= maxEvents) {
      alert(
        `You've reached your monthly event limit (${maxEvents} event${maxEvents > 1 ? 's' : ''}). Upgrade your subscription to create more events.`
      );
      navigate('/subscription');
      return;
    }

    navigate('/events/new');
  };

  const handleEdit = (eventId: string) => {
    navigate(`/events/${eventId}/edit`);
  };

  const handleView = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  const handleDelete = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(eventId);
    try {
      await deleteEvent.mutateAsync(eventId);
    } catch (error) {
      alert(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return { label: 'Upcoming', color: 'bg-blue-500' };
    if (now > end) return { label: 'Past', color: 'bg-gray-500' };
    return { label: 'Ongoing', color: 'bg-green-500' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Events</h2>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const eventsThisMonth = stats?.eventsThisMonth || 0;
  const maxEvents = subscription?.max_events_per_month || 5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground mt-1">
            Manage your events ({eventsThisMonth} of {maxEvents} created this month)
          </p>
        </div>
        <Button onClick={handleCreateEvent} disabled={eventsThisMonth >= maxEvents}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventsThisMonth} / {maxEvents}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Events created</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Limit Warning */}
      {eventsThisMonth >= maxEvents && subscription?.tier === 'Free' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Monthly Event Limit Reached</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upgrade to Premium for 20 events/month, or Enterprise for unlimited events.
                </p>
              </div>
              <Button onClick={() => navigate('/subscription')}>Upgrade Plan</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            filter === 'upcoming'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All Events
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            filter === 'past'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Past
        </button>
      </div>

      {/* Events List */}
      {events && events.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const status = getEventStatus(event.start_date, event.end_date);

            return (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Event Image */}
                <div className="aspect-video bg-muted relative">
                  {event.featured_image_url ? (
                    <img
                      src={event.featured_image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 ${status.color} text-white text-xs px-2 py-1 rounded-full`}>
                    {status.label}
                  </div>
                  {!event.is_published && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      Draft
                    </div>
                  )}
                </div>

                {/* Event Info */}
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-1">{event.title}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {event.venue_name}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(event.start_date)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-muted px-2 py-1 rounded">{event.category}</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {event.description}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleView(event.id)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(event.id)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event.id, event.title)}
                      disabled={deletingId === event.id}
                    >
                      {deletingId === event.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-destructive"></div>
                      ) : (
                        <Trash2 className="h-3 w-3 text-destructive" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                {filter === 'upcoming' ? 'No Upcoming Events' : 'No Events Yet'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {filter === 'upcoming'
                  ? 'You don\'t have any upcoming events scheduled.'
                  : 'Get started by creating your first event.'}
              </p>
              <Button onClick={handleCreateEvent}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Event
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
