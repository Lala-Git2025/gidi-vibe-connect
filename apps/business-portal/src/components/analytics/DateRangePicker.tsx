import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { DateRange } from '../../hooks/useAnalytics';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const QUICK_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This month', value: 'month' },
  { label: 'Last month', value: 'last-month' },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [customStart, setCustomStart] = useState(value.start);
  const [customEnd, setCustomEnd] = useState(value.end);

  const handleQuickRange = (days?: number, value?: string) => {
    const end = new Date();
    const start = new Date();

    if (days) {
      start.setDate(start.getDate() - days);
    } else if (value === 'month') {
      start.setDate(1); // First day of current month
    } else if (value === 'last-month') {
      end.setDate(0); // Last day of previous month
      start.setMonth(end.getMonth());
      start.setDate(1); // First day of previous month
    }

    const range = {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };

    setCustomStart(range.start);
    setCustomEnd(range.end);
    onChange(range);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({ start: customStart, end: customEnd });
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Range Buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK_RANGES.map((range) => (
          <Button
            key={range.label}
            variant="outline"
            size="sm"
            onClick={() => handleQuickRange(range.days, range.value)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Range */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            max={customEnd}
            className="flex-1"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            min={customStart}
            max={new Date().toISOString().split('T')[0]}
            className="flex-1"
          />
        </div>
        <Button onClick={handleCustomApply} size="sm">
          Apply
        </Button>
      </div>
    </div>
  );
}
