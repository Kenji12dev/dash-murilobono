import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { Megaphone } from "lucide-react";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 border border-glass-border text-sm">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].payload.percentage}%</p>
    </div>
  );
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
  );
};

interface LeadSourceDistributionProps {
  data: { name: string; value: number; percentage: number; color: string }[];
  activeSource?: string;
  onSourceClick?: (source: string) => void;
}

const LeadSourceDistribution = ({ data, activeSource, onSourceClick }: LeadSourceDistributionProps) => {
  const activeIndex = activeSource ? data.findIndex((d) => d.name === activeSource) : -1;

  return (
    <div className="glass-card gradient-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "900ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">
          Distribuição por Origem do Lead
        </h2>
        {activeSource && (
          <button onClick={() => onSourceClick?.("")} className="text-xs text-primary hover:underline">
            Limpar filtro
          </button>
        )}
      </div>
      {data.length === 0 ? (
        <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Megaphone className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhum dado registrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  activeIndex={activeIndex >= 0 ? activeIndex : undefined}
                  activeShape={renderActiveShape}
                  onClick={(_, index) => onSourceClick?.(data[index].name)}
                  className="cursor-pointer"
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      opacity={activeSource && entry.name !== activeSource ? 0.3 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            {data.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between cursor-pointer hover:bg-secondary/40 rounded-md px-2 py-1 transition-colors"
                style={{ opacity: activeSource && p.name !== activeSource ? 0.4 : 1 }}
                onClick={() => onSourceClick?.(p.name)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-sm text-foreground font-medium">{p.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{p.value} vendas</span>
                  <span className="text-sm font-semibold text-foreground w-12 text-right">{p.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadSourceDistribution;
