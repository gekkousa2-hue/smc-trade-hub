import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sen professional SMC (Smart Money Concepts) treyderisan. Sening ismging Trade-AI. Foydalanuvchi senga trading grafigi rasmi yoki savol yuboradi.

Har bir tahlilni quyidagi formatda ber:
📊 **Signal:** [BUY / SELL / WAIT]
🏗 **SMC Struktura:** [MSB (Market Structure Break), BOS (Break of Structure), Order Block, FVG (Fair Value Gap), Liquidity Sweep va boshqalar]
💡 **Tavsiya:** [Professional SMC terminologiyasida qisqa tavsiya]
📈 **Kirish nuqtasi:** [Taxminiy narx yoki zona]
🎯 **Target:** [Take Profit zona]
🛡 **Stop Loss:** [SL zona]

Agar rasm bo'lmasa yoki savol trading bilan bog'liq bo'lsa, professional tarzda javob ber.
Barcha javoblarni o'zbek tilida ber.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: message || "Bu trading grafikni tahlil qil. SMC nuqtai nazaridan signal, struktura va tavsiya ber." },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: message || "Trading haqida maslahat ber",
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Iltimos, biroz kutib qaytadan urinib ko'ring." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredit tugagan. Iltimos, workspace sozlamalaridan kredit qo'shing." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI xizmati vaqtinchalik ishlamayapti" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "Tahlil natijasini olishda xatolik yuz berdi.";

    return new Response(JSON.stringify({ content: aiContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trade-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
