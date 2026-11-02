import { useState } from 'react';
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
import { BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon, Sparkles } from 'lucide-react';

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

export function DataChart({ data, xAxisKey, dataKeys, theme: _theme, initialType = 'bar' }: ChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>(initialType);

  if (!data || data.length === 0 || !xAxisKey || dataKeys.length === 0) {
    return null;
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-sm transition-all">
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
            {data.length} Data Points
          </span>
        </div>

        {/* Chart Type Toggles */}
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
      </div>

      {/* Chart Canvas */}
      <div className="p-4 h-[320px] w-full bg-[var(--bg-surface)]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
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
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey={xAxisKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '12px',
                }}
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
            <LineChart data={data} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey={xAxisKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '12px',
                }}
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
            <AreaChart data={data} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
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
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '12px',
                }}
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
