import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Trash2, X, Save, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { useVenues } from '../hooks/useVenues';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatDate } from '../lib/utils';

interface Offer {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed' | 'free_item' | 'other';
  discount_value: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
  venues?: { name: string };
}

interface OfferForm {
  venue_id: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed' | 'free_item' | 'other';
  discount_value: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

const EMPTY_FORM: OfferForm = {
  venue_id: '',
  title: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
  is_active: true,
};

const DISCOUNT_LABELS: Record<string, string> = {
  percentage: '% Off',
  fixed: 'Fixed Amount Off',
  free_item: 'Free Item',
  other: 'Other',
};

function useOffers() {
  const { user } = useBusinessAuth();
  return useQuery({
    queryKey: ['offers', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('venue_offers')
        .select('*, venues(name)')
        .in(
          'venue_id',
          (await supabase.from('venues').select('id').eq('owner_id', user.id)).data?.map((v) => v.id) ?? []
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Offer[];
    },
    enabled: !!user,
  });
}

function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (offer: OfferForm) => {
      const { data, error } = await supabase.from('venue_offers').insert(offer).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offers'] }),
  });
}

function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('venue_offers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offers'] }),
  });
}

function useToggleOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('venue_offers').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offers'] }),
  });
}

export default function Offers() {
  const { subscription } = useBusinessAuth();
  const canCreateOffers = subscription?.can_create_offers ?? false;
  const { data: offers, isLoading } = useOffers();
  const { data: venues } = useVenues();
  const createOffer = useCreateOffer();
  const deleteOffer = useDeleteOffer();
  const toggleOffer = useToggleOffer();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.venue_id) e.venue_id = 'Select a venue';
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.discount_value.trim()) e.discount_value = 'Enter a value';
    if (!form.valid_until) e.valid_until = 'End date is required';
    if (form.valid_until && form.valid_from > form.valid_until) e.valid_until = 'End must be after start';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await createOffer.mutateAsync(form);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!canCreateOffers) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Offers & Promotions</h1>
          <p className="text-muted-foreground mt-1">Create exclusive deals for your customers</p>
        </div>
        <Card className="border-yellow-500/30 bg-yellow-50/50">
          <CardContent className="py-12 text-center">
            <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Offers & Promotions are available on the Premium and Enterprise plans. Upgrade to create exclusive deals that appear on your venue profile in the app.
            </p>
            <Button onClick={() => window.location.href = '/subscription'} className="gap-2">
              <Tag className="w-4 h-4" />
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offers & Promotions</h1>
          <p className="text-muted-foreground mt-1">Create exclusive deals visible in the consumer app</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Offer
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">New Offer</CardTitle>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setErrors({}); }}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Venue *</label>
                <select
                  value={form.venue_id}
                  onChange={(e) => setForm({ ...form, venue_id: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select venue…</option>
                  {(venues || []).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                {errors.venue_id && <p className="text-xs text-destructive mt-1">{errors.venue_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Offer Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Happy Hour 50% Off"
                />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Discount Type</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(DISCOUNT_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Value *</label>
                <Input
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === 'percentage' ? 'e.g. 50' : form.discount_type === 'fixed' ? 'e.g. ₦2,000' : 'e.g. Free Cocktail'}
                />
                {errors.discount_value && <p className="text-xs text-destructive mt-1">{errors.discount_value}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Valid From</label>
                <Input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Valid Until *</label>
                <Input
                  type="date"
                  value={form.valid_until}
                  min={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
                {errors.valid_until && <p className="text-xs text-destructive mt-1">{errors.valid_until}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Additional details about this offer…"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={createOffer.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {createOffer.isPending ? 'Saving…' : 'Save Offer'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setErrors({}); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offers list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !offers || offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-1">No offers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first offer to attract customers in the app.</p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const expired = new Date(offer.valid_until) < new Date();
            return (
              <Card key={offer.id} className={expired ? 'opacity-60' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${offer.is_active && !expired ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {expired ? 'Expired' : offer.is_active ? 'Active' : 'Paused'}
                        </span>
                        <span className="text-xs text-muted-foreground">{offer.venues?.name}</span>
                      </div>
                      <p className="font-semibold truncate">{offer.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {DISCOUNT_LABELS[offer.discount_type]}: <strong>{offer.discount_value}</strong>
                        {offer.discount_type === 'percentage' && '%'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(offer.valid_from)} → {formatDate(offer.valid_until)}
                      </p>
                      {offer.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{offer.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!expired && (
                        <button
                          onClick={() => toggleOffer.mutate({ id: offer.id, is_active: !offer.is_active })}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${offer.is_active ? 'bg-primary' : 'bg-muted'}`}
                          title={offer.is_active ? 'Pause offer' : 'Activate offer'}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${offer.is_active ? 'translate-x-4.5' : 'translate-x-1'}`} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this offer?')) {
                            deleteOffer.mutate(offer.id);
                          }
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
