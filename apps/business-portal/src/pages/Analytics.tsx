import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Phone, Globe, Repeat, Lock, Download, Filter } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { useAnalytics, getDefaultDateRange, type DateRange } from '../hooks/useAnalytics';
import { DateRangePicker } from '../components/analytics/DateRangePicker';
import { formatDate } from '../lib/utils';
import { StatCard } from '../components/ui/stat-card';

const CHART_COLORS = ['#EAB308', '#10B981', '#3B82F6', '#A855F7', '#EC4899'];

export default function Analytics() {
  const navigate = useNavigate();
  const { subscription } = useBusinessAuth();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const { data: analytics, isLoading, error } = useAnalytics(dateRange);

  if (!subscription?.can_view_analytics) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="bp2-card-hero" style={{ maxWidth: 480, padding: 32, textAlign: 'center' }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#FDE047,#EAB308)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 16px rgba(234,179,8,0.5)',
            }}
          >
            <Lock className="h-7 w-7" color="#18181B" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Premium feature</h2>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 18 }}>
            Analytics dashboard is available on Premium and Enterprise plans.
          </p>
          <button className="bp2-btn bp2-btn-primary" onClick={() => navigate('/subscription')}>
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bp2-card" style={{ padding: 32, textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Error loading analytics</h2>
        <p style={{ color: '#6B7280', fontSize: 13 }}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  const engagementData = analytics
    ? [
        { name: 'Phone Calls',    value: analytics.totalPhoneClicks },
        { name: 'Website Visits', value: analytics.totalWebsiteClicks },
        { name: 'Directions',     value: analytics.totalDirectionClicks },
        { name: 'Offer Clicks',   value: analytics.totalOfferClicks },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div>
      {/* Header */}
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
          <div className="bp2-page-eyebrow">All venues · {subscription?.tier || 'Premium'} tier</div>
          <h1 className="bp2-page-title">Analytics</h1>
          <p className="bp2-page-sub">
            How your venues are performing across Lagos. Drill into a specific venue from the
            dropdown, or export the raw data.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="bp2-card" style={{ padding: '6px 12px' }}>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
          <button className="bp2-btn bp2-btn-secondary">
            <Filter className="h-3.5 w-3.5" />
            All venues
          </button>
          <button className="bp2-btn bp2-btn-primary">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bp2-card" style={{ padding: 48, textAlign: 'center', color: '#6B7280' }}>
          Loading analytics…
        </div>
      ) : !analytics ? null : (
        <>
          {/* KPI row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <StatCard
              hero
              title="Profile views"
              value={analytics.totalProfileViews.toLocaleString()}
              sub="this range"
              icon={Eye}
              sparkline={
                analytics.dailyData.length > 0
                  ? analytics.dailyData.slice(-12).map((d) => d.profile_views || 0)
                  : undefined
              }
            />
            <StatCard
              title="Phone clicks"
              value={analytics.totalPhoneClicks.toLocaleString()}
              sub="this range"
              icon={Phone}
              sparkline={
                analytics.dailyData.length > 0
                  ? analytics.dailyData.slice(-12).map((d) => d.phone_clicks || 0)
                  : undefined
              }
            />
            <StatCard
              title="Website clicks"
              value={analytics.totalWebsiteClicks.toLocaleString()}
              sub="this range"
              icon={Globe}
              sparkline={
                analytics.dailyData.length > 0
                  ? analytics.dailyData.slice(-12).map((d) => d.website_clicks || 0)
                  : undefined
              }
            />
            <StatCard
              title="Total engagement"
              value={analytics.totalEngagement.toLocaleString()}
              sub="all interactions"
              icon={Repeat}
            />
          </div>

          {/* Charts row 1 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
              gap: 20,
              marginBottom: 20,
            }}
          >
            <div className="bp2-card" style={{ padding: 24 }}>
              <div className="bp2-section-title" style={{ marginBottom: 16 }}>
                Profile views over time
              </div>
              {analytics.dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={analytics.dailyData}>
                    <CartesianGrid strokeDasharray="3 4" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => formatDate(v, 'short')}
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      stroke="#E5E7EB"
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} stroke="#E5E7EB" />
                    <Tooltip
                      labelFormatter={(v) => formatDate(v as string)}
                      formatter={(v: number) => [v, 'Views']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="profile_views"
                      stroke="#EAB308"
                      strokeWidth={2.5}
                      dot={false}
                      name="Profile Views"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                  No data available for this date range
                </div>
              )}
            </div>

            <div className="bp2-card" style={{ padding: 24 }}>
              <div className="bp2-section-title" style={{ marginBottom: 16 }}>
                Engagement breakdown
              </div>
              {engagementData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={engagementData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={90}
                      dataKey="value"
                    >
                      {engagementData.map((_entry, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                  No engagement data
                </div>
              )}
            </div>
          </div>

          {/* Engagement over time bar chart */}
          <div className="bp2-card" style={{ padding: 24, marginBottom: 20 }}>
            <div className="bp2-section-title" style={{ marginBottom: 16 }}>
              Engagement over time
            </div>
            {analytics.dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.dailyData}>
                  <CartesianGrid strokeDasharray="3 4" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatDate(v, 'short')}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    stroke="#E5E7EB"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} stroke="#E5E7EB" />
                  <Tooltip labelFormatter={(v) => formatDate(v as string)} />
                  <Legend />
                  <Bar dataKey="phone_clicks"     fill="#10B981" name="Phone Calls" />
                  <Bar dataKey="website_clicks"   fill="#A855F7" name="Website Visits" />
                  <Bar dataKey="direction_clicks" fill="#3B82F6" name="Directions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                No data available
              </div>
            )}
          </div>

          {/* Venue performance table */}
          {analytics.venueBreakdown.length > 0 && (
            <div className="bp2-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6' }}>
                <div className="bp2-section-title">Venue performance</div>
              </div>
              <table className="bp2-table">
                <thead>
                  <tr>
                    <th>Venue</th>
                    <th style={{ textAlign: 'right' }}>Profile views</th>
                    <th style={{ textAlign: 'right' }}>Engagement</th>
                    <th style={{ textAlign: 'right' }}>Conversion rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.venueBreakdown.map((v) => {
                    const conversionRate =
                      v.profile_views > 0
                        ? ((v.total_engagement / v.profile_views) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <tr key={v.venue_id}>
                        <td style={{ fontWeight: 700, color: '#18181B' }}>{v.venue_name}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {v.profile_views.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {v.total_engagement.toLocaleString()}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 700,
                            color: '#A16207',
                          }}
                        >
                          {conversionRate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {analytics.dailyData.length === 0 && (
            <div className="bp2-card" style={{ padding: 48, textAlign: 'center' }}>
              <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
                No analytics data yet
              </h3>
              <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 16 }}>
                Analytics will appear once customers start viewing your venues.
              </p>
              <button className="bp2-btn bp2-btn-primary" onClick={() => navigate('/venues')}>
                View your venues
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
