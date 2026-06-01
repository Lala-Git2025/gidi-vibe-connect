// Charts — small, hand-built SVG charts. No external deps.
// Sparkline + AreaChart + BarChart + DonutChart.

function Sparkline({ points = [], color = '#EAB308', width = 110, height = 36, area = true }) {
  if (!points.length) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((v, i) => [i * step, height - ((v - min) / span) * (height - 2) - 1]);
  const path = coords.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const areaPath = area ? `${path} L${width},${height} L0,${height} Z` : null;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {area && <path d={areaPath} fill={color} fillOpacity={0.16} />}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length-1][0]} cy={coords[coords.length-1][1]} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5"/>
    </svg>
  );
}

function AreaChart({ data = [], width = 720, height = 220, color = '#EAB308', secondary }) {
  if (!data.length) return null;
  const min = Math.min(...data, ...(secondary || [])) - 1;
  const max = Math.max(...data, ...(secondary || [])) + 1;
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const coords = (arr) => arr.map((v, i) => [i * step, height - ((v - min) / span) * (height - 20) - 10]);

  const mainCoords = coords(data);
  const secCoords  = secondary ? coords(secondary) : null;

  const linePath = (c) => c.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const areaPath = (c) => `${linePath(c)} L${width},${height} L0,${height} Z`;

  // x-axis labels at 4 evenly spaced ticks
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height + 24}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="ac-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* horizontal grid */}
        {[0.25, 0.5, 0.75].map((y) => (
          <line key={y} x1="0" x2={width}
            y1={y * height + 10} y2={y * height + 10}
            stroke="#E5E7EB" strokeDasharray="3 4" strokeWidth="1"/>
        ))}
        {/* secondary (compare) line */}
        {secondary && <path d={linePath(secCoords)} fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4 4" />}

        {/* main */}
        <path d={areaPath(mainCoords)} fill="url(#ac-fill)" />
        <path d={linePath(mainCoords)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* x-axis labels */}
        {labels.map((l, i) => {
          const x = (i / (labels.length - 1)) * width;
          return <text key={l} x={x} y={height + 18}
            textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
            fontSize="10" fill="#9CA3AF" fontFamily="Inter">{l}</text>;
        })}
      </svg>
    </div>
  );
}

function BarChart({ data = [], color = '#EAB308', maxLabel = 'Top' }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#3F3F46', marginBottom: 5 }}>
            <span style={{ fontWeight: 600 }}>{d.label}</span>
            <span style={{ fontWeight: 700 }}>{d.value.toLocaleString()}</span>
          </div>
          <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.value / max) * 100}%`, height: '100%',
              background: `linear-gradient(90deg, ${color}, ${color}CC)`,
              boxShadow: `0 0 8px ${color}55`,
              borderRadius: 4,
            }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data = [], size = 140, thickness = 18 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={thickness}/>
        {data.map((d, i) => {
          const len = (d.value / total) * circ;
          const dash = `${len} ${circ - len}`;
          const el = (
            <circle key={d.label} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={thickness}
              strokeDasharray={dash} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"/>
          );
          offset += len;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="900" fill="#18181B" fontFamily="Inter">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#6B7280" fontFamily="Inter">TOTAL</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }}></span>
            <span style={{ color: '#3F3F46', flex: 1 }}>{d.label}</span>
            <span style={{ fontWeight: 700, color: '#18181B' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.Sparkline = Sparkline;
window.AreaChart = AreaChart;
window.BarChart = BarChart;
window.DonutChart = DonutChart;
