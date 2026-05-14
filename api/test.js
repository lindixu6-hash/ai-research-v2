export default function handler() {
  return new Response(JSON.stringify({ status: 'ok', message: 'API is working' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
