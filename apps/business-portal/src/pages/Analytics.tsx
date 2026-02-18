import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Phone, Globe, Navigation, TrendingUp, Lock } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { useAnalytics, getDefaultDateRange, type DateRange } from '../hooks/useAnalytics';
import { DateRangePicker } from '../components/analytics/DateRangePicker';
import { formatDate } from '../lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color?: string;
}

function MetricCard({ title, value, icon: Icon, color = 'text-primary' }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function Analytics() {
  const navigate = useNavigate();
  const { subscription } = useBusinessAuth();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const { data: analytics, isLoading, error } = useAnalytics(dateRange);

  // Check if user has access to analytics
  if (!subscription?.can_view_analytics) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
            <p className="text-muted-foreground mb-6">
              Analytics dashboard is available on Premium and Enterprise plans.
            </p>
            <div className="space-y-2 text-sm text-left mb-6">
              <p className="flex items-center">
                <span className="text-primary mr-2">✓</span>
                Track profile views and engagement
              </p>
              <p className="flex items-center">
                <span className="text-primary mr-2">✓</span>
                View click-through rates
              </p>
              <p className="flex items-center">
                <span className="text-primary mr-2">✓</span>
                Monitor venue performance over time
              </p>
              <p className="flex items-center">
                <span className="text-primary mr-2">✓</span>
                Compare venues side-by-side
              </p>
            </div>
            <Button onClick={() => navigate('/subscription')}>
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Analytics</h2>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Prepare engagement breakdown data for pie chart
  const engagementData = [
    { name: 'Phone Calls', value: analytics.totalPhoneClicks },
    { name: 'Website Visits', value: analytics.totalWebsiteClicks },
    { name: 'Directions', value: analytics.totalDirectionClicks },
    { name: 'Offer Clicks', value: analytics.totalOfferClicks },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track your venue performance and customer engagement
        </p>
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Profile Views"
          value={analytics.totalProfileViews}
          icon={Eye}
          color="text-blue-500"
        />
        <MetricCard
          title="Phone Clicks"
          value={analytics.totalPhoneClicks}
          icon={Phone}
          color="text-green-500"
        />
        <MetricCard
          title="Website Clicks"
          value={analytics.totalWebsiteClicks}
          icon={Globe}
          color="text-purple-500"
        />
        <MetricCard
          title="Total Engagement"
          value={analytics.totalEngagement}
          icon={TrendingUp}
          color="text-primary"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Views Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatDate(value, 'short')}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => formatDate(value as string)}
                    formatter={(value: number) => [value, 'Views']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="profile_views"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Profile Views"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for this date range
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engagement Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {engagementData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {engagementData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No engagement data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engagement Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatDate(value, 'short')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => formatDate(value as string)}
                />
                <Legend />
                <Bar dataKey="phone_clicks" fill="#10B981" name="Phone Calls" />
                <Bar dataKey="website_clicks" fill="#8B5CF6" name="Website Visits" />
                <Bar dataKey="direction_clicks" fill="#3B82F6" name="Directions" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available for this date range
            </div>
          )}
        </CardContent>
      </Card>

      {/* Venue Performance Table */}
      {analytics.venueBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Venue Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Venue</th>
                    <th className="text-right py-3 px-4">Profile Views</th>
                    <th className="text-right py-3 px-4">Total Engagement</th>
                    <th className="text-right py-3 px-4">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.venueBreakdown.map((venue) => {
                    const conversionRate =
                      venue.profile_views > 0
                        ? ((venue.total_engagement / venue.profile_views) * 100).toFixed(1)
                        : '0.0';

                    return (
                      <tr key={venue.venue_id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{venue.venue_name}</td>
                        <td className="text-right py-3 px-4">
                          {venue.profile_views.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          {venue.total_engagement.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">{conversionRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {analytics.dailyData.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Analytics Data Yet</h3>
            <p className="text-muted-foreground mb-4">
              Analytics will appear once customers start viewing your venues.
            </p>
            <Button onClick={() => navigate('/venues')}>
              View Your Venues
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
