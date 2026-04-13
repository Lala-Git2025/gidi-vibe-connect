import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, X, Loader2, Building2, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';

const LAGOS_AREAS = [
  'Victoria Island', 'Lekki', 'Ikoyi', 'Ikeja', 'Yaba', 'Surulere'
];

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
      .select('id, name, location, category, rating, is_promoted, promoted_until, promotion_label, owner_id', { count: 'exact' });

    // Server-side area filter
    if (selectedArea) {
      query = query.ilike('location', `%${selectedArea}%`);
    }

    // Server-side search
    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
    }

    const { data, count } = await query
      .order('is_promoted', { ascending: false })
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setVenues((data as VenueRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, selectedArea]);

  // Fetch area counts once on mount (lightweight count query)
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
      })
    );

    setAreaCounts(counts);
  }, []);

  useEffect(() => { fetchAreaCounts(); }, [fetchAreaCounts]);
  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  // Reset to first page when filters change
  useEffect(() => { setPage(0); }, [search, selectedArea]);

  const handlePromote = async (venue: VenueRow, active: boolean) => {
    setSavingId(venue.id);
    const days = parseInt(promotionDays[venue.id] ?? '30', 10);
    const update = active
      ? { is_promoted: true, promoted_until: new Date(Date.now() + days * 86400000).toISOString(), promotion_label: 'Sponsored' }
      : { is_promoted: false, promoted_until: null };
    await supabase.from('venues').update(update).eq('id', venue.id);
    await fetchVenues();
    await fetchAreaCounts();
    setSavingId(null);
  };

  const now = new Date();
  const isActivePromo = (v: VenueRow) => v.is_promoted && (!v.promoted_until || new Date(v.promoted_until) > now);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venue Manager</h1>
          <p className="text-muted-foreground mt-1">Manage all venues across the platform</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {areaCounts._total ?? 0} total venues
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search venues..."
          className="w-full pl-9 pr-4 py-2 border rounded-md text-sm bg-background"
        />
      </div>

      {/* Location Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => setSelectedArea(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !selectedArea
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All ({areaCounts._total ?? 0})
        </button>
        {LAGOS_AREAS.map((area) => (
          <button
            key={area}
            onClick={() => setSelectedArea(selectedArea === area ? null : area)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedArea === area
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {area} ({areaCounts[area] ?? 0})
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {selectedArea ? `${selectedArea} Venues` : 'All Venues'} ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : venues.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No venues found</p>
          ) : (
            <>
              <div className="divide-y">
                {venues.map((venue) => {
                  const active = isActivePromo(venue);
                  const daysLeft = venue.promoted_until
                    ? Math.max(0, Math.ceil((new Date(venue.promoted_until).getTime() - now.getTime()) / 86400000))
                    : null;
                  return (
                    <div key={venue.id} className="py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{venue.name}</p>
                          {active && (
                            <span className="flex-shrink-0 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                              Sponsored {daysLeft !== null ? `· ${daysLeft}d left` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{venue.location} · {venue.category} · ★ {venue.rating}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!active && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={promotionDays[venue.id] ?? '30'}
                              onChange={(e) => setPromotionDays(prev => ({ ...prev, [venue.id]: e.target.value }))}
                              className="w-16 border rounded-md px-2 py-1 text-xs bg-background text-center"
                            />
                            <span className="text-xs text-muted-foreground">days</span>
                          </div>
                        )}
                        {active ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePromote(venue, false)}
                            disabled={savingId === venue.id}
                            className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                          >
                            {savingId === venue.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handlePromote(venue, true)}
                            disabled={savingId === venue.id}
                          >
                            {savingId === venue.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                            Promote
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => p - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
