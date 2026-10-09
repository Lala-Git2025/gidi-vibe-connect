import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Month grid for the Events page, behind the "Calendar view" button that
 * previously had no handler at all.
 *
 * Dates are bucketed by the venue's own day, computed in Africa/Lagos rather
 * than the browser's zone. An event at 21:00 Lagos is 20:00 UTC, so a viewer
 * in London reading `toDateString()` off the raw timestamp sees the right day
 * only by luck, and one in Los Angeles sees the day before.
 */

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  is_published?: boolean;
}

interface Props {
  events: CalendarEvent[];
  onSelect: (eventId: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** `YYYY-MM-DD` for an instant, as it falls in Lagos. */
const lagosDayKey = (iso: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const keyOf = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function EventCalendar({ events, onSelect }: Props) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    if (!e.start_date) continue;
    const key = lagosDayKey(e.start_date);
    const list = byDay.get(key);
    if (list) list.push(e);
    else byDay.set(key, [e]);
  }

  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  // getDay() is Sunday-first; this grid is Monday-first, as Lagos reads a week.
  const leading = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = lagosDayKey(new Date().toISOString());
  const shift = (by: number) => {
    const d = new Date(cursor.year, cursor.month + by, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="bp2-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="bp2-section-title">
          {first.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="bp2-btn bp2-btn-ghost bp2-btn-icon" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="bp2-btn bp2-btn-ghost" onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}>
            Today
          </button>
          <button className="bp2-btn bp2-btn-ghost bp2-btn-icon" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {WEEKDAYS.map(d => (
          <div
            key={d}
            style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.05em',
              textTransform: 'uppercase', color: '#9CA3AF', padding: '4px 2px',
            }}
          >
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} />;
          const key = keyOf(cursor.year, cursor.month, day);
          const dayEvents = byDay.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              style={{
                minHeight: 92,
                border: `1px solid ${isToday ? '#FACC15' : '#F1F1F0'}`,
                background: isToday ? 'rgba(250,204,21,0.06)' : '#fff',
                borderRadius: 10,
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isToday ? '#854D0E' : '#6B7280' }}>
                {day}
              </div>
              {dayEvents.slice(0, 3).map(e => (
                <button
                  key={e.id}
                  onClick={() => onSelect(e.id)}
                  title={e.title}
                  style={{
                    border: 0, borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    padding: '3px 6px', fontSize: 11, fontWeight: 600,
                    background: e.is_published === false ? '#F3F4F6' : 'linear-gradient(135deg,#FDE047,#EAB308)',
                    color: e.is_published === false ? '#6B7280' : '#18181B',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {e.title}
                </button>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: '#9CA3AF', paddingLeft: 2 }}>
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
