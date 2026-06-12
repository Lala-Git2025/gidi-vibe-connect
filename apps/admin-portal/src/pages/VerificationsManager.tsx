import { useState, useEffect } from 'react';
import { ShieldCheck, X, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';

interface VerificationRequest {
  id: string;
  user_id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  business_category: string;
  registration_number: string | null;
  additional_info: string | null;
  identity_document_url: string | null;
  business_document_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export default function VerificationsManager() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setRequests((data as VerificationRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc('approve_verification', { p_request_id: id });
    if (error) alert(`Approve failed: ${error.message}`);
    else await fetchRequests();
    setBusyId(null);
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectingId) return;
    const reason = rejectReason.trim();
    if (!reason) { alert('Please enter a rejection reason.'); return; }
    setBusyId(rejectingId);
    const { error } = await supabase.rpc('reject_verification', {
      p_request_id: rejectingId,
      p_reason: reason,
    });
    if (error) alert(`Reject failed: ${error.message}`);
    else {
      setRejectingId(null);
      setRejectReason('');
      await fetchRequests();
    }
    setBusyId(null);
  };

  const pending = requests.filter(r => r.status === 'pending');
  const recent = requests.filter(r => r.status !== 'pending').slice(0, 20);

  const Row = ({ r, allowActions }: { r: VerificationRequest; allowActions: boolean }) => (
    <div className="py-4 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{r.business_name}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {r.business_category}
            </span>
            {r.status === 'approved' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-medium">
                Approved
              </span>
            )}
            {r.status === 'rejected' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">
                Rejected
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1 flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{r.business_email}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{r.business_phone}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{r.business_address}</span>
          </div>
          {r.registration_number && (
            <p className="text-xs text-muted-foreground mt-1">
              Reg #: {r.registration_number}
            </p>
          )}
          {r.additional_info && (
            <p className="text-xs mt-2 italic">"{r.additional_info}"</p>
          )}
          {r.status === 'rejected' && r.rejection_reason && (
            <p className="text-xs text-destructive mt-2">Reason: {r.rejection_reason}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Submitted {new Date(r.created_at).toLocaleString()}
          </p>
        </div>

        {allowActions && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={() => handleApprove(r.id)}
              disabled={busyId === r.id || rejectingId === r.id}
            >
              {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRejectClick(r.id)}
              disabled={busyId === r.id}
              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
            >
              <X className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {rejectingId === r.id && (
        <div className="mt-3 p-3 rounded-md border bg-muted/30 flex flex-col gap-2">
          <input
            autoFocus
            type="text"
            className="bp2-input"
            placeholder="Rejection reason (visible to the owner)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRejectSubmit}
              disabled={!rejectReason.trim() || busyId === r.id}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm Reject'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verifications</h1>
        <p className="text-muted-foreground mt-1">
          Approve or reject business verification requests. Approving flips the
          owner's verified badge across the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending — {pending.length}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No pending requests.</p>
          ) : (
            pending.map(r => <Row key={r.id} r={r} allowActions />)
          )}
        </CardContent>
      </Card>

      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recently reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.map(r => <Row key={r.id} r={r} allowActions={false} />)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
