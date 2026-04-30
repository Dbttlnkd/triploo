// who-points — Claude Vision proxy for the "qui pointe ?" feature.
// Receives a JPEG/PNG as base64, asks Claude Sonnet 4.6 to rank pétanque
// boules by distance to the cochonnet, and returns a structured verdict.
//
// Requires the ANTHROPIC_API_KEY secret to be set in the Supabase project.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-sonnet-4-6";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT = `Tu analyses une photo de partie de pétanque pour répondre à la question « qui pointe ? ».

Procédure :
1. Repère le cochonnet (la petite boule, généralement jaune, rouge ou verte, plus petite que les boules en métal).
2. Identifie les deux équipes de boules métalliques. Distingue-les par leur motif (rayures, lisses, points, couleur dominante, gravures).
3. Classe les boules visibles par distance au cochonnet, de la plus proche à la plus éloignée.
4. Donne le verdict : quelle équipe pointe (a la boule la plus proche), et combien de leurs boules sont plus proches que la première boule de l'équipe adverse.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format :
{
  "ok": true,
  "verdict": {
    "winner": "A" | "B",
    "lead_count": <integer>,
    "confidence": "high" | "medium" | "low"
  },
  "team_a": "<courte description visuelle, ex. 'striées'>",
  "team_b": "<courte description visuelle, ex. 'lisses'>",
  "ranking": [
    { "rank": 1, "team": "A" | "B", "estimated_cm": <integer>, "color_desc": "<short>" }
  ],
  "notes": "<phrase courte en français sur ce que tu vois>"
}

Si l'image ne montre pas une scène de pétanque, réponds :
{ "ok": false, "error": "not_petanque", "notes": "<ce que tu vois>" }`;

function jsonResponse(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }
  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ ok: false, error: "missing_api_key" }, 500);
  }

  let body: { image_base64?: string; mime?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const image_base64 = body?.image_base64;
  const mime = body?.mime || "image/jpeg";
  if (!image_base64 || typeof image_base64 !== "string") {
    return jsonResponse({ ok: false, error: "missing_image" }, 400);
  }

  const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data: image_base64 } },
          { type: "text", text: PROMPT },
        ],
      }],
    }),
  });

  if (!claudeResp.ok) {
    const detail = await claudeResp.text();
    return jsonResponse({
      ok: false,
      error: "anthropic_error",
      status: claudeResp.status,
      detail,
    }, 502);
  }

  const data = await claudeResp.json();
  const text: string = data?.content?.[0]?.text || "";

  let parsed: unknown = null;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    // parsed stays null
  }

  if (!parsed) {
    return jsonResponse({
      ok: false,
      error: "could_not_parse",
      raw_text: text,
    }, 502);
  }

  return jsonResponse({ ...parsed, usage: data?.usage });
});
