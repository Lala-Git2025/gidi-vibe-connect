import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from './charts';

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaUp?: boolean;
  sub?: string;
  icon: LucideIcon;
  sparkline?: number[];
  hero?: boolean;
}

export function StatCard({
  title,
  value,
  delta,
  deltaUp = true,
  sub,
  icon: Icon,
  sparkline,
  hero,
}: StatCardProps) {
  return (
    <div className={hero ? 'bp2-card-hero' : 'bp2-card'} style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="bp2-eyebrow">{title}</span>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: hero ? 'linear-gradient(135deg,#FDE047,#EAB308)' : '#F3F4F6',
            color: hero ? '#18181B' : '#6B7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: hero ? '0 0 12px rgba(234,179,8,0.45)' : 'none',
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div className={'bp2-stat-num' + (hero ? ' gold' : '')}>{value}</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
              fontSize: 12,
            }}
          >
            {delta && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: deltaUp ? '#DCFCE7' : '#FEE2E2',
                  color: deltaUp ? '#166534' : '#991B1B',
                  fontWeight: 800,
                }}
              >
                {deltaUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {delta}
              </span>
            )}
            {sub && <span style={{ color: '#6B7280' }}>{sub}</span>}
          </div>
        </div>
        {sparkline && <Sparkline points={sparkline} color="#EAB308" />}
      </div>
    </div>
  );
}
