import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PhoneCall } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 border border-glass-border text-sm">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">
        {payload[0].payload.count} call{payload[0].payload.count !== 1 ? "s" : ""} — {payload[0].payload.percentage}%
      </p>
    </div>
  );
};

interface CallStatusChartProps {
  data: { name: string; count: number; percentage: number; color: string }[];
  closers: string[];
  salesByCloser: Record<string, { name: string; count: number; color: string }[]>;
}

const CallStatusChart = ({ data, closers, salesByCloser }: CallStatusChartProps) => {
  const [selectedCloser, setSelectedCloser] = useState<string>("all");

  const chartData = useMemo(() => {
    if (selectedCloser === "all") return data;

    const closerItems = salesByCloser[selectedCloser] || [];
    const total = closerItems.reduce((s, i) => s + i.count, 0) || 1;
    return closerItems.map((item) => ({
      ...item,
      percentage: parseFloat(((item.count / total) * 100).toFixed(1)),
    }));
  }, [data, selectedCloser, salesByCloser]);

  const totalCalls = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="glass-card gradient-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "550ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">
          Status de Calls
        </h2>
        <Select value={selectedCloser} onValueChange={setSelectedCloser}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Todos os Closers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Closers</SelectItem>
            {closers.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {chartData.length === 0 || totalCalls === 0 ? (
        <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-3">
          <PhoneCall className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhuma call registrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{totalCalls}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">calls</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-foreground font-medium">{d.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">{d.count} call{d.count !== 1 ? "s" : ""}</span>
                  <span className="font-semibold text-foreground w-12 text-right">{d.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CallStatusChart;
