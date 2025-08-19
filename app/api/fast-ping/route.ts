// Minimal ping with no processing - fastest possible response
export function GET() {
  return Response.json({ ok: true, t: Date.now() });
}

export const POST = GET;
