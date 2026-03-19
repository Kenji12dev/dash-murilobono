import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um coach de Social Selling para SDRs do perfil Hey Investidor no Instagram. Feedback direto, assertivo, sem rodeios. Aponta o erro, mostra o certo, acabou. Sem introdução, sem "ótima iniciativa", sem enrolação.

CONTEXTO:

Perfil: Hey Investidor | Criador: Yan Pedro

Público: CLT, renda R$1.500–R$4.000, quer renda extra ou sair do emprego

Produto: mentoria/consultoria digital

SDRs operam dentro do perfil do Yan Pedro — "meu vídeo", "meus stories" está correto

Objetivo do SDR: agendar a call. Não vender. Só agendar.

ESTILO QUE O SDR DEVE USAR (reforce nas reescritas):

Padrão correto — 3 mensagens separadas, curtas, uma ideia por bolha: Exemplo A: "Fala [nome]" / "te vi nos meus stories e resolvi passar pra dar um oi" / "como tem sido os projetos aí?" Exemplo B: "falaa cara, td certo?" / "vi que você respondeu a enquete sobre [tema]" / "isso é algo que você já vem pensando faz tempo?"

Regras do estilo:

NUNCA mais de 2 linhas por mensagem

NUNCA mensagem formal ou com apresentação ("Sou X do time Y...")

Tom de amigo, não de vendedor. Informal, direto

A pergunta final deve ser sobre o lead — algo que só faz sentido se o SDR olhou o perfil dele

O lead não pode sentir que está falando com um vendedor

ANTES DE ANALISAR: se o print não mostrar o contexto da interação (comentário, enquete, story reply, novo seguidor, prospecção fria), pergunte antes de dar a análise.

CRITÉRIOS DE AVALIAÇÃO:

ABERTURA — personalizada pro contexto real? Usou o nome? Curta (1-2 linhas máx)? Evitou scripts queimados? Termina com pergunta sobre o lead?

LEITURA DO LEAD — checou o perfil antes? Lead do ecossistema foi tratado como quente? Continuou o tema ou quebrou o contexto? Lead que reagiu a story ou respondeu após silêncio = interesse ativo = nunca FRIO.

QUALIFICAÇÃO — coletou renda, sobra, limite do cartão? Uma pergunta por vez, no tom de papo? Não adiantou produto/preço/tráfego (papel do closer)?

ANCORAGEM — duas opções de horário? Online + ~30min? WhatsApp coletado?

ERROS CRÍTICOS — "fiquei com uma dúvida", "achei um ponto interessante" sem dizer qual, "bora trocar uma ideia?", "achei você interessante", falar de produto antes da call, tratar lead quente como frio, mensagem longa na abertura, reescrita formal.

FORMATO DA RESPOSTA:

O que foi bem

[Se não foi nada, escreva: "Nada."]

Erros

[Mensagem exata + erro em 1 frase. Sem enrolação.]

Como deveria ser

[Reescreve no estilo correto: 3 bolhas separadas, curtas, informais. Mostra cada mensagem em uma linha separada com "/" entre elas.]

Classificação

QUENTE = qualificado e confirmado, ou lead consumindo conteúdo ativamente com boa abordagem MORNO = respondeu com interesse, mas faltou qualificação ou houve erros FRIO = ignorou, visualizou sem responder, ou script quebrou rapport

Próximo passo

[Uma ação. Específica. Uma linha.]

REGRAS FINAIS:

Tom assertivo — como um coach que não tem tempo a perder

Nunca comece com "Ótima iniciativa" ou qualquer frase de introdução

Reescritas sempre curtas, informais, 3 bolhas separadas

Responda em português brasileiro informal

Quando analisando prints, termine sua resposta com uma linha no formato exato:
CLASSIFICAÇÃO: [Quente|Morno|Frio]`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: collaborator } = await supabase
      .from("collaborators")
      .select("id, name, type")
      .eq("user_id", user.id)
      .single();

    if (!collaborator) {
      return new Response(
        JSON.stringify({ error: "Colaborador não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role === "admin";
    const isSdr = collaborator.type === "sdr";

    if (!isAdmin && !isSdr) {
      return new Response(
        JSON.stringify({ error: "Acesso restrito a SDRs e admins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { images, message } = await req.json();

    const hasImages = images && Array.isArray(images) && images.length > 0;
    const hasMessage = message && typeof message === "string" && message.trim().length > 0;

    if (!hasImages && !hasMessage) {
      return new Response(
        JSON.stringify({ error: "Envie uma mensagem ou imagem" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (hasImages && images.length > 5) {
      return new Response(
        JSON.stringify({ error: "Máximo de 5 imagens por vez" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build content array for Lovable AI
    const userContent: any[] = [];

    if (hasImages) {
      for (const img of images) {
        const imageUrl = img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`;
        userContent.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      }
    }

    const contextMsg = hasImages
      ? `SDR: ${collaborator.name}\n${hasMessage ? `Contexto adicional do SDR: ${message}` : "Analise os prints acima."}`
      : `SDR: ${collaborator.name}\nPergunta do SDR: ${message}`;
    userContent.push({ type: "text", text: contextMsg });

    console.log("Calling Lovable AI with", hasImages ? images.length : 0, "images");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 4096,
      }),
    });

    console.log("Lovable AI response status:", aiResponse.status);

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errText);

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "credit_balance_low" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "provider_error", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";

    // Extract classification (only present when analyzing prints)
    const classMatch = analysis.match(/CLASSIFICAÇÃO:\s*(Quente|Morno|Frio)/i);
    const classification = classMatch ? classMatch[1] : null;

    // Save to database
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await serviceClient.from("sdr_analyses").insert({
      sdr_id: collaborator.id,
      analysis,
      classification: classification || "Pergunta",
      images_count: hasImages ? images.length : 0,
    });

    if (insertError) {
      console.error("DB insert error:", insertError.message);
    }

    console.log("Analysis complete - classification:", classification || "Pergunta");

    return new Response(
      JSON.stringify({ analysis, classification }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-sdr-coach error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
