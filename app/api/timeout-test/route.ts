// Immediate response endpoint to test server responsiveness
export async function GET() {
  const start = Date.now();
  
  // Return immediately without any imports or complex logic
  return new Response(
    JSON.stringify({ 
      message: 'Server responding',
      timestamp: start,
      responseTime: Date.now() - start
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
