import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um coach de SDRs especializado em Social Selling para o perfil Hey Investidor no Instagram. O público-alvo são pessoas CLT que querem renda extra ou sair do emprego formal. Analise a conversa nos prints enviados e avalie: (1) qualidade da abertura, (2) personalização da mensagem ao contexto do lead, (3) qualificação financeira feita — renda, sobra mensal, limite do cartão, (4) ancoragem da reunião, (5) erros cometidos. Ao final, reescreva a mensagem que deveria ter sido enviada em cada etapa onde houve erro. Seja direto e específico — cite as mensagens exatas do print.

Ao final da análise, classifique o agendamento em uma das categorias:
- **Quente**: qualificação completa, lead engajado, objeções tratadas
- **Morno**: qualificação parcial, lead respondeu mas sem profundidade
- **Frio**: sem qualificação, lead desinteressado ou abordagem fraca

Termine sua resposta com uma linha no formato exato:
CLASSIFICAÇÃO: [Quente|Morno|Frio]`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);

    if (!authHeader) {
      console.error("Missing Authorization header");
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

    console.log("getUser result - user:", user?.id, "error:", userError?.message);

    if (userError || !user) {
      console.error("Auth validation failed:", userError?.message || "No user returned");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get collaborator info
    const { data: collaborator, error: collabError } = await supabase
      .from("collaborators")
      .select("id, name, type")
      .eq("user_id", user.id)
      .single();

    console.log("Collaborator lookup - found:", !!collaborator, "error:", collabError?.message);

    if (!collaborator) {
      console.error("Collaborator not found for user:", user.id);
      return new Response(
        JSON.stringify({ error: "Colaborador não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role === "admin";
    const isSdr = collaborator.type === "sdr";

    console.log("Access check - role:", roleData?.role, "type:", collaborator.type, "isAdmin:", isAdmin, "isSdr:", isSdr);

    if (!isAdmin && !isSdr) {
      console.error("Access denied - not admin or sdr");
      return new Response(
        JSON.stringify({ error: "Acesso restrito a SDRs e admins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { images, message } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: "Envie pelo menos uma imagem" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (images.length > 5) {
      return new Response(
        JSON.stringify({ error: "Máximo de 5 imagens por vez" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    console.log("ANTHROPIC_API_KEY present:", !!ANTHROPIC_API_KEY);

    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build message content with images for Claude vision API
    const userContent: any[] = [];

    for (const img of images) {
      const base64Data = img.startsWith("data:")
        ? img.split(",")[1]
        : img;
      const mediaType = img.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Data,
        },
      });
    }

    const contextMsg = `SDR: ${collaborator.name}\n${message ? `Contexto adicional do SDR: ${message}` : "Analise os prints acima."}`;
    userContent.push({ type: "text", text: contextMsg });

    console.log("Calling Anthropic API with", images.length, "images");

    const aiResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5-20250514",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: userContent },
          ],
        }),
      }
    );

    console.log("Anthropic API response status:", aiResponse.status);

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Claude API error:", aiResponse.status, errText);

      if (errText.includes("credit balance is too low") || errText.includes("insufficient_quota")) {
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
    const analysis = aiData.content?.[0]?.text || "Não foi possível gerar a análise.";

    // Extract classification
    const classMatch = analysis.match(/CLASSIFICAÇÃO:\s*(Quente|Morno|Frio)/i);
    const classification = classMatch ? classMatch[1] : "Morno";

    // Save to database using service role for insert
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await serviceClient.from("sdr_analyses").insert({
      sdr_id: collaborator.id,
      analysis,
      classification,
      images_count: images.length,
    });

    if (insertError) {
      console.error("DB insert error:", insertError.message);
    }

    console.log("Analysis complete - classification:", classification);

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
