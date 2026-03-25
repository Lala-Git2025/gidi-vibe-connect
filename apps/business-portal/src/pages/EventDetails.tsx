import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, MapPin, Clock, Tag, Mail, Phone, Link2,
  Pencil, Trash2, ArrowLeft, Eye, EyeOff, ExternalLink,
} from 'lucide-react';
import { useEvent, useDeleteEvent, useUpdateEvent } from '../hooks/useEvents';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatDate } from '../lib/utils';

function StatusBadge({ event }: { event: { is_published: boolean; start_date: string; end_date: string } }) {
  const now = new Date();
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);

  if (!event.is_published) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Draft</span>;
  }
  if (now < start) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Upcoming</span>;
  }
  if (now >= start && now <= end) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ongoing</span>;
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Past</span>;
}

export default function EventDetails() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(eventId);
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();

  const handleDelete = async () => {
    if (!event) return;
    const confirmed = window.confirm(`Delete "${event.title}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteEvent.mutateAsync(event.id);
      navigate('/events');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTogglePublish = async () => {
    if (!event) return;
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        is_published: !event.is_published,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Event not found.</p>
        <Button variant="ghost" className="mt-4 gap-2" onClick={() => navigate('/events')}>
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleTogglePublish}
            disabled={updateEvent.isPending}
          >
            {event.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {event.is_published ? 'Unpublish' : 'Publish'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate(`/events/${event.id}/edit`)}
          >
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleDelete}
            disabled={deleteEvent.isPending}
          >
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Featured image */}
      {event.featured_image_url && (
        <div className="rounded-xl overflow-hidden h-64 bg-muted">
          <img
            src={event.featured_image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title + status */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <StatusBadge event={event} />
            <span className="text-sm text-muted-foreground">{event.category}</span>
          </div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
        </div>
      </div>

      {/* Key details */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Start</p>
              <p className="text-sm text-muted-foreground">{formatDate(event.start_date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">End</p>
              <p className="text-sm text-muted-foreground">{formatDate(event.end_date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Venue</p>
              <p className="text-sm text-muted-foreground">{event.venue_name}</p>
              <p className="text-sm text-muted-foreground">{event.location}</p>
            </div>
          </div>
          {event.price_info && (
            <div className="flex items-start gap-3">
              <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Price</p>
                <p className="text-sm text-muted-foreground">{event.price_info}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {event.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Contact & links */}
      {(event.contact_email || event.contact_phone || event.registration_url) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact & Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.contact_email && (
              <a href={`mailto:${event.contact_email}`} className="flex items-center gap-2 text-sm hover:underline">
                <Mail className="w-4 h-4 text-muted-foreground" />
                {event.contact_email}
              </a>
            )}
            {event.contact_phone && (
              <a href={`tel:${event.contact_phone}`} className="flex items-center gap-2 text-sm hover:underline">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {event.contact_phone}
              </a>
            )}
            {event.registration_url && (
              <a
                href={event.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Registration / Tickets
                <Link2 className="w-3 h-3" />
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Metadata */}
      <p className="text-xs text-muted-foreground">
        Created {formatDate(event.created_at)} · Last updated {formatDate(event.updated_at)}
      </p>
    </div>
  );
}
