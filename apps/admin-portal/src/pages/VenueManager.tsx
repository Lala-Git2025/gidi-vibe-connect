import { useState, useEffect } from 'react';
import { Search, TrendingUp, X, Loader2, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';

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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [promotionDays, setPromotionDays] = useState<Record<string, string>>({});

  const fetchVenues = async () => {
    const { data } = await supabase
      .from('venues')
      .select('id, name, location, category, rating, is_promoted, promoted_until, promotion_label, owner_id')
      .order('is_promoted', { ascending: false })
      .order('name');
    setVenues((data as VenueRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchVenues(); }, []);

  const handlePromote = async (venue: VenueRow, active: boolean) => {
    setSavingId(venue.id);
    const days = parseInt(promotionDays[venue.id] ?? '30', 10);
    const update = active
      ? { is_promoted: true, promoted_until: new Date(Date.now() + days * 86400000).toISOString(), promotion_label: 'Sponsored' }
      : { is_promoted: false, promoted_until: null };
    await supabase.from('venues').update(update).eq('id', venue.id);
    await fetchVenues();
    setSavingId(null);
  };

  const filtered = venues.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.location.toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  const isActivePromo = (v: VenueRow) => v.is_promoted && (!v.promoted_until || new Date(v.promoted_until) > now);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venue Manager</h1>
          <p className="text-muted-foreground mt-1">Manage all venues across the platform</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {venues.filter(isActivePromo).length} promoted · {venues.length} total
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Venues
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No venues found</p>
          ) : (
            <div className="divide-y">
              {filtered.map((venue) => {
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
