// AI Suggest for item details using Lovable AI Gateway (no key required).
// Given a partial item (part_no, name_ar, brand, category names), returns
// a suggested English description and a suggested category code/name.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestRequest {
  part_no?: string;
  name_ar?: string;
  name_en?: string;
  brand?: string;
  model_no?: string;
  notes?: string;
  categories?: Array<{ code: string; name_ar: string; name_en?: string | null }>;
}

interface SuggestResponse {
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  category_code: string | null;
  reasoning: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json()) as SuggestRequest;
    if (!body || (!body.part_no && !body.name_ar && !body.brand)) {
      return new Response(
        JSON.stringify({ error: 'At least one of part_no/name_ar/brand is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cats = (body.categories ?? []).slice(0, 60);
    const catList = cats
      .map((c) => `- ${c.code}: ${c.name_ar}${c.name_en ? ` / ${c.name_en}` : ''}`)
      .join('\n');

    const userPayload = {
      part_no: body.part_no ?? '',
      name_ar: body.name_ar ?? '',
      name_en: body.name_en ?? '',
      brand: body.brand ?? '',
      model_no: body.model_no ?? '',
      notes: body.notes ?? '',
    };

    const sys = `You are an inventory data assistant for an Arabic/English warehouse system.
Produce JSON with keys: name_en, name_ar, description_en, description_ar, category_code, reasoning.

RULES FOR name_en / name_ar (CRITICAL — STRICT):
- A SHORT generic product TYPE label only. Like a dictionary entry.
- MAXIMUM 4 WORDS. Hard limit.
- NO brand names (no Toyota, Bosch, etc.).
- NO part numbers, NO digits.
- NO marketing words (no "genuine", "original", "أصلي", "premium", "ensures", "يضمن").
- NO punctuation, NO commas, NO colons, NO sentences.
- Just the noun phrase identifying WHAT the item is.

EXAMPLES (correct):
  name_en: "Fuel Filter"        name_ar: "فلتر وقود"
  name_en: "Brake Pad"          name_ar: "تيل فرامل"
  name_en: "Engine Oil"         name_ar: "زيت محرك"
  name_en: "Air Filter"         name_ar: "فلتر هواء"

EXAMPLES (WRONG — never do this):
  "Genuine Toyota fuel filter, part number 2330031170..."
  "فلتر وقود تويوتا أصلي، رقم القطعة..."
  "Fuel Filter for Toyota Camry 2020"

description_en / description_ar: longer text (max 140 chars) — brand, function, fitment go HERE, not in the name.
category_code: best match from list below, or null.
reasoning: max 80 chars.

Available categories:
${catList || '(none)'}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify(userPayload) },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502;
      return new Response(
        JSON.stringify({ error: 'AI request failed', detail: text }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: SuggestResponse;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        name_en: '',
        name_ar: '',
        description_en: '',
        description_ar: '',
        category_code: null,
        reasoning: 'AI returned non-JSON',
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message || err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});