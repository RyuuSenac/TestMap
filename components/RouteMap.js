'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
export default function RouteMap({ path, stops, position, mapId }) {
  const root = useRef(null), map = useRef(null), layers = useRef(null), vehicle = useRef(null), leaflet = useRef(null);
  const [ready, setReady] = useState(false), [tilesFailed, setTilesFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    import('leaflet').then(module => {
      if (disposed || !root.current) return;
      const L = module.default;
      leaflet.current = L;
      map.current = L.map(root.current, { zoomControl: false, scrollWheelZoom: false }).setView([-23.565,-46.654], 15);
      L.control.zoom({ position: 'bottomright' }).addTo(map.current);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map.current);
      tiles.on('tileerror', () => setTilesFailed(true));
      layers.current = L.layerGroup().addTo(map.current);
      const observer = new ResizeObserver(() => map.current?.invalidateSize());
      observer.observe(root.current);
      map.current._lumioObserver = observer;
      setReady(true);
    });
    return () => { disposed = true; map.current?._lumioObserver?.disconnect(); map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const L = leaflet.current;
    layers.current.clearLayers(); vehicle.current = null;
    L.polyline(path, { color: '#ffffff', weight: 9, opacity: .9 }).addTo(layers.current);
    L.polyline(path, { color: '#16856c', weight: 5, opacity: .95, lineCap: 'round' }).addTo(layers.current);
    stops.forEach((stop, index) => {
      const element = document.createElement('div');
      element.className = 'stop-pin ' + (index === stops.length - 1 ? 'school-pin' : '');
      element.textContent = index === stops.length - 1 ? 'E' : String(index + 1);
      const icon = L.divIcon({ className: 'map-pin-wrapper', html: element, iconSize: [30,30], iconAnchor: [15,15] });
      const label = document.createElement('div'); label.textContent = stop.name;
      L.marker([stop.lat,stop.lng], { icon }).bindPopup(label).addTo(layers.current);
    });
    const icon = L.divIcon({ className: 'map-pin-wrapper', html: '<div class="van-pin"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="16" rx="4"/><path d="M4 10h16M8 6h8M7 19v3M17 19v3"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/></svg></div>', iconSize: [48,48], iconAnchor: [24,24] });
    vehicle.current = L.marker(path[0], { icon, zIndexOffset: 1000 }).addTo(layers.current);
    map.current.fitBounds(L.latLngBounds(path), { padding: [45,45], maxZoom: 15 });
  }, [ready, path, stops, mapId]);
  useEffect(() => { if (ready && position) vehicle.current?.setLatLng(position); }, [ready, position]);
  return <div className="map-wrap"><div ref={root} className="route-map" aria-label="Mapa do trajeto e posição simulada da van" />{tilesFailed && <div className="map-warning">Mapa base indisponível. O traçado e a simulação continuam ativos.</div>}<button className="map-center" onClick={() => { if (position) map.current?.setView(position,16); }} aria-label="Centralizar na van">◎</button></div>;
}
