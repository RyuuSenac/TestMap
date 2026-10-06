import { validPoint } from '../../../lib/demo.mjs';
export async function POST(request) {
  let points;
  try { ({ points } = await request.json()); } catch { return Response.json({ error: 'Dados inválidos.' }, { status: 400 }); }
  if (!Array.isArray(points) || points.length < 2 || points.length > 25 || !points.every(validPoint)) return Response.json({ error: 'Selecione entre 2 e 25 pontos válidos.' }, { status: 400 });
  try {
    const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('Serviço indisponível');
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return Response.json({ error: 'Não foi possível encontrar uma rota entre os endereços. Confira os pontos selecionados.' }, { status: 422 });
    const route = data.routes[0];
    return Response.json({ path: route.geometry.coordinates.map(([lng,lat]) => [lat,lng]), distance: route.distance, duration: route.duration });
  } catch { return Response.json({ error: 'O serviço gratuito de rotas está indisponível. Seus cadastros foram mantidos; tente novamente em alguns instantes.' }, { status: 503 }); }
}
