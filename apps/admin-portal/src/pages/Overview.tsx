import { useEffect, useState } from 'react';
import { Users, Building2, TrendingUp, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '../lib/supabase';

interface PlatformStats {
  totalUsers: number;
  totalVenues: number;
  activePromotions: number;
  newUsersThisWeek: number;
}

function StatCard({ title, value, icon: Icon, sub }: { title: string; value: number | string; icon: React.ElementType; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const [stats, setStats] = useState<PlatformStats>({ totalUsers: 0, totalVenues: 0, activePromotions: 0, newUsersThisWeek: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [usersRes, venuesRes, promoRes, newUsersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('venues').select('id', { count: 'exact', head: true }),
        supabase.from('venues').select('id', { count: 'exact', head: true }).eq('is_promoted', true).gt('promoted_until', new Date().toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      setStats({
        totalUsers: usersRes.count ?? 0,
        totalVenues: venuesRes.count ?? 0,
        activePromotions: promoRes.count ?? 0,
        newUsersThisWeek: newUsersRes.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Platform-wide stats and controls</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={loading ? '—' : stats.totalUsers} icon={Users} sub="All registered accounts" />
        <StatCard title="Total Venues" value={loading ? '—' : stats.totalVenues} icon={Building2} sub="Across all businesses" />
        <StatCard title="Active Promotions" value={loading ? '—' : stats.activePromotions} icon={Star} sub="Paid trending slots" />
        <StatCard title="New Users (7d)" value={loading ? '—' : stats.newUsersThisWeek} icon={TrendingUp} sub="This week's signups" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a href="/venues" className="p-4 border rounded-lg hover:bg-accent transition-colors block">
              <Building2 className="h-6 w-6 mb-2 text-primary" />
              <h3 className="font-semibold">Manage Venues</h3>
              <p className="text-sm text-muted-foreground">View, promote, or flag any venue</p>
            </a>
            <a href="/promotions" className="p-4 border rounded-lg hover:bg-accent transition-colors block">
              <Star className="h-6 w-6 mb-2 text-primary" />
              <h3 className="font-semibold">Active Promotions</h3>
              <p className="text-sm text-muted-foreground">Track all paid trending slots</p>
            </a>
            <a href="/users" className="p-4 border rounded-lg hover:bg-accent transition-colors block">
              <Users className="h-6 w-6 mb-2 text-primary" />
              <h3 className="font-semibold">User Management</h3>
              <p className="text-sm text-muted-foreground">Manage roles and accounts</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
