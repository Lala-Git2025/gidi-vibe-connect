import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from './charts';

interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaUp?: boolean;
  sub?: string;
  icon: LucideIcon;
  sparkline?: number[];
  hot?: boolean;
}

export function MetricCard({
  title,
  value,
  delta,
  deltaUp = true,
  sub,
  icon: Icon,
  sparkline,
  hot,
}: MetricCardProps) {
  return (
    <div className={hot ? 'ap-card-hot' : 'ap-card'} style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="ap-eyebrow">{title}</span>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: hot ? 'linear-gradient(135deg,#FB923C,#EA580C)' : '#F3F4F6',
            color: hot ? '#fff' : '#6B7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: hot ? '0 0 12px rgba(249,115,22,0.45)' : 'none',
          }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div className={'ap-stat-num' + (hot ? ' orange' : '')}>{value}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 12 }}>
            {delta && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: deltaUp ? '#DCFCE7' : '#FEE2E2',
                  color: deltaUp ? '#166534' : '#991B1B',
                  fontWeight: 800,
                }}
              >
                {deltaUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {delta}
              </span>
            )}
            {sub && <span style={{ color: '#6B7280' }}>{sub}</span>}
          </div>
        </div>
        {sparkline && <Sparkline points={sparkline} color={hot ? '#EA580C' : '#71717A'} />}
      </div>
    </div>
  );
}
