import { useState, useEffect } from 'react';
import { Star, X, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';

interface PromotedVenue {
  id: string;
  name: string;
  location: string;
  category: string;
  is_promoted: boolean;
  promoted_until: string | null;
  promotion_label: string | null;
}

export default function PromotionsManager() {
  const [venues, setVenues] = useState<PromotedVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchPromoted = async () => {
    const { data } = await supabase
      .from('venues')
      .select('id, name, location, category, is_promoted, promoted_until, promotion_label')
      .eq('is_promoted', true)
      .order('promoted_until', { ascending: true });
    setVenues((data as PromotedVenue[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPromoted(); }, []);

  const handleRemove = async (venueId: string) => {
    setSavingId(venueId);
    await supabase.from('venues').update({ is_promoted: false, promoted_until: null }).eq('id', venueId);
    await fetchPromoted();
    setSavingId(null);
  };

  const now = new Date();
  const active = venues.filter(v => !v.promoted_until || new Date(v.promoted_until) > now);
  const expired = venues.filter(v => v.promoted_until && new Date(v.promoted_until) <= now);

  const daysLeft = (v: PromotedVenue) =>
    v.promoted_until ? Math.max(0, Math.ceil((new Date(v.promoted_until).getTime() - now.getTime()) / 86400000)) : null;

  const PromotionRow = ({ venue, isExpired }: { venue: PromotedVenue; isExpired?: boolean }) => (
    <div className={`py-4 flex items-center gap-4 ${isExpired ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{venue.name}</p>
          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${isExpired ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
            {venue.promotion_label || 'Sponsored'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{venue.location} · {venue.category}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isExpired
            ? `Expired ${venue.promoted_until ? new Date(venue.promoted_until).toLocaleDateString() : ''}`
            : venue.promoted_until
            ? `Expires ${new Date(venue.promoted_until).toLocaleDateString()} · ${daysLeft(venue)} days left`
            : 'No expiry set'}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleRemove(venue.id)}
        disabled={savingId === venue.id}
        className="flex-shrink-0 text-destructive border-destructive hover:bg-destructive hover:text-white"
      >
        {savingId === venue.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
        Remove
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promotions Manager</h1>
        <p className="text-muted-foreground mt-1">All paid trending slots across the platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Slots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{loading ? '—' : active.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expired (cleanup needed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{loading ? '—' : expired.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Next Expiry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading || active.length === 0 ? '—' : `${daysLeft(active[0])}d`}
            </div>
            {active[0] && <p className="text-xs text-muted-foreground mt-1">{active[0].name}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Active Promotions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : active.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No active promotions. Go to Venue Manager to promote a venue.</p>
            </div>
          ) : (
            <div className="divide-y">{active.map(v => <PromotionRow key={v.id} venue={v} />)}</div>
          )}
        </CardContent>
      </Card>

      {expired.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-sm text-destructive">Expired Promotions (still flagged is_promoted=true)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">{expired.map(v => <PromotionRow key={v.id} venue={v} isExpired />)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
