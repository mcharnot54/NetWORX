// Ultra-minimal ping endpoint with no imports or processing
export function GET() {
  return new Response(`{"status":"ok","time":${Date.now()}}`, {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const POST = GET;
export const HEAD = GET;
