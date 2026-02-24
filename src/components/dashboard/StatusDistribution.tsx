import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Activity } from "lucide-react";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 border border-glass-border text-sm">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].payload.count} vendas — {payload[0].payload.percentage}%</p>
    </div>
  );
};

interface StatusDistributionProps {
  data: { name: string; count: number; percentage: number; color: string }[];
}

const StatusDistribution = ({ data }: StatusDistributionProps) => (
  <div className="glass-card gradient-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
    <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground mb-4">
      Distribuição por Status
    </h2>
    {data.length === 0 ? (
      <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Activity className="h-10 w-10 opacity-30" />
        <p className="text-sm">Nenhuma venda registrada</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count" stroke="none">
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-foreground font-medium">{d.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">{d.count} vendas</span>
                <span className="font-semibold text-foreground w-12 text-right">{d.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default StatusDistribution;
