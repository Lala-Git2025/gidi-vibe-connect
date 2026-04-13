import {
  Users, Building2, Calendar, TrendingUp, Star, MapPin,
  CheckCircle, MessageSquare, Loader2, Activity,
  UserPlus, Navigation, Ticket
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import {
  useOverviewStats,
  useUserGrowth,
  useRoleBreakdown,
  useVenuesByArea,
  useVenuesByCategory,
  useTopVenues,
  useTierBreakdown,
  useTopEvents,
  useRecentActivity,
} from '../hooks/useAnalytics';

// ── Colors ───────────────────────────────────────────────

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

const ROLE_COLORS: Record<string, string> = {
  'Consumer': '#6366f1',
  'Business Owner': '#3b82f6',
  'Content Creator': '#a855f7',
  'Admin': '#f59e0b',
  'Super Admin': '#ef4444',
};

const ACTIVITY_ICONS = {
  signup: UserPlus,
  checkin: Navigation,
  rsvp: Ticket,
  review: MessageSquare,
};

const ACTIVITY_COLORS = {
  signup: 'text-green-500',
  checkin: 'text-blue-500',
  rsvp: 'text-purple-500',
  review: 'text-amber-500',
};

// ── Stat Card ────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, sub, loading }: {
  title: string; value: number | string; icon: React.ElementType; sub?: string; loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value.toLocaleString()}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Section loader ───────────────────────────────────────

function SectionLoader() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ── Time ago helper ──────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Main Analytics Page ──────────────────────────────────

export default function Analytics() {
  const { stats, loading: statsLoading } = useOverviewStats();
  const { data: growthData, loading: growthLoading } = useUserGrowth();
  const { data: roleData, loading: roleLoading } = useRoleBreakdown();
  const { data: areaData, loading: areaLoading } = useVenuesByArea();
  const { data: categoryData, loading: categoryLoading } = useVenuesByCategory();
  const { data: topVenues, loading: venuesLoading } = useTopVenues();
  const { data: tierData, loading: tierLoading } = useTierBreakdown();
  const { data: topEvents, loading: eventsLoading } = useTopEvents();
  const { data: recentActivity, loading: activityLoading } = useRecentActivity();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform-wide insights and performance metrics</p>
      </div>

      {/* ── Overview Cards ────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} sub="All registered accounts" loading={statsLoading} />
        <StatCard title="Monthly Active" value={stats?.monthlyActiveUsers ?? 0} icon={Activity} sub="Active in last 30 days" loading={statsLoading} />
        <StatCard title="Total Venues" value={stats?.totalVenues ?? 0} icon={Building2} sub="Across all businesses" loading={statsLoading} />
        <StatCard title="Total Events" value={stats?.totalEvents ?? 0} icon={Calendar} sub="All events on platform" loading={statsLoading} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Promotions" value={stats?.activePromotions ?? 0} icon={Star} sub="Paid trending slots" loading={statsLoading} />
        <StatCard title="Total Check-ins" value={stats?.totalCheckIns ?? 0} icon={CheckCircle} sub="All-time venue check-ins" loading={statsLoading} />
        <StatCard title="Total RSVPs" value={stats?.totalRSVPs ?? 0} icon={TrendingUp} sub="Event RSVPs" loading={statsLoading} />
        <StatCard title="Total Reviews" value={stats?.totalReviews ?? 0} icon={MessageSquare} sub="Venue reviews" loading={statsLoading} />
      </div>

      {/* ── Row 1: User Growth + Users by Role ────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              User Growth (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {growthLoading ? <SectionLoader /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} name="Signups" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roleLoading ? <SectionLoader /> : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={roleData}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                    >
                      {roleData.map((entry) => (
                        <Cell key={entry.role} fill={ROLE_COLORS[entry.role] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {roleData.map((r) => (
                    <div key={r.role} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ROLE_COLORS[r.role] || '#94a3b8' }} />
                        <span>{r.role}</span>
                      </div>
                      <span className="font-medium">{r.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Venues by Area + Venues by Category ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Venues by Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaLoading ? <SectionLoader /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={areaData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="area" type="category" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Venues" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Venues by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryLoading ? <SectionLoader /> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ category, count }) => `${category} (${count})`}
                    labelLine
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Top 10 Venues + Top Events by RSVPs ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top 10 Trending Venues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {venuesLoading ? <SectionLoader /> : topVenues.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No venue data yet</p>
            ) : (
              <div className="space-y-3">
                {topVenues.map((venue, i) => (
                  <div key={venue.id} className="flex items-center gap-3">
                    <span className={`text-sm font-bold w-6 text-center ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{venue.name}</p>
                      <p className="text-xs text-muted-foreground">{venue.location} · {venue.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium">★ {venue.rating}</p>
                      <p className="text-xs text-muted-foreground">
                        {venue.checkins_24h} today · {venue.checkins_7d} this week
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Top Events by RSVPs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? <SectionLoader /> : topEvents.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No RSVP data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topEvents.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="title" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="rsvp_count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="RSVPs" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Business Tiers + Recent Activity ───── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Business Subscription Tiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tierLoading ? <SectionLoader /> : tierData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No subscription data yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={tierData}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                    >
                      {tierData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {tierData.map((t, i) => (
                    <div key={t.tier} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span>{t.tier}</span>
                      </div>
                      <span className="font-medium">{t.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? <SectionLoader /> : recentActivity.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto">
                {recentActivity.map((item, i) => {
                  const Icon = ACTIVITY_ICONS[item.type];
                  const colorClass = ACTIVITY_COLORS[item.type];
                  return (
                    <div key={i} className="flex items-start gap-3 py-2">
                      <div className={`mt-0.5 ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{item.user_name}</span>{' '}
                          <span className="text-muted-foreground">{item.detail}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo(item.time)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
