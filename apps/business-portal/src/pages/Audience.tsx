import { Users, Star, MapPin, Calendar, Download, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAudience, type AudienceMember } from '../hooks/useAudience';
import { StatCard } from '../components/ui/stat-card';
import { downloadCsv, datedFilename } from '../lib/csv';

/**
 * Who is engaging with this owner's venues and events.
 *
 * The sidebar linked here before this file existed, so the item rendered a
 * blank screen under the layout. Everything shown is derived from data the
 * platform already had: venue_check_ins, venue_reviews and event_rsvps.
 *
 * No contact details, by design. See the note in useAudience.ts.
 */

const timeAgo = (iso: string): string => {
  if (!iso) return '—';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

const initialsOf = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

export default function Audience() {
  const navigate = useNavigate();
  const { data, isLoading } = useAudience();

  const handleExport = () => {
    downloadCsv<AudienceMember>(
      datedFilename('gidi-audience'),
      [
        { header: 'Name', value: m => m.name },
        { header: 'Check-ins', value: m => m.checkIns },
        { header: 'Reviews', value: m => m.reviews },
        { header: 'RSVPs', value: m => m.rsvps },
        { header: 'Last seen', value: m => m.lastSeen },
        { header: 'Last action', value: m => m.lastAction },
      ],
      data?.members ?? [],
    );
  };

  const members = data?.members ?? [];

  return (
    <div style={{ padding: '4px 0' }}>
      <div
        style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginBottom: 26, gap: 16, flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="bp2-page-eyebrow">Growth</div>
          <h1 className="bp2-page-title">Audience</h1>
          <p className="bp2-page-sub">
            The people checking in, reviewing and RSVP'ing across your venues and events.
          </p>
        </div>
        <button
          className="bp2-btn bp2-btn-secondary"
          onClick={handleExport}
          disabled={members.length === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16, marginBottom: 20,
        }}
      >
        <StatCard
          hero
          title="People reached"
          value={isLoading ? '—' : (data?.totalPeople ?? 0).toLocaleString()}
          sub="unique visitors"
          icon={Users}
        />
        <StatCard
          title="Repeat visitors"
          value={isLoading ? '—' : (data?.repeatVisitors ?? 0).toLocaleString()}
          sub="checked in more than once"
          icon={Repeat}
        />
        <StatCard
          title="Reviews"
          value={isLoading ? '—' : (data?.totalReviews ?? 0).toLocaleString()}
          sub={data?.averageRating != null ? `${data.averageRating}★ average` : 'no ratings yet'}
          icon={Star}
        />
        <StatCard
          title="RSVPs"
          value={isLoading ? '—' : (data?.totalRsvps ?? 0).toLocaleString()}
          sub="across your events"
          icon={Calendar}
        />
      </div>

      <div className="bp2-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F1F0' }}>
          <div className="bp2-section-title">Most engaged</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Ranked by activity across your venues — reviews count heaviest, then RSVPs, then check-ins.
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
            Loading your audience…
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Users className="h-10 w-10" color="#D4D4D8" style={{ margin: '0 auto 14px' }} />
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No activity yet</div>
            <div style={{ fontSize: 13, color: '#6B7280', maxWidth: 420, margin: '0 auto 18px' }}>
              Once people check in, review or RSVP through the Gidi Connect app, they appear here.
              Published venues with photos and an up-to-date profile get found first.
            </div>
            <button className="bp2-btn bp2-btn-primary" onClick={() => navigate('/venues')}>
              Review your venues
            </button>
          </div>
        ) : (
          <div className="bp2-table-wrap">
            <table className="bp2-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Check-ins</th>
                  <th>Reviews</th>
                  <th>RSVPs</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.user_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt=""
                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'linear-gradient(135deg,#FDE047,#EAB308)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 800, color: '#18181B', flexShrink: 0,
                            }}
                          >
                            {initialsOf(m.name)}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                          <div
                            style={{
                              fontSize: 11, color: '#9CA3AF',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              maxWidth: 280,
                            }}
                          >
                            {m.lastAction}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <MapPin className="h-3.5 w-3.5" color="#22C55E" />
                        {m.checkIns}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Star className="h-3.5 w-3.5" color="#EAB308" />
                        {m.reviews}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Calendar className="h-3.5 w-3.5" color="#3B82F6" />
                        {m.rsvps}
                      </span>
                    </td>
                    <td style={{ color: '#6B7280' }}>{timeAgo(m.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
