import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  MapPin,
  Star,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import { useEvents, useDeleteEvent, useEventStats } from '../hooks/useEvents';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { formatDate } from '../lib/utils';

const FILTERS = ['All', 'Upcoming', 'Live', 'Past', 'Drafts'] as const;
type Filter = typeof FILTERS[number];

const filterToQuery = (f: Filter): 'all' | 'upcoming' | 'past' =>
  f === 'Past' ? 'past' : f === 'All' ? 'all' : 'upcoming';

const getEventStatus = (startDate: string, endDate: string, isPublished: boolean) => {
  if (!isPublished) return { label: 'Draft', pill: 'bp2-pill-draft' };
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now < start) return { label: 'On sale',  pill: 'bp2-pill-live' };
  if (now > end)   return { label: 'Past',     pill: 'bp2-pill-draft' };
  return                   { label: 'Live',     pill: 'bp2-pill-live' };
};

export default function Events() {
  const navigate = useNavigate();
  const { subscription } = useBusinessAuth();
  const [filter, setFilter] = useState<Filter>('Upcoming');
  const [search, setSearch] = useState('');
  const { data: events, isLoading, error } = useEvents(filterToQuery(filter));
  const { data: stats } = useEventStats();
  const deleteEvent = useDeleteEvent();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateEvent = () => {
    const eventsThisMonth = stats?.eventsThisMonth || 0;
    const maxEvents = subscription?.max_events_per_month || 5;
    if (eventsThisMonth >= maxEvents) {
      alert(
        `You've reached your monthly event limit (${maxEvents}). Upgrade to create more.`,
      );
      navigate('/subscription');
      return;
    }
    navigate('/events/new');
  };

  const handleDelete = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Delete "${eventTitle}"? This cannot be undone.`)) return;
    setDeletingId(eventId);
    try {
      await deleteEvent.mutateAsync(eventId);
    } catch (err) {
      alert(`Failed to delete event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = (events || []).filter(
    (e) => !search || e.title.toLowerCase().includes(search.toLowerCase()),
  );

  const eventsThisMonth = stats?.eventsThisMonth || 0;
  const maxEvents = subscription?.max_events_per_month || 5;
  const upcomingCount = stats?.upcomingEvents || 0;
  const featuredSlots = subscription?.tier === 'Enterprise' ? 10 : subscription?.tier === 'Premium' ? 3 : 1;

  if (error) {
    return (
      <div className="bp2-card" style={{ padding: 32, textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Error loading events</h2>
        <p style={{ color: '#6B7280', fontSize: 13 }}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="bp2-page-eyebrow">
            {upcomingCount} upcoming · {eventsThisMonth} of {maxEvents} this month
          </div>
          <h1 className="bp2-page-title">Events</h1>
          <p className="bp2-page-sub">
            Create, publish, and track RSVPs for events at your venues. Featured events get
            promoted slots in the consumer app.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bp2-btn bp2-btn-secondary">
            <Calendar className="h-3.5 w-3.5" />
            Calendar view
          </button>
          <button
            className="bp2-btn bp2-btn-primary"
            onClick={handleCreateEvent}
            disabled={eventsThisMonth >= maxEvents}
          >
            <Plus className="h-3.5 w-3.5" />
            New event
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="bp2-card" style={{ padding: 18 }}>
          <div className="bp2-eyebrow">RSVPs this week</div>
          <div className="bp2-stat-num gold" style={{ marginTop: 6, fontSize: 28 }}>
            —
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Live counter</div>
        </div>
        <div className="bp2-card" style={{ padding: 18 }}>
          <div className="bp2-eyebrow">Sold out</div>
          <div className="bp2-stat-num" style={{ marginTop: 6, fontSize: 28 }}>
            0
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Mark an event sold out
          </div>
        </div>
        <div className="bp2-card" style={{ padding: 18 }}>
          <div className="bp2-eyebrow">Avg fill rate</div>
          <div className="bp2-stat-num" style={{ marginTop: 6, fontSize: 28 }}>
            68%
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Per event</div>
        </div>
        <div className="bp2-card" style={{ padding: 18 }}>
          <div className="bp2-eyebrow">Featured slots</div>
          <div className="bp2-stat-num" style={{ marginTop: 6, fontSize: 28 }}>
            0{' '}
            <span style={{ fontSize: 16, color: '#6B7280' }}>/ {featuredSlots}</span>
          </div>
          <div style={{ fontSize: 12, color: '#A16207', fontWeight: 700, marginTop: 4 }}>
            {subscription?.tier || 'Free'} tier
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        {FILTERS.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`bp2-btn ${filter === c ? 'bp2-btn-primary' : 'bp2-btn-secondary'}`}
            style={{ height: 32, padding: '0 14px', fontSize: 12 }}
          >
            {c}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="bp2-search" style={{ width: 280 }}>
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Event cards */}
      {isLoading ? (
        <div className="bp2-card" style={{ padding: 48, textAlign: 'center', color: '#6B7280' }}>
          Loading events…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bp2-card" style={{ padding: 48, textAlign: 'center' }}>
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
            {filter === 'Upcoming' ? 'No upcoming events' : 'No events yet'}
          </h2>
          <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 16 }}>
            {filter === 'Upcoming'
              ? "You don't have any upcoming events scheduled."
              : 'Get started by creating your first event.'}
          </p>
          <button className="bp2-btn bp2-btn-primary" onClick={handleCreateEvent}>
            <Plus className="h-3.5 w-3.5" />
            Create your first event
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((e) => {
            const status = getEventStatus(e.start_date, e.end_date, e.is_published);
            // Synthetic RSVP/cap for now — real counts plug in later
            const rsvps = 0;
            const cap = 250;
            const fillPct = Math.min(100, (rsvps / cap) * 100);
            const featured = false;
            return (
              <div
                key={e.id}
                className="bp2-card"
                style={{ overflow: 'hidden', display: 'flex', cursor: 'pointer' }}
                onClick={() => navigate(`/events/${e.id}`)}
              >
                <div
                  style={{
                    position: 'relative',
                    width: 200,
                    flexShrink: 0,
                    background: '#F3F4F6',
                  }}
                >
                  {e.featured_image_url ? (
                    <img
                      src={e.featured_image_url}
                      alt={e.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Calendar className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  {featured && (
                    <span
                      className="bp2-pill bp2-pill-gold"
                      style={{ position: 'absolute', top: 12, left: 12 }}
                    >
                      <Star className="h-3 w-3" />
                      Featured
                    </span>
                  )}
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#A16207',
                        }}
                      >
                        {formatDate(e.start_date)}
                      </span>
                      <span className={'bp2-pill ' + status.pill}>{status.label}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#18181B',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {e.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#6B7280',
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <MapPin className="h-3 w-3" />
                      {e.venue_name}
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: '#3F3F46', fontWeight: 600 }}>
                        <span style={{ color: '#A16207', fontWeight: 800 }}>{rsvps}</span> / {cap}{' '}
                        RSVPs
                      </span>
                      <span style={{ color: '#6B7280' }}>{Math.round(fillPct)}% full</span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: '#F3F4F6',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${fillPct}%`,
                          height: '100%',
                          background:
                            fillPct >= 100
                              ? 'linear-gradient(90deg, #F97316, #EA580C)'
                              : 'linear-gradient(90deg, #FDE047, #EAB308)',
                          boxShadow:
                            fillPct >= 90 ? '0 0 8px rgba(234,179,8,0.5)' : 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div
                  onClick={(ev) => ev.stopPropagation()}
                  style={{
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 8,
                    alignItems: 'flex-end',
                    borderLeft: '1px solid #F3F4F6',
                  }}
                >
                  <button
                    className="bp2-btn bp2-btn-ghost bp2-btn-icon"
                    onClick={() => handleDelete(e.id, e.title)}
                    disabled={deletingId === e.id}
                    aria-label="More"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  <button
                    className="bp2-btn bp2-btn-secondary"
                    onClick={() => navigate(`/events/${e.id}/edit`)}
                    style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                  >
                    Manage
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
