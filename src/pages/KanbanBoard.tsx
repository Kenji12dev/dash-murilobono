import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSales, Sale } from "@/context/SalesContext";
import { Columns3, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const columns = [
  { id: "Pendente", label: "Agendado / Pendente", color: "border-yellow-500/60 bg-yellow-500/5" },
  { id: "Pago", label: "Pago", color: "border-emerald-500/60 bg-emerald-500/5" },
  { id: "Cancelado", label: "Cancelado", color: "border-red-500/60 bg-red-500/5" },
  { id: "Reembolsado", label: "Reembolsado", color: "border-zinc-500/60 bg-zinc-500/5" },
];

const KanbanBoard = () => {
  const { sales, updateSale } = useSales();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOverCol = useRef<string | null>(null);

  const handleDragStart = (e: React.DragEvent, saleId: string) => {
    setDraggedId(saleId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverCol.current = colId;
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedId) return;
    const sale = sales.find((s) => s.id === draggedId);
    if (sale && sale.status !== targetStatus) {
      updateSale(draggedId, { status: targetStatus });
      toast.success(`Venda movida para ${targetStatus}`);
    }
    setDraggedId(null);
    dragOverCol.current = null;
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    dragOverCol.current = null;
  };

  const salesByStatus = (status: string) =>
    sales
      .filter((s) => s.status === status)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Columns3 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            Fluxo de Status
          </h1>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
            {sales.length} venda{sales.length !== 1 && "s"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => {
            const items = salesByStatus(col.id);
            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={cn(
                  "rounded-xl border-2 border-dashed p-3 min-h-[400px] transition-colors",
                  col.color,
                  draggedId && dragOverCol.current === col.id && "ring-2 ring-primary/40"
                )}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-sm font-semibold text-foreground">{col.label}</h2>
                  <span className="text-xs font-medium text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((sale) => (
                    <div
                      key={sale.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, sale.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
                        draggedId === sale.id && "opacity-40 scale-95"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {sale.clientName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {sale.product}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(sale.date), "dd/MM/yy", { locale: ptBR })}
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              R$ {sale.grossValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground">{sale.closer}</span>
                            <span className="text-[10px] text-muted-foreground">{sale.paymentMethod}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;
