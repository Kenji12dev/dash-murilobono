import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Target, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MonthlyGoalsProps {
  currentRevenue: number;
  currentCash: number;
  isAdmin: boolean;
}

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MonthlyGoals = ({ currentRevenue, currentCash, isAdmin }: MonthlyGoalsProps) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [revenueGoal, setRevenueGoal] = useState(0);
  const [cashGoal, setCashGoal] = useState(0);
  const [editRevenue, setEditRevenue] = useState("");
  const [editCash, setEditCash] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("monthly_goals")
        .select("revenue_goal, cash_goal")
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();
      if (data) {
        setRevenueGoal(Number(data.revenue_goal));
        setCashGoal(Number(data.cash_goal));
        setEditRevenue(String(data.revenue_goal));
        setEditCash(String(data.cash_goal));
      }
      setLoaded(true);
    };
    fetch();
  }, [month, year]);

  const handleSave = async () => {
    setSaving(true);
    const rg = parseFloat(editRevenue) || 0;
    const cg = parseFloat(editCash) || 0;

    const { error } = await supabase
      .from("monthly_goals")
      .upsert(
        { month, year, revenue_goal: rg, cash_goal: cg },
        { onConflict: "month,year" }
      );

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar meta: " + error.message);
    } else {
      setRevenueGoal(rg);
      setCashGoal(cg);
      setEditing(false);
      toast.success("Meta atualizada!");
    }
  };

  if (!loaded) return null;

  const revPct = revenueGoal > 0 ? Math.min((currentRevenue / revenueGoal) * 100, 100) : 0;
  const cashPct = cashGoal > 0 ? Math.min((currentCash / cashGoal) * 100, 100) : 0;

  const hasGoals = revenueGoal > 0 || cashGoal > 0;

  if (!hasGoals && !isAdmin) return null;

  return (
    <div className="glass-card gradient-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted-foreground">
            Meta do Mês
          </h2>
        </div>
        {isAdmin && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-xs">
            Editar Meta
          </Button>
        )}
      </div>

      {editing && isAdmin ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Meta Faturamento (R$)</Label>
              <Input
                type="number"
                value={editRevenue}
                onChange={(e) => setEditRevenue(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Meta Caixa (R$)</Label>
              <Input
                type="number"
                value={editCash}
                onChange={(e) => setEditCash(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="font-semibold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Salvar</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </div>
      ) : hasGoals ? (
        <div className="space-y-5">
          {revenueGoal > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Faturamento</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(currentRevenue)} / {formatCurrency(revenueGoal)}
                </span>
              </div>
              <Progress value={revPct} className="h-3" />
              <p className="text-xs text-muted-foreground text-right">{revPct.toFixed(1)}%</p>
            </div>
          )}
          {cashGoal > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Caixa Gerado</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(currentCash)} / {formatCurrency(cashGoal)}
                </span>
              </div>
              <Progress value={cashPct} className="h-3" />
              <p className="text-xs text-muted-foreground text-right">{cashPct.toFixed(1)}%</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma meta definida para este mês. Clique em "Editar Meta" para configurar.</p>
      )}
    </div>
  );
};

export default MonthlyGoals;
