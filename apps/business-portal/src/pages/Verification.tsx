import { useState, useEffect } from 'react';
import { ShieldCheck, Hourglass, XCircle, Loader2 } from 'lucide-react';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { supabase } from '../lib/supabase';

interface VerificationRow {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const CATEGORIES = [
  'Restaurant', 'Bar / Lounge', 'Nightclub', 'Cafe', 'Hotel',
  'Event Venue', 'Music / Entertainment', 'Retail', 'Other',
];

export default function Verification() {
  const { user, profile } = useBusinessAuth();
  const [request, setRequest] = useState<VerificationRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCategory, setBusinessCategory] = useState(CATEGORIES[0]);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequest = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('verification_requests')
      .select('id, status, rejection_reason, created_at, reviewed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setRequest(data ?? null);
    setLoading(false);
  };

  useEffect(() => { fetchRequest(); }, [user]);

  // Pre-fill email from auth on first render
  useEffect(() => {
    if (user?.email && !businessEmail) setBusinessEmail(user.email);
    if (profile?.full_name && !businessName) setBusinessName('');
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('verification_requests').insert({
      user_id: user.id,
      business_name: businessName.trim(),
      business_email: businessEmail.trim(),
      business_phone: businessPhone.trim(),
      business_address: businessAddress.trim(),
      business_category: businessCategory,
      registration_number: registrationNumber.trim() || null,
      additional_info: additionalInfo.trim() || null,
      // status omitted → DB defaults to 'pending'
    });
    if (error) {
      alert(`Submit failed: ${error.message}`);
    } else {
      await fetchRequest();
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  }

  // Already submitted — show status
  if (request && request.status === 'pending') {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Verification</h1>
        <div className="bp2-card" style={{ padding: 32, textAlign: 'center' }}>
          <Hourglass className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="text-xl font-bold mt-3">Request under review</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Submitted {new Date(request.created_at).toLocaleString()}. An admin
            will review and respond shortly. The verified badge appears across
            the platform once approved.
          </p>
        </div>
      </div>
    );
  }

  if (request && request.status === 'approved') {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Verification</h1>
        <div className="bp2-card" style={{ padding: 32, textAlign: 'center' }}>
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="text-xl font-bold mt-3">Verified</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Approved {request.reviewed_at && new Date(request.reviewed_at).toLocaleString()}.
            Your verified badge is live across the platform.
          </p>
        </div>
      </div>
    );
  }

  // No request yet OR last one was rejected — show form
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Get verified</h1>
        <p className="text-muted-foreground mt-1">
          Submit your business details below. An admin will review and approve
          your verification, after which the verified badge appears on your
          profile across the platform.
        </p>
      </div>

      {request && request.status === 'rejected' && request.rejection_reason && (
        <div className="bp2-card" style={{ padding: 16, borderColor: '#ef4444' }}>
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Previous submission was rejected</p>
              <p className="text-sm text-muted-foreground mt-1">
                Reason: {request.rejection_reason}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Fix the issue and resubmit below.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bp2-card" style={{ padding: 24 }}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="bp2-label">Business name *</label>
            <input
              required
              className="bp2-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="bp2-label">Business email *</label>
              <input
                required
                type="email"
                className="bp2-input"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="bp2-label">Phone *</label>
              <input
                required
                className="bp2-input"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="bp2-label">Address *</label>
            <input
              required
              className="bp2-input"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="bp2-label">Category *</label>
              <select
                className="bp2-input"
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="bp2-label">Registration / RC number</label>
              <input
                className="bp2-input"
                placeholder="Optional"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="bp2-label">Anything else the reviewer should know?</label>
            <textarea
              className="bp2-input"
              rows={3}
              placeholder="Optional"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="bp2-btn bp2-btn-primary"
            disabled={submitting}
            style={{ alignSelf: 'flex-start' }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for review'}
          </button>
        </div>
      </form>
    </div>
  );
}
