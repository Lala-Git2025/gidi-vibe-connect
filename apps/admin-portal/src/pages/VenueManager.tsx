import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  TrendingUp,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Rocket,
  MoreHorizontal,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const LAGOS_AREAS = ['Victoria Island', 'Lekki', 'Ikoyi', 'Ikeja', 'Yaba', 'Surulere'];
const PAGE_SIZE = 25;

interface VenueRow {
  id: string;
  name: string;
  location: string;
  category: string;
  rating: number;
  is_promoted: boolean;
  promoted_until: string | null;
  promotion_label: string | null;
  owner_id: string;
}

export default function VenueManager() {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [promotionDays, setPromotionDays] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [areaCounts, setAreaCounts] = useState<Record<string, number>>({});

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('venues')
      .select(
        'id, name, location, category, rating, is_promoted, promoted_until, promotion_label, owner_id',
        { count: 'exact' },
      );
    if (selectedArea) query = query.ilike('location', `%${selectedArea}%`);
    if (search) query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);

    const { data, count } = await query
      .order('is_promoted', { ascending: false })
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setVenues((data as VenueRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, selectedArea]);

  const fetchAreaCounts = useCallback(async () => {
    const { count: total } = await supabase
      .from('venues')
      .select('id', { count: 'exact', head: true });
    const counts: Record<string, number> = { _total: total ?? 0 };
    await Promise.all(
      LAGOS_AREAS.map(async (area) => {
        const { count } = await supabase
          .from('venues')
          .select('id', { count: 'exact', head: true })
          .ilike('location', `%${area}%`);
        counts[area] = count ?? 0;
      }),
    );
    setAreaCounts(counts);
  }, []);

  useEffect(() => {
    fetchAreaCounts();
  }, [fetchAreaCounts]);
  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);
  useEffect(() => {
    setPage(0);
  }, [search, selectedArea]);

  const handlePromote = async (venue: VenueRow, active: boolean) => {
    setSavingId(venue.id);
    const days = parseInt(promotionDays[venue.id] ?? '30', 10);
    const update = active
      ? {
          is_promoted: true,
          promoted_until: new Date(Date.now() + days * 86400000).toISOString(),
          promotion_label: 'Sponsored',
        }
      : { is_promoted: false, promoted_until: null };
    await supabase.from('venues').update(update).eq('id', venue.id);
    await fetchVenues();
    await fetchAreaCounts();
    setSavingId(null);
  };

  const now = new Date();
  const isActivePromo = (v: VenueRow) =>
    v.is_promoted && (!v.promoted_until || new Date(v.promoted_until) > now);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const promotedCount = venues.filter(isActivePromo).length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 22,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="ap-page-eyebrow">
            Venue manager · {areaCounts._total ?? 0} venues across Lagos
          </div>
          <h1 className="ap-page-title">Venue curation</h1>
          <p className="ap-page-sub">
            Promote any venue to the consumer app's Trending Tonight feed. Set the badge label,
            pick a duration, monitor live performance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ap-btn ap-btn-secondary">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button className="ap-btn ap-btn-primary">
            <Rocket className="h-3.5 w-3.5" />
            Bulk promote
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div className="ap-card-hot" style={{ padding: 16 }}>
          <div className="ap-eyebrow">Currently promoted</div>
          <div className="ap-stat-num orange" style={{ marginTop: 6, fontSize: 28 }}>
            {promotedCount}
          </div>
          <div style={{ fontSize: 11, color: '#A16207', fontWeight: 700, marginTop: 4 }}>
            Active on consumer app
          </div>
        </div>
        <div className="ap-card" style={{ padding: 16 }}>
          <div className="ap-eyebrow">Total venues</div>
          <div className="ap-stat-num" style={{ marginTop: 6, fontSize: 28 }}>
            {(areaCounts._total ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Across all Lagos</div>
        </div>
        <div className="ap-card" style={{ padding: 16 }}>
          <div className="ap-eyebrow">In review</div>
          <div className="ap-stat-num" style={{ marginTop: 6, fontSize: 28 }}>
            —
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Pending approval</div>
        </div>
        <div className="ap-card" style={{ padding: 16 }}>
          <div className="ap-eyebrow">Avg rating</div>
          <div className="ap-stat-num" style={{ marginTop: 6, fontSize: 28 }}>
            {venues.length
              ? (
                  venues.reduce((s, v) => s + (v.rating || 0), 0) / venues.length
                ).toFixed(1)
              : '—'}
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>This page</div>
        </div>
      </div>

      {/* Filter strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div className="ap-search" style={{ width: 300 }}>
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search venues, owners, categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedArea(null)}
            className={'ap-btn ' + (!selectedArea ? 'ap-btn-primary' : 'ap-btn-secondary')}
            style={{ height: 30, padding: '0 12px', fontSize: 11 }}
          >
            All Lagos ({areaCounts._total ?? 0})
          </button>
          {LAGOS_AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setSelectedArea(selectedArea === a ? null : a)}
              className={'ap-btn ' + (selectedArea === a ? 'ap-btn-primary' : 'ap-btn-secondary')}
              style={{ height: 30, padding: '0 12px', fontSize: 11 }}
            >
              {a} ({areaCounts[a] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="ap-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : venues.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#6B7280' }}>
            No venues found
          </div>
        ) : (
          <table className="ap-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Venue</th>
                <th>Area</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Rating</th>
                <th>Promo badge</th>
                <th>Expires</th>
                <th>Actions</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {venues.map((v) => {
                const active = isActivePromo(v);
                const daysLeft = v.promoted_until
                  ? Math.max(
                      0,
                      Math.ceil(
                        (new Date(v.promoted_until).getTime() - now.getTime()) / 86400000,
                      ),
                    )
                  : null;
                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: 'linear-gradient(135deg,#EAB308,#F97316)',
                          }}
                        />
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
                          </div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                            id: {v.id.slice(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#52525B' }}>{v.location}</td>
                    <td style={{ color: '#52525B' }}>{v.category}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {v.rating > 0 ? (
                        <>★ {v.rating}</>
                      ) : (
                        <span style={{ color: '#D4D4D8' }}>—</span>
                      )}
                    </td>
                    <td>
                      {active ? (
                        <span className="ap-pill ap-pill-promo" style={{ fontSize: 10 }}>
                          {v.promotion_label || 'Sponsored'}
                        </span>
                      ) : (
                        <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        color: daysLeft != null ? '#A16207' : '#9CA3AF',
                        fontSize: 12,
                        fontWeight: daysLeft != null ? 700 : 400,
                      }}
                    >
                      {daysLeft != null ? `in ${daysLeft}d` : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {!active && (
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={promotionDays[v.id] ?? '30'}
                            onChange={(e) =>
                              setPromotionDays((prev) => ({ ...prev, [v.id]: e.target.value }))
                            }
                            style={{
                              width: 50,
                              border: '1px solid #E5E7EB',
                              borderRadius: 6,
                              padding: '4px 6px',
                              fontSize: 11,
                              textAlign: 'center',
                            }}
                          />
                        )}
                        {active ? (
                          <button
                            className="ap-btn ap-btn-danger"
                            style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                            onClick={() => handlePromote(v, false)}
                            disabled={savingId === v.id}
                          >
                            {savingId === v.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            Remove
                          </button>
                        ) : (
                          <button
                            className="ap-btn ap-btn-primary"
                            style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                            onClick={() => handlePromote(v, true)}
                            disabled={savingId === v.id}
                          >
                            {savingId === v.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <TrendingUp className="h-3 w-3" />
                            )}
                            Promote
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="ap-btn ap-btn-ghost ap-btn-icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
          }}
        >
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of{' '}
            {totalCount} · page {page + 1} / {totalPages}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="ap-btn ap-btn-secondary ap-btn-icon"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span
              style={{
                fontSize: 12,
                color: '#6B7280',
                alignSelf: 'center',
                padding: '0 10px',
              }}
            >
              Page {page + 1}
            </span>
            <button
              className="ap-btn ap-btn-secondary ap-btn-icon"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
