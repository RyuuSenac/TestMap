import { DEMO_DURATION, DEMO_PATH, DEMO_STOPS } from '../../../lib/demo.mjs';
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ serverTime: Date.now(), duration: DEMO_DURATION, path: DEMO_PATH, stops: DEMO_STOPS, simulated: true }, { headers: { 'Cache-Control': 'no-store' } });
}
