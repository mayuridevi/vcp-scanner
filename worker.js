// Optional Cloudflare Worker: a private CORS proxy for Yahoo Finance chart data only.
// Deploy at workers.cloudflare.com, then paste its URL in the app (Data proxy -> My Cloudflare Worker).
export default { async fetch(req) {
  const u = new URL(req.url).searchParams.get('u') || '';
  if (!/^https:\/\/query[12]\.finance\.yahoo\.com\/v8\/finance\/chart\//.test(u)) return new Response('blocked', { status: 403 });
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 300 } });
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
} };
