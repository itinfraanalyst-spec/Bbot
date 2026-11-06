import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon, Sparkles, EyeOff, Eye } from 'lucide-react';

interface ChartProps {
  data: any[];
  xAxisKey: string;
  dataKeys: string[];
  theme?: string;
  initialType?: 'bar' | 'line' | 'area';
}

const PALETTE = [
  { stroke: '#C87514', fill: 'url(#gradientAccent)', solid: '#C87514' },
  { stroke: '#3b82f6', fill: 'url(#gradientBlue)', solid: '#3b82f6' },
  { stroke: '#10b981', fill: 'url(#gradientGreen)', solid: '#10b981' },
  { stroke: '#8b5cf6', fill: 'url(#gradientPurple)', solid: '#8b5cf6' },
  { stroke: '#f59e0b', fill: 'url(#gradientAmber)', solid: '#f59e0b' },
];

function formatMetricNumber(val: number): string {
  if (val === 0) return '0';
  const abs = Math.abs(val);
  if (abs >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(val / 1e3).toFixed(1)}k`;
  if (abs < 1 && abs > 0) return val.toFixed(2);
  return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(1);
}

export function DataChart({ data, xAxisKey, dataKeys, theme: _theme, initialType = 'bar' }: ChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>(initialType);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter out any rows that don't have valid data
  const sanitizedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map((row) => {
      const cleanRow: Record<string, any> = { ...row };
      dataKeys.forEach((key) => {
        const v = cleanRow[key];
        cleanRow[key] = typeof v === 'number' && !isNaN(v) ? v : 0;
      });
      return cleanRow;
    });
  }, [data, dataKeys]);

  if (!sanitizedData || sanitizedData.length === 0 || !xAxisKey || !dataKeys || dataKeys.length === 0) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="my-3 flex items-center justify-between px-3.5 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)] shadow-2xs transition-all">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-[var(--accent)] shrink-0" />
          <span className="font-medium text-[var(--text-primary)]">
            Chart View ({sanitizedData.length} data points)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-semibold bg-transparent border-none cursor-pointer p-0"
        >
          <Eye size={13} />
          <span>Show Chart</span>
        </button>
      </div>
    );
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-sm transition-all animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(200,117,20,0.12)] text-[var(--accent)]">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Interactive Data Visualization
          </span>
          <span className="rounded-full bg-[var(--bg-surface-hover)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--text-muted)]">
            {sanitizedData.length} Data Points
          </span>
        </div>

        {/* Chart Type Toggles & Hide Button */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${
                chartType === 'bar'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Bar Chart"
            >
              <BarChart3 size={12} />
              Bar
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${
                chartType === 'line'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Line Graph"
            >
              <LineChartIcon size={12} />
              Line
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${
                chartType === 'area'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Area Graph"
            >
              <AreaChartIcon size={12} />
              Area
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[0.68rem] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors border border-transparent hover:border-[var(--border-subtle)] cursor-pointer"
            title="Hide visualization"
          >
            <EyeOff size={11} />
            <span className="hidden sm:inline">Hide</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-4 h-[320px] w-full bg-[var(--bg-surface)]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={sanitizedData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradientAccent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C87514" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#C87514" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="gradientPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="gradientAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey={xAxisKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={formatMetricNumber} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val, '']}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              {dataKeys.map((key, idx) => {
                const colorConfig = PALETTE[idx % PALETTE.length];
                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={colorConfig.fill}
                    stroke={colorConfig.stroke}
                    radius={[6, 6, 0, 0]}
                  />
                );
              })}
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={sanitizedData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey={xAxisKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={formatMetricNumber} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val, '']}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              {dataKeys.map((key, idx) => {
                const colorConfig = PALETTE[idx % PALETTE.length];
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colorConfig.solid}
                    strokeWidth={3}
                    dot={{ fill: colorConfig.solid, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                  />
                );
              })}
            </LineChart>
          ) : (
            <AreaChart data={sanitizedData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradientAccentArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C87514" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#C87514" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradientBlueArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradientGreenArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey={xAxisKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={formatMetricNumber} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val, '']}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              {dataKeys.map((key, idx) => {
                const colorConfig = PALETTE[idx % PALETTE.length];
                const gradId = idx === 0 ? 'url(#gradientAccentArea)' : idx === 1 ? 'url(#gradientBlueArea)' : 'url(#gradientGreenArea)';
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colorConfig.solid}
                    strokeWidth={2.5}
                    fill={gradId}
                  />
                );
              })}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
