'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [-23.5505, -46.6333];

export default function RouteMap({ path = [], stops = [], position, accuracy, follow = false, mapId }) {
  const root = useRef(null);
  const map = useRef(null);
  const leaflet = useRef(null);
  const routeLayer = useRef(null);
  const stopLayer = useRef(null);
  const liveMarker = useRef(null);
  const accuracyCircle = useRef(null);
  const [ready, setReady] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);

  useEffect(() => {
    let disposed = false;

    import('leaflet').then(module => {
      if (disposed || !root.current) return;
      const L = module.default;
      leaflet.current = L;

      map.current = L.map(root.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: true,
      }).setView(DEFAULT_CENTER, 13);

      L.control.zoom({ position: 'bottomright' }).addTo(map.current);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        className: 'dark-map-tiles',
      }).addTo(map.current);
      tiles.on('tileerror', () => setTilesFailed(true));

      routeLayer.current = L.layerGroup().addTo(map.current);
      stopLayer.current = L.layerGroup().addTo(map.current);

      const observer = new ResizeObserver(() => map.current?.invalidateSize());
      observer.observe(root.current);
      map.current._lumioObserver = observer;
      setReady(true);
    });

    return () => {
      disposed = true;
      map.current?._lumioObserver?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current || !leaflet.current) return;
    const L = leaflet.current;

    routeLayer.current.clearLayers();
    stopLayer.current.clearLayers();

    if (Array.isArray(path) && path.length > 1) {
      L.polyline(path, { color: '#07110f', weight: 10, opacity: 0.72, lineCap: 'round' }).addTo(routeLayer.current);
      L.polyline(path, { color: '#65e5b5', weight: 5, opacity: 0.96, lineCap: 'round' }).addTo(routeLayer.current);
    }

    stops.forEach((stop, index) => {
      if (!Number.isFinite(stop?.lat) || !Number.isFinite(stop?.lng)) return;
      const isDestination = index === stops.length - 1 && stops.length > 1;
      const icon = L.divIcon({
        className: 'map-pin-wrapper',
        html: `<div class="route-pin ${isDestination ? 'destination' : 'origin'}">${isDestination ? 'B' : 'A'}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      L.marker([stop.lat, stop.lng], { icon })
        .bindPopup(`<strong>${stop.name || (isDestination ? 'Destino' : 'Origem')}</strong><br/>${stop.address || ''}`)
        .addTo(stopLayer.current);
    });

    const boundsPoints = [];
    if (Array.isArray(path)) boundsPoints.push(...path);
    stops.forEach(stop => {
      if (Number.isFinite(stop?.lat) && Number.isFinite(stop?.lng)) boundsPoints.push([stop.lat, stop.lng]);
    });

    if (boundsPoints.length > 1) {
      map.current.fitBounds(L.latLngBounds(boundsPoints), { padding: [42, 42], maxZoom: 16 });
    } else if (boundsPoints.length === 1) {
      map.current.setView(boundsPoints[0], 16);
    }
  }, [ready, path, stops, mapId]);

  useEffect(() => {
    if (!ready || !map.current || !leaflet.current || !position) return;
    const L = leaflet.current;
    const latLng = [position.lat, position.lng];

    if (!liveMarker.current) {
      const icon = L.divIcon({
        className: 'map-pin-wrapper live-marker-wrapper',
        html: '<div class="live-device-marker"><span></span></div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      liveMarker.current = L.marker(latLng, { icon, zIndexOffset: 2000 }).addTo(map.current);
    } else {
      liveMarker.current.setLatLng(latLng);
    }

    if (Number.isFinite(accuracy) && accuracy > 0) {
      if (!accuracyCircle.current) {
        accuracyCircle.current = L.circle(latLng, {
          radius: accuracy,
          color: '#65e5b5',
          weight: 1,
          opacity: 0.55,
          fillColor: '#65e5b5',
          fillOpacity: 0.08,
        }).addTo(map.current);
      } else {
        accuracyCircle.current.setLatLng(latLng);
        accuracyCircle.current.setRadius(accuracy);
      }
    }

    if (follow) map.current.setView(latLng, Math.max(map.current.getZoom(), 16), { animate: true });
  }, [ready, position, accuracy, follow]);

  return (
    <div className="map-wrap">
      <div ref={root} className="route-map" aria-label="Mapa da rota e localização real do dispositivo" />
      {tilesFailed && <div className="map-warning">O mapa base não carregou. A rota e o GPS continuam ativos.</div>}
      <button
        className="map-center"
        type="button"
        onClick={() => position && map.current?.setView([position.lat, position.lng], 17)}
        disabled={!position}
        aria-label="Centralizar na localização atual"
      >
        ◎
      </button>
    </div>
  );
}
