

## Diagnóstico

Testei a edge function `google-calendar-event` diretamente com o nome "Joao Vittor" e **o evento foi criado com sucesso** no Google Calendar dele. A função está operando corretamente.

O código do frontend (`KanbanBoard.tsx`) também está correto — passa o nome exato do closer selecionado para a edge function.

**Possível causa**: O problema pode ser que `supabase.functions.invoke()` retorna o body de forma diferente do esperado. O SDK do Supabase pode retornar `data` como `null` mesmo com status 200 se houver algum problema de parsing. Além disso, se houver um erro silencioso (como o `addSale` falhando), o código do Calendar nunca é alcançado, mas o toast "Agendamento criado!" já teria sido exibido.

## Plano

1. **Melhorar logging e feedback no frontend** — Adicionar `console.log` detalhado no `handleAddSave` para registrar a resposta completa da edge function (tanto `data` quanto `error`), facilitando a depuração.

2. **Mostrar feedback visual quando o Calendar falha** — Atualmente, se `data?.skipped` é true (Calendar não vinculado) ou se ocorre erro, o usuário não vê nada. Alterar para exibir um `toast.warning()` com a mensagem de erro retornada.

3. **Aplicar a mesma melhoria ao Follow Up** — O `handleFollowUpConfirm` também engole erros silenciosamente (linhas 184-189). Adicionar feedback visual quando o evento não é criado.

### Alterações em arquivo

**`src/pages/KanbanBoard.tsx`**:
- No `handleAddSave` (linhas 245-266): adicionar `console.log("Calendar response:", { data, error })` e transformar o `else if (data?.skipped)` em `toast.warning(data?.error || "Google Calendar não vinculado para este closer")`.
- No `handleFollowUpConfirm` (linhas 172-189): adicionar log e toast de warning quando `data?.skipped` ou `data?.error`.

Isso vai permitir que, da próxima vez que falhar, saibamos exatamente o motivo e o usuário também receberá feedback.

