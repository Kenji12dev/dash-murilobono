import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";
import { CHART_COLORS } from "@/data/mockData";
import { Users } from "lucide-react";
import { useState } from "react";

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR")}`;

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 border border-glass-border text-sm">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value.toFixed(1)}%</p>
    </div>
  );
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 4}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
};

interface DonutChartProps {
  data: any[];
  dataKey: string;
  activeFilter?: string;
  onSliceClick?: (name: string) => void;
}

const DonutChart = ({ data, dataKey, activeFilter, onSliceClick }: DonutChartProps) => {
  const activeIndex = activeFilter ? data.findIndex((d) => d.name === activeFilter) : -1;

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey={dataKey}
            stroke="none"
            activeIndex={activeIndex >= 0 ? activeIndex : undefined}
            activeShape={renderActiveShape}
            onClick={(_, index) => onSliceClick?.(data[index].name)}
            className="cursor-pointer"
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                opacity={activeFilter && entry.name !== activeFilter ? 0.3 : 1}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
    <Users className="h-8 w-8 opacity-30" />
    <p className="text-sm">{text}</p>
  </div>
);

interface TeamPerformanceProps {
  closerData: { name: string; sales: number; revenue: number; percentage: number }[];
  sdrData: { name: string; sales: number; percentage: number }[];
  activeCloser?: string;
  activeSdr?: string;
  onCloserClick?: (name: string) => void;
  onSdrClick?: (name: string) => void;
}

const TeamPerformance = ({ closerData, sdrData, activeCloser, activeSdr, onCloserClick, onSdrClick }: TeamPerformanceProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 opacity-0 animate-fade-in" style={{ animationDelay: "600ms" }}>
    {/* Closers */}
    <div className="glass-card gradient-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">
          Performance — Closers
        </h2>
        {activeCloser && (
          <button onClick={() => onCloserClick?.("")} className="text-xs text-primary hover:underline">
            Limpar filtro
          </button>
        )}
      </div>
      {closerData.length === 0 ? (
        <EmptyState text="Sem dados de closers" />
      ) : (
        <>
          <DonutChart data={closerData} dataKey="percentage" activeFilter={activeCloser} onSliceClick={onCloserClick} />
          <div className="mt-4 space-y-3">
            {closerData.map((c, i) => (
              <div
                key={c.name}
                className="flex items-center justify-between text-sm cursor-pointer hover:bg-secondary/40 rounded-md px-2 py-1 transition-colors"
                style={{ opacity: activeCloser && c.name !== activeCloser ? 0.4 : 1 }}
                onClick={() => onCloserClick?.(c.name)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                  <span className="text-foreground font-medium">{c.name}</span>
                </div>
                <div className="flex items-center gap-6 text-muted-foreground">
                  <span>{c.sales} vendas</span>
                  <span className="w-12 text-right">{c.percentage}%</span>
                  <span className="w-28 text-right font-medium text-foreground">{formatCurrency(c.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>

    {/* SDRs */}
    <div className="glass-card gradient-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">
          Performance — SDRs
        </h2>
        {activeSdr && (
          <button onClick={() => onSdrClick?.("")} className="text-xs text-primary hover:underline">
            Limpar filtro
          </button>
        )}
      </div>
      {sdrData.length === 0 ? (
        <EmptyState text="Sem dados de SDRs" />
      ) : (
        <>
          <DonutChart data={sdrData} dataKey="percentage" activeFilter={activeSdr} onSliceClick={onSdrClick} />
          <div className="mt-4 space-y-3">
            {sdrData.map((s, i) => (
              <div
                key={s.name}
                className="flex items-center justify-between text-sm cursor-pointer hover:bg-secondary/40 rounded-md px-2 py-1 transition-colors"
                style={{ opacity: activeSdr && s.name !== activeSdr ? 0.4 : 1 }}
                onClick={() => onSdrClick?.(s.name)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                  <span className="text-foreground font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-6 text-muted-foreground">
                  <span>{s.sales} vendas</span>
                  <span className="w-12 text-right">{s.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  </div>
);

export default TeamPerformance;
