export const CHART_COLORS = [
  "hsl(230, 80%, 62%)",
  "hsl(270, 70%, 60%)",
  "hsl(195, 80%, 55%)",
  "hsl(152, 60%, 48%)",
  "hsl(340, 70%, 58%)",
];

export const PAYMENT_METHOD_MAP: Record<string, { label: string; color: string }> = {
  "Crédito": { label: "Cartão de Crédito", color: CHART_COLORS[0] },
  "PIX": { label: "PIX", color: CHART_COLORS[1] },
  "Boleto": { label: "Boleto", color: CHART_COLORS[2] },
  "Outro": { label: "Outros", color: CHART_COLORS[3] },
};
