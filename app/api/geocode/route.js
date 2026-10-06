let lastRequest = 0;
let queue = Promise.resolve();
const cache = new Map();
export async function GET(request) {
  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q || q.length < 5 || q.length > 220) return Response.json({ error: 'Informe rua, número e cidade para localizar o endereço.' }, { status: 400 });
  if (cache.has(q)) return Response.json(cache.get(q));
  // Consultas explícitas, sem autocomplete. Consultas espaçadas e cache em memória para uso leve da demonstração.
  const task = queue.then(async () => {
    if (cache.has(q)) return cache.get(q);
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 1100 - (Date.now() - lastRequest))));
    lastRequest = Date.now();
    const url = new URL('https://photon.komoot.io/api');
    url.search = new URLSearchParams({ q, limit: '5', bbox: '-74,-34,-34,6' }).toString();
    const res = await fetch(url, { headers: { 'User-Agent': `LumioPreview/0.1 (${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'local-development'}; explicit-address-search)` }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error('Serviço indisponível');
    const payload = await res.json();
    if (!Array.isArray(payload.features)) throw new Error('Resposta inválida');
    const data = payload.features.filter(item => item.properties?.countrycode === 'BR' && item.geometry?.type === 'Point').map(item => {
      const p = item.properties;
      return { address: [p.name, p.street, p.housenumber, p.district, p.city, p.state, p.postcode].filter(Boolean).join(', '), lat: item.geometry.coordinates[1], lng: item.geometry.coordinates[0] };
    });
    if (cache.size > 200) cache.clear();
    cache.set(q, data);
    return data;
  });
  queue = task.catch(() => {});
  try { return Response.json(await task); }
  catch { return Response.json({ error: 'A busca de endereços está indisponível. Tente novamente ou use os dados de exemplo.' }, { status: 503 }); }
}
