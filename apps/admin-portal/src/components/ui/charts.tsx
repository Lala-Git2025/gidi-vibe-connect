interface SparklineProps {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({ points, color = '#71717A', width = 84, height = 32 }: SparklineProps) {
  if (!points.length) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / Math.max(1, points.length - 1);
  const coords = points.map<[number, number]>((v, i) => [
    i * step,
    height - ((v - min) / span) * (height - 2) - 1,
  ]);
  const path = coords
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(' ');
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  const last = coords[coords.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={areaPath} fill={color} fillOpacity={0.16} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

interface AreaChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export function AreaChart({ data, color = '#EA580C', height = 200 }: AreaChartProps) {
  if (!data.length) return null;
  const width = 720;
  const min = Math.min(...data) - 1;
  const max = Math.max(...data) + 1;
  const span = max - min || 1;
  const step = width / Math.max(1, data.length - 1);
  const coords = data.map<[number, number]>((v, i) => [
    i * step,
    height - ((v - min) / span) * (height - 20) - 10,
  ]);
  const linePath = coords.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 24}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ap-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((y) => (
        <line
          key={y}
          x1="0"
          x2={width}
          y1={y * height + 10}
          y2={y * height + 10}
          stroke="#E5E7EB"
          strokeDasharray="3 4"
          strokeWidth="1"
        />
      ))}
      <path d={areaPath} fill="url(#ap-area-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  color?: string;
}

export function BarChart({ data, color = '#FB923C' }: BarChartProps) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#3F3F46',
              marginBottom: 5,
            }}
          >
            <span style={{ fontWeight: 600 }}>{d.label}</span>
            <span style={{ fontWeight: 700 }}>{d.value.toLocaleString()}</span>
          </div>
          <div
            style={{
              height: 8,
              background: '#F3F4F6',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(d.value / max) * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                boxShadow: `0 0 8px ${color}55`,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
}

export function DonutChart({ data, size = 130, thickness = 16 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={thickness} />
        {data.map((d) => {
          const len = (d.value / total) * circ;
          const dash = `${len} ${circ - len}`;
          const el = (
            <circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="900" fill="#18181B">
          {total.toLocaleString()}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          letterSpacing="1.5"
          fill="#6B7280"
        >
          TOTAL
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: d.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#3F3F46', flex: 1 }}>{d.label}</span>
            <span style={{ fontWeight: 700, color: '#18181B' }}>{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
