import {
  AVAILABLE_MODELS,
  validateAuth,
  corsHeaders,
} from "@/lib/ai/openai-compat";

// ---- CORS preflight ----
export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// ---- GET /api/v1/models ----
export function GET(request: Request) {
  const authResult = validateAuth(request.headers);
  if (!authResult.valid) return authResult.error!;

  return Response.json(
    {
      object: "list",
      data: AVAILABLE_MODELS,
    },
    { headers: corsHeaders() },
  );
}
