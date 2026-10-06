'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, LocateFixed, MapPin, Search } from 'lucide-react';
import { cleanCep } from '../lib/demo.mjs';

export default function AddressField({ label, value, onChange, allowGps = false }) {
  const [cep, setCep] = useState('');
  const [number, setNumber] = useState('');
  const [text, setText] = useState(value?.address || '');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const revision = useRef(0);

  useEffect(() => {
    if (value?.address && value.address !== text) setText(value.address);
    if (!value && text.startsWith('Minha localização atual')) setText('');
  }, [value?.address]);

  function edit(next) {
    revision.current += 1;
    setText(next);
    onChange(null);
    setResults([]);
    setError('');
  }

  async function lookupCep() {
    const cleaned = cleanCep(cep);
    if (cleaned.length !== 8) {
      setError('O CEP precisa ter 8 dígitos.');
      return;
    }

    const rev = ++revision.current;
    setBusy('cep');
    setError('');
    onChange(null);
    setResults([]);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Não foi possível consultar o ViaCEP.');
      const data = await response.json();
      if (data.erro) throw new Error('CEP não encontrado. Confira os números.');
      if (revision.current !== rev) return;
      setText([data.logradouro, number, data.bairro, data.localidade, data.uf].filter(Boolean).join(', '));
      if (!data.logradouro) setError('Esse CEP é geral. Complete a rua e o número antes de localizar.');
    } catch (err) {
      if (revision.current === rev) {
        setError(err.name === 'TimeoutError' ? 'O ViaCEP demorou a responder. Tente novamente.' : err.message);
      }
    } finally {
      setBusy('');
    }
  }

  async function search() {
    if (text.trim().length < 5) {
      setError('Informe rua, número e cidade.');
      return;
    }

    const rev = ++revision.current;
    setBusy('search');
    setError('');
    setResults([]);

    try {
      const response = await fetch('/api/geocode?q=' + encodeURIComponent(text.trim()));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (revision.current !== rev) return;
      setResults(data);
      if (!data.length) setError('Nenhum endereço encontrado. Tente incluir o bairro e a cidade.');
    } catch (err) {
      if (revision.current === rev) setError(err.message);
    } finally {
      setBusy('');
    }
  }

  function gps() {
    if (!navigator.geolocation) {
      setError('Este navegador não oferece localização.');
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setError('A localização exige HTTPS ou localhost.');
      return;
    }

    const rev = ++revision.current;
    setBusy('gps');
    setError('');

    navigator.geolocation.getCurrentPosition(
      pos => {
        if (revision.current === rev) {
          const address = 'Minha localização atual';
          setText(address);
          onChange({ address, lat: pos.coords.latitude, lng: pos.coords.longitude });
          setResults([]);
        }
        setBusy('');
      },
      () => {
        setBusy('');
        setError('Não foi possível obter sua posição. Permita a localização no navegador ou informe um endereço.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  }

  return (
    <fieldset className="address-field">
      <legend><MapPin size={14} />{label}</legend>

      <div className="cep-row">
        <label>
          CEP
          <input
            aria-label={`CEP - ${label}`}
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            value={cep}
            onChange={event => setCep(cleanCep(event.target.value))}
          />
        </label>
        <label className="number-field">
          Número
          <input
            aria-label={`Número - ${label}`}
            placeholder="123"
            maxLength={12}
            value={number}
            onChange={event => setNumber(event.target.value)}
          />
        </label>
        <button type="button" className="btn compact" disabled={!!busy} onClick={lookupCep}>
          {busy === 'cep' && <LoaderCircle size={15} className="spin" />}
          Buscar CEP
        </button>
      </div>

      <label>
        Endereço completo
        <div className="address-search">
          <input
            aria-label={`Endereço - ${label}`}
            value={text}
            onChange={event => edit(event.target.value)}
            maxLength={220}
            placeholder="Rua, número, bairro e cidade"
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                search();
              }
            }}
          />
          <button type="button" className="btn compact icon-search" disabled={!!busy} onClick={search}>
            {busy === 'search' ? <LoaderCircle size={16} className="spin" /> : <Search size={16} />}
            <span>Localizar</span>
          </button>
        </div>
      </label>

      {allowGps && (
        <button type="button" className="gps-link" disabled={!!busy} onClick={gps}>
          <LocateFixed size={15} />{busy === 'gps' ? 'Obtendo posição' : 'Usar minha posição atual'}
        </button>
      )}

      {!!results.length && (
        <div className="address-results">
          {results.map((result, index) => (
            <button
              type="button"
              key={`${result.lat}-${result.lng}-${index}`}
              onClick={() => {
                revision.current += 1;
                onChange(result);
                setText(result.address);
                setResults([]);
                setError('');
              }}
            >
              <MapPin size={15} />
              <span>{result.address}</span>
            </button>
          ))}
        </div>
      )}

      {value && <p className="field-success"><Check size={14} />Ponto confirmado</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </fieldset>
  );
}
