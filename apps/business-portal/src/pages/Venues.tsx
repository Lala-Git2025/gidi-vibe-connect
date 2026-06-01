import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Download, Search, MoreHorizontal } from 'lucide-react';
import { useVenues, useDeleteVenue } from '../hooks/useVenues';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';

const LAGOS_AREAS = ['All Lagos', 'Victoria Island', 'Lekki Phase 1', 'Ikoyi', 'Ikeja', 'Surulere'];

export default function Venues() {
  const navigate = useNavigate();
  const { subscription } = useBusinessAuth();
  const { data: venues, isLoading, error } = useVenues();
  const deleteVenue = useDeleteVenue();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeArea, setActiveArea] = useState('All Lagos');

  const handleCreateVenue = () => {
    const currentCount = venues?.length || 0;
    const maxVenues = subscription?.max_venues || 1;
    if (currentCount >= maxVenues) {
      alert(
        `You've reached your venue limit (${maxVenues} venue${
          maxVenues > 1 ? 's' : ''
        }). Upgrade your subscription to add more venues.`,
      );
      navigate('/subscription');
      return;
    }
    navigate('/venues/new');
  };

  const handleDelete = async (venueId: string, venueName: string) => {
    if (!confirm(`Delete "${venueName}"? This cannot be undone.`)) return;
    setDeletingId(venueId);
    try {
      await deleteVenue.mutateAsync(venueId);
    } catch (err) {
      alert(`Failed to delete venue: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = (venues || []).filter((v) => {
    const matchSearch =
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase());
    const matchArea = activeArea === 'All Lagos' || v.location.toLowerCase().includes(activeArea.toLowerCase());
    return matchSearch && matchArea;
  });

  const currentCount = venues?.length || 0;
  const promotedCount = (venues || []).filter((v) => v.is_promoted).length;
  const maxVenues = subscription?.max_venues || 1;

  if (error) {
    return (
      <div className="bp2-card" style={{ padding: 32, textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Error loading venues</h2>
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
            {currentCount} venue{currentCount === 1 ? '' : 's'} · {promotedCount} promoted
          </div>
          <h1 className="bp2-page-title">Your venues</h1>
          <p className="bp2-page-sub">
            Manage every venue you own across Lagos. Promoted venues appear in the consumer app's
            Trending Tonight feed.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bp2-btn bp2-btn-secondary">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            className="bp2-btn bp2-btn-primary"
            onClick={handleCreateVenue}
            disabled={currentCount >= maxVenues}
          >
            <Plus className="h-3.5 w-3.5" />
            New venue
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div className="bp2-search" style={{ width: 320 }}>
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search by name or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {LAGOS_AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setActiveArea(a)}
              className={`bp2-btn ${a === activeArea ? 'bp2-btn-primary' : 'bp2-btn-secondary'}`}
              style={{ height: 34, padding: '0 14px', fontSize: 12 }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Limit banner */}
      {currentCount >= maxVenues && subscription?.tier === 'Free' && (
        <div className="bp2-card-hero" style={{ padding: 16, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>Venue limit reached</p>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>
                Upgrade to Premium for up to 3 venues, or Enterprise for unlimited.
              </p>
            </div>
            <button className="bp2-btn bp2-btn-primary" onClick={() => navigate('/subscription')}>
              Upgrade Plan
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bp2-card" style={{ overflow: 'hidden', padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#6B7280' }}>
            Loading venues…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>No venues</h2>
            <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 16 }}>
              {venues?.length === 0
                ? 'Get started by creating your first venue listing.'
                : 'No venues match your filters.'}
            </p>
            {venues?.length === 0 && (
              <button className="bp2-btn bp2-btn-primary" onClick={handleCreateVenue}>
                <Plus className="h-3.5 w-3.5" />
                Create your first venue
              </button>
            )}
          </div>
        ) : (
          <table className="bp2-table">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Venue</th>
                <th>Area</th>
                <th>Category</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Photos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} onClick={() => navigate(`/venues/${v.id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {v.professional_media_urls && v.professional_media_urls.length > 0 ? (
                        <img
                          src={v.professional_media_urls[0]}
                          alt=""
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 9,
                            objectFit: 'cover',
                            background: '#F3F4F6',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 9,
                            background: 'linear-gradient(135deg,#EAB308,#F97316)',
                            boxShadow: '0 0 8px rgba(234,179,8,0.3)',
                          }}
                        />
                      )}
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#18181B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {v.name}
                          {v.is_promoted && (
                            <span className="bp2-pill bp2-pill-gold" style={{ fontSize: 9, padding: '2px 6px' }}>
                              Promoted
                            </span>
                          )}
                          {v.is_verified && (
                            <span className="bp2-pill bp2-pill-info" style={{ fontSize: 9, padding: '2px 6px' }}>
                              Verified
                            </span>
                          )}
                        </div>
                        {v.price_range && (
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                            {v.price_range}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: '#52525B' }}>{v.location}</td>
                  <td style={{ color: '#52525B' }}>{v.category}</td>
                  <td>
                    <span className={'bp2-pill ' + (v.is_verified ? 'bp2-pill-live' : 'bp2-pill-draft')}>
                      {v.is_verified ? 'Live' : 'Pending'}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                    }}
                  >
                    {v.professional_media_urls?.length || 0}
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="bp2-btn bp2-btn-ghost bp2-btn-icon"
                      onClick={() => handleDelete(v.id, v.name)}
                      disabled={deletingId === v.id}
                      aria-label="More"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
        }}
      >
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          Showing {filtered.length} of {currentCount} venues
        </div>
      </div>
    </div>
  );
}
