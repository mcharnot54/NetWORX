<<<<<<< HEAD
// Ultra-minimal ping endpoint with no imports or processing
export function GET() {
  return new Response(`{"status":"ok","time":${Date.now()}}`, {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const POST = GET;
export const HEAD = GET;
=======
// Ultra-simple ping endpoint with no external dependencies
export async function GET() {
  return new Response(
    JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      server: 'running'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
>>>>>>> mcharnot54/main
