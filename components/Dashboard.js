'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  BusFront,
  Clock3,
  Crosshair,
  Gauge,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  ShieldCheck,
  Smartphone,
  Square,
} from 'lucide-react';
import AddressField from './AddressField';
import { validPoint } from '../lib/demo.mjs';

const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <LoaderCircle className="spin" />
      Preparando mapa
    </div>
  ),
});

const STORAGE_KEY = 'lumio-live-route-v2';

function formatDistance(meters = 0) {
  if (!Number.isFinite(meters)) return '0 m';
  if (meters < 1000) return `${Math.max(0, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
}

function formatDuration(seconds = 0) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function haversine(a, b) {
  if (!a || !b) return Infinity;
  const toRad = value => (value * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

function locateOnRoute(position, path) {
  if (!position || !Array.isArray(path) || path.length < 2) {
    return { progress: 0, distance: Infinity, index: 0 };
  }

  let bestDistance = Infinity;
  let bestIndex = 0;
  for (let index = 0; index < path.length; index += 1) {
    const point = { lat: path[index][0], lng: path[index][1] };
    const distance = haversine(position, point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return {
    progress: bestIndex / Math.max(1, path.length - 1),
    distance: bestDistance,
    index: bestIndex,
  };
}

function getGeoMessage(error) {
  if (error?.code === 1) return 'A permissão de localização foi negada. Libere o acesso nas configurações do navegador.';
  if (error?.code === 2) return 'O dispositivo não conseguiu determinar sua localização agora.';
  if (error?.code === 3) return 'A localização demorou demais para responder. Tente novamente em uma área com melhor sinal.';
  return 'Não foi possível acessar a localização deste dispositivo.';
}

export default function Dashboard({ publicView = false }) {
  const watchId = useRef(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [heading, setHeading] = useState(null);
  const [lastFix, setLastFix] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [notice, setNotice] = useState('');
  const [follow, setFollow] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && validPoint(saved.origin)) setOrigin(saved.origin);
      if (saved && validPoint(saved.destination)) setDestination(saved.destination);
    } catch {
      // Ignora dados locais antigos ou corrompidos.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ origin, destination }));
    } catch {
      // O app continua funcionando sem persistência local.
    }
  }, [origin, destination, loaded]);

  useEffect(() => {
    setRouteData(null);
    setNotice('');
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const routeMatch = useMemo(
    () => locateOnRoute(position, routeData?.path),
    [position, routeData?.path]
  );

  const remainingDistance = useMemo(() => {
    if (!routeData) return 0;
    return routeData.distance * (1 - routeMatch.progress);
  }, [routeData, routeMatch.progress]);

  const remainingDuration = useMemo(() => {
    if (!routeData) return 0;
    return routeData.duration * (1 - routeMatch.progress);
  }, [routeData, routeMatch.progress]);

  const destinationDistance = useMemo(() => {
    if (!position || !destination) return null;
    return haversine(position, destination);
  }, [position, destination]);

  const offRoute = Boolean(
    tracking &&
      routeData &&
      Number.isFinite(routeMatch.distance) &&
      routeMatch.distance > Math.max(120, (accuracy || 0) * 2)
  );

  const routeStops = useMemo(() => {
    const stops = [];
    if (origin) stops.push({ ...origin, name: 'Origem' });
    if (destination) stops.push({ ...destination, name: 'Destino' });
    return stops;
  }, [origin, destination]);

  async function requestRoute(points, successMessage) {
    setRouteBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível calcular a rota.');
      setRouteData(data);
      setNotice(successMessage);
      return true;
    } catch (error) {
      setNotice(error.message || 'Não foi possível calcular a rota.');
      return false;
    } finally {
      setRouteBusy(false);
    }
  }

  async function calculateRoute() {
    if (!origin || !destination) {
      setNotice('Confirme a origem e o destino antes de calcular a rota.');
      return;
    }
    await requestRoute([origin, destination], 'Rota pronta. Ative o GPS para acompanhar sua posição real no trajeto.');
  }

  async function recalculateFromCurrentPosition() {
    if (!position || !destination) {
      setNotice('Ative o GPS e confirme um destino antes de recalcular.');
      return;
    }
    const current = {
      address: 'Minha localização atual',
      lat: position.lat,
      lng: position.lng,
    };
    setOrigin(current);
    await requestRoute([current, destination], 'Rota atualizada a partir da sua localização real.');
  }

  function startTracking() {
    setGeoError('');
    setNotice('');

    if (!navigator.geolocation) {
      setGeoError('Este navegador não oferece suporte à geolocalização.');
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setGeoError('A localização real exige HTTPS. Abra o projeto por HTTPS ou use localhost durante o desenvolvimento.');
      return;
    }

    if (watchId.current !== null) return;

    watchId.current = navigator.geolocation.watchPosition(
      result => {
        const next = {
          lat: result.coords.latitude,
          lng: result.coords.longitude,
        };
        setPosition(next);
        setAccuracy(Number.isFinite(result.coords.accuracy) ? result.coords.accuracy : null);
        setSpeed(Number.isFinite(result.coords.speed) ? result.coords.speed : null);
        setHeading(Number.isFinite(result.coords.heading) ? result.coords.heading : null);
        setLastFix(result.timestamp || Date.now());
        setGeoError('');
        setTracking(true);
      },
      error => {
        setGeoError(getGeoMessage(error));
        setTracking(false);
        if (watchId.current !== null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 3000,
      }
    );
    setTracking(true);
  }

  function stopTracking() {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    setTracking(false);
  }

  return (
    <div className="lumio-app">
      <header className="app-header">
        <a href="/" className="brand" aria-label="Lumio">
          <span className="brand-mark"><BusFront size={22} /></span>
          <span>lumio<span className="brand-dot">.</span></span>
        </a>
        <div className="header-status">
          <span className={`status-dot ${tracking ? 'online' : ''}`} />
          {tracking ? 'GPS ativo' : 'GPS desligado'}
        </div>
      </header>

      <main className="page-shell">
        <section className="hero-copy">
          <div>
            <span className="eyebrow">ACOMPANHAMENTO REAL</span>
            <h1>{publicView ? 'Sua rota, acompanhada pelo dispositivo.' : 'Veja o trajeto acontecer de verdade.'}</h1>
            <p>
              Defina origem e destino, calcule o caminho e acompanhe a posição real deste dispositivo pelo GPS do navegador.
            </p>
          </div>
          <div className="privacy-chip"><ShieldCheck size={16} /> GPS controlado pelo navegador</div>
        </section>

        <section className="tracker-layout">
          <aside className="control-panel card">
            <div className="panel-heading">
              <div>
                <span className="section-label">ROTA</span>
                <h2>Defina o trajeto</h2>
              </div>
              <Route size={21} />
            </div>

            <AddressField label="Origem" value={origin} onChange={setOrigin} allowGps />
            <AddressField label="Destino" value={destination} onChange={setDestination} />

            <button className="btn primary full" onClick={calculateRoute} disabled={routeBusy || !origin || !destination}>
              {routeBusy ? <LoaderCircle className="spin" size={17} /> : <Navigation size={17} />}
              {routeBusy ? 'Calculando rota' : 'Calcular rota'}
            </button>

            <div className="tracking-box">
              <div className="tracking-copy">
                <div className={`tracking-icon ${tracking ? 'active' : ''}`}><LocateFixed size={19} /></div>
                <div>
                  <strong>Localização do dispositivo</strong>
                  <span>{tracking ? 'Atualizando em tempo real' : 'Use o GPS para mover o marcador real'}</span>
                </div>
              </div>
              {!tracking ? (
                <button className="btn secondary full" onClick={startTracking}>
                  <Crosshair size={17} /> Ativar GPS
                </button>
              ) : (
                <button className="btn danger full" onClick={stopTracking}>
                  <Square size={15} /> Parar acompanhamento
                </button>
              )}
            </div>

            {tracking && position && destination && (
              <button className="btn ghost full" onClick={recalculateFromCurrentPosition} disabled={routeBusy}>
                <RefreshCw size={16} className={routeBusy ? 'spin' : ''} /> Recalcular daqui
              </button>
            )}

            {geoError && <div className="message error"><AlertTriangle size={17} /><span>{geoError}</span></div>}
            {notice && <div className="message"><ShieldCheck size={17} /><span>{notice}</span></div>}

            <div className="secure-note">
              <Smartphone size={17} />
              <p>No celular, aceite a permissão de localização. Em produção, geolocalização funciona em HTTPS. Ao calcular a rota, os pontos são enviados ao serviço de rotas.</p>
            </div>
          </aside>

          <section className="map-card card">
            <div className="map-toolbar">
              <div>
                <span className="section-label">MAPA AO VIVO</span>
                <h2>{tracking ? 'Acompanhando seu dispositivo' : routeData ? 'Rota calculada' : 'Aguardando rota'}</h2>
              </div>
              <button className={`follow-toggle ${follow ? 'active' : ''}`} onClick={() => setFollow(value => !value)}>
                <Crosshair size={15} /> {follow ? 'Seguindo GPS' : 'Mapa livre'}
              </button>
            </div>

            <div className="map-frame">
              <RouteMap
                path={routeData?.path || []}
                stops={routeStops}
                position={position}
                accuracy={accuracy}
                follow={follow && tracking}
                mapId="live-device-route"
              />
              <div className="map-overlay-status">
                <span className={`live-pulse ${tracking ? 'active' : ''}`} />
                <div>
                  <strong>{tracking ? 'Posição real' : 'GPS não iniciado'}</strong>
                  <span>{tracking ? 'Atualizada pelo navegador' : 'Ative o GPS para acompanhar'}</span>
                </div>
              </div>
            </div>

            <div className="metrics-grid">
              <Metric icon={Route} label="Distância da rota" value={routeData ? formatDistance(routeData.distance) : '--'} />
              <Metric icon={Clock3} label="Tempo estimado" value={routeData ? formatDuration(routeData.duration) : '--'} />
              <Metric icon={Gauge} label="Velocidade GPS" value={speed !== null ? `${Math.max(0, speed * 3.6).toFixed(1)} km/h` : '--'} />
              <Metric icon={Crosshair} label="Precisão" value={accuracy !== null ? `± ${Math.round(accuracy)} m` : '--'} />
            </div>
          </section>
        </section>

        <section className="live-summary card">
          <div className="summary-main">
            <div className="summary-icon"><MapPin size={22} /></div>
            <div>
              <span className="section-label">PROGRESSO REAL</span>
              <h2>{offRoute ? 'Você está fora do traçado calculado.' : tracking && routeData ? 'Sua posição está sendo comparada com a rota.' : 'Ative o GPS para medir o progresso.'}</h2>
              <p>
                {destinationDistance !== null
                  ? `Distância em linha reta até o destino: ${formatDistance(destinationDistance)}.`
                  : 'O progresso só muda quando a localização do dispositivo muda.'}
              </p>
            </div>
          </div>

          <div className="progress-panel">
            <div className="progress-head">
              <span>Progresso aproximado</span>
              <strong>{tracking && routeData ? `${Math.round(routeMatch.progress * 100)}%` : '--'}</strong>
            </div>
            <div className="progress-track"><span style={{ width: `${tracking && routeData ? routeMatch.progress * 100 : 0}%` }} /></div>
            <div className="progress-meta">
              <span>{tracking && routeData ? `${formatDistance(remainingDistance)} restantes na rota` : 'Sem dados de rota ao vivo'}</span>
              <span>{tracking && routeData ? `aprox. ${formatDuration(remainingDuration)}` : lastFix ? new Date(lastFix).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Aguardando GPS'}</span>
            </div>
          </div>
        </section>

        <footer className="page-footer">
          <span>lumio<span className="brand-dot">.</span></span>
          <span>Rota calculada por endereços. Movimento exibido somente pela localização real do dispositivo.</span>
        </footer>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <span className="metric-icon"><Icon size={17} /></span>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}
