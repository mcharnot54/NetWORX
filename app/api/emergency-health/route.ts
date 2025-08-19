// Emergency health check with zero imports
export function GET() {
  return new Response('{"status":"ok","time":' + Date.now() + '}', {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
  });
}
