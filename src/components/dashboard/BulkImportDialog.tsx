import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { useSales } from "@/context/SalesContext";
import { calculateNetValue, PAYMENT_METHODS, LEAD_SOURCES } from "@/data/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle, Check, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ParsedRow {
  date: Date;
  clientName: string;
  product: string;
  grossValue: number;
  netValue: number;
  paymentMethod: string;
  closer: string;
  sdr: string;
  status: string;
  leadSource: string;
  downPayment?: number;
  notes: string;
  errors: string[];
}

const EXPECTED_COLUMNS = [
  "Data",
  "Cliente",
  "Produto",
  "Valor Bruto",
  "Valor Líquido",
  "Método de Pagamento",
  "Closer",
  "SDR",
  "Status",
  "Origem do Lead",
  "Entrada",
  "Observações",
];

const VALID_STATUSES = ["Pago", "Pendente", "Follow Up", "Loss", "Reembolsado"];

function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  // If it's a number (Excel serial date)
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return new Date(date.y, date.m - 1, date.d);
  }
  // If it's a string like dd/mm/yyyy
  if (typeof value === "string") {
    const parts = value.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    // Try ISO format
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  return null;
}

function parseRow(row: any[], closers: string[], sdrs: string[]): ParsedRow {
  const errors: string[] = [];

  const date = parseExcelDate(row[0]);
  if (!date) errors.push("Data inválida");

  const clientName = String(row[1] || "").trim();
  if (!clientName) errors.push("Cliente vazio");

  const product = String(row[2] || "").trim();
  if (!product) errors.push("Produto vazio");

  const grossValue = parseFloat(row[3]) || 0;
  const paymentMethod = String(row[5] || "").trim();
  
  // Auto-calc net value if not provided
  let netValue = parseFloat(row[4]);
  if (isNaN(netValue) || netValue === 0) {
    netValue = paymentMethod ? calculateNetValue(grossValue, paymentMethod) : 0;
  }

  if (!paymentMethod) errors.push("Pagamento vazio");

  const closer = String(row[6] || "").trim();
  if (!closer) errors.push("Closer vazio");

  const sdr = String(row[7] || "").trim();
  if (!sdr) errors.push("SDR vazio");

  const status = String(row[8] || "").trim();
  if (!status) errors.push("Status vazio");
  else if (!VALID_STATUSES.includes(status)) errors.push(`Status "${status}" inválido`);

  const leadSource = String(row[9] || "").trim();
  if (!leadSource) errors.push("Origem vazia");

  const downPayment = row[10] !== undefined && row[10] !== "" ? parseFloat(row[10]) : undefined;
  const notes = String(row[11] || "").trim();

  return {
    date: date || new Date(),
    clientName,
    product,
    grossValue,
    netValue,
    paymentMethod,
    closer,
    sdr,
    status,
    leadSource,
    downPayment: isNaN(downPayment as number) ? undefined : downPayment,
    notes,
    errors,
  };
}

const BulkImportDialog = () => {
  const { addSale, closers, sdrs } = useSales();
  const [open, setOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setParsedRows([]);
    setFileName("");
    setStep("upload");
    setImporting(false);
  };

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

          // Skip header row
          const dataRows = jsonData.slice(1).filter((row) =>
            row.some((cell: any) => cell !== "" && cell != null)
          );

          if (dataRows.length === 0) {
            toast.error("Planilha vazia ou sem dados válidos");
            return;
          }

          const parsed = dataRows.map((row) => parseRow(row, closers, sdrs));
          setParsedRows(parsed);
          setStep("preview");
        } catch {
          toast.error("Erro ao ler a planilha. Verifique o formato do arquivo.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [closers, sdrs]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error("Nenhuma linha válida para importar");
      return;
    }

    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of validRows) {
      try {
        await addSale({
          date: row.date,
          clientName: row.clientName,
          product: row.product,
          grossValue: row.grossValue,
          netValue: row.netValue,
          paymentMethod: row.paymentMethod,
          closer: row.closer,
          sdr: row.sdr,
          status: row.status,
          leadSource: row.leadSource,
          downPayment: row.downPayment,
          notes: row.notes,
        });
        success++;
      } catch {
        failed++;
      }
    }

    setImporting(false);
    toast.success(`${success} vendas importadas com sucesso!${failed > 0 ? ` ${failed} falharam.` : ""}`);
    setOpen(false);
    resetState();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      EXPECTED_COLUMNS,
      ["25/02/2026", "João Silva", "Mentoria 10x", 2000, 1900, "TMB", "Andre Kenji", "Harumi", "Pago", "Formulário", 166.67, "Observação exemplo"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, "modelo_vendas.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Importar Planilha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importação em Massa
          </DialogTitle>
          <DialogDescription>
            Importe vendas de uma planilha CSV ou Excel (.xlsx)
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/50 transition-all"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-foreground font-medium mb-1">
                Arraste um arquivo ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos: .xlsx, .xls, .csv
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>

            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-2 text-muted-foreground w-full">
              <Download className="h-4 w-4" />
              Baixar modelo de planilha
            </Button>

            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Colunas esperadas (nesta ordem):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EXPECTED_COLUMNS.map((col) => (
                  <Badge key={col} variant="secondary" className="text-[11px]">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 min-h-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{fileName}</span>
                <Badge variant="secondary">{parsedRows.length} linhas</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState}>
                Trocar arquivo
              </Button>
            </div>

            <div className="flex gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                <span className="text-success font-medium">{validRows.length} válidas</span>
              </div>
              {invalidRows.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive font-medium">{invalidRows.length} com erros</span>
                </div>
              )}
            </div>

            <ScrollArea className="h-[300px] border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-secondary">
                  <tr>
                    <th className="px-3 py-2 text-left text-muted-foreground font-semibold">#</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Status</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Data</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Cliente</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Produto</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-semibold">Bruto</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Pagamento</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Erros</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-b border-border/50",
                        row.errors.length > 0 ? "bg-destructive/5" : "hover:bg-secondary/40"
                      )}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        {row.errors.length === 0 ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {row.date.toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 text-foreground font-medium truncate max-w-[120px]">
                        {row.clientName}
                      </td>
                      <td className="px-3 py-2 text-foreground truncate max-w-[100px]">
                        {row.product}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                        R$ {row.grossValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.paymentMethod}</td>
                      <td className="px-3 py-2">
                        {row.errors.length > 0 && (
                          <span className="text-destructive text-[11px]">
                            {row.errors.join(", ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}

        {step === "preview" && (
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => { setOpen(false); resetState(); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || importing}
              className="gap-2"
            >
              {importing ? (
                <>Importando...</>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar {validRows.length} vendas
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
