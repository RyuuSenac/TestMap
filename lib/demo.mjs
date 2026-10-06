export const DEMO_DURATION = 240000;
export const DEMO_STOPS = [
  { name: 'Saída da van', address: 'Praça Oswaldo Cruz · São Paulo', lat: -23.5712, lng: -46.6441, type: 'start' },
  { name: 'Parada demonstrativa 1', address: 'Av. Paulista, 900 · Bela Vista', lat: -23.5674, lng: -46.6504, type: 'pickup' },
  { name: 'Parada demonstrativa 2', address: 'Rua Pamplona, 900 · Jardim Paulista', lat: -23.5684, lng: -46.6572, type: 'pickup' },
  { name: 'Escola demonstrativa', address: 'Alameda Santos, 1800 · Jardim Paulista', lat: -23.5623, lng: -46.6598, type: 'school' }
];
// Traçado ilustrativo fixo: a demonstração não depende da disponibilidade de APIs externas.
export const DEMO_PATH = [
  [-23.5712,-46.6441],[-23.5704,-46.6453],[-23.5696,-46.6465],[-23.5688,-46.6478],
  [-23.5681,-46.6490],[-23.5674,-46.6504],[-23.5666,-46.6517],[-23.5658,-46.6531],
  [-23.5651,-46.6544],[-23.5660,-46.6554],[-23.5670,-46.6563],[-23.5684,-46.6572],
  [-23.5676,-46.6586],[-23.5668,-46.6600],[-23.5659,-46.6614],[-23.5650,-46.6606],
  [-23.5640,-46.6602],[-23.5631,-46.6600],[-23.5623,-46.6598]
];
export function simulationAt(time, path = DEMO_PATH, duration = DEMO_DURATION) {
  const progress = ((time % duration) + duration) % duration / duration;
  const index = progress * (path.length - 1);
  const lower = Math.floor(index), fraction = index - lower;
  const a = path[lower], b = path[Math.min(lower + 1, path.length - 1)];
  return { progress, position: [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction], remaining: Math.ceil((1 - progress) * duration / 1000), nextStop: progress < 5/18 ? 1 : progress < 11/18 ? 2 : 3 };
}
export function validPoint(p) {
  return p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}
export function cleanCep(value) { return value.replace(/\D/g, '').slice(0, 8); }
export function validChild(child) {
  return child && typeof child.id === 'string' && typeof child.name === 'string' && child.name.trim().length > 0 && child.name.length <= 80 && ['Manhã', 'Tarde', 'Integral'].includes(child.shift) && validPoint(child.home) && validPoint(child.school);
}
