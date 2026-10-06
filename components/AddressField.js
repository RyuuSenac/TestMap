'use client';
import { useRef, useState } from 'react';
import { MapPin, Search, LocateFixed, Check, LoaderCircle } from 'lucide-react';
import { cleanCep } from '../lib/demo.mjs';
export default function AddressField({ label, value, onChange, allowGps = false }) {
  const [cep,setCep] = useState(''), [number,setNumber] = useState('');
  const [text,setText] = useState(value?.address || ''), [results,setResults] = useState([]), [busy,setBusy] = useState(''), [error,setError] = useState('');
  const revision = useRef(0);
  function edit(next) { revision.current++; setText(next); onChange(null); setResults([]); setError(''); }
  async function lookupCep() {
    const cleaned = cleanCep(cep);
    if (cleaned.length !== 8) { setError('O CEP precisa ter 8 dígitos.'); return; }
    const rev = ++revision.current;
    setBusy('cep'); setError(''); onChange(null); setResults([]);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error('Não foi possível consultar o ViaCEP.');
      const data = await res.json();
      if (data.erro) throw new Error('CEP não encontrado. Confira os números.');
      if (revision.current !== rev) return;
      setText([data.logradouro, number, data.bairro, data.localidade, data.uf].filter(Boolean).join(', '));
      if (!data.logradouro) setError('Esse CEP é geral. Complete a rua e o número antes de localizar.');
    } catch (err) { if (revision.current === rev) setError(err.name === 'TimeoutError' ? 'O ViaCEP demorou a responder. Tente novamente.' : err.message); }
    finally { setBusy(''); }
  }
  async function search() {
    if (text.trim().length < 5) { setError('Informe rua, número e cidade.'); return; }
    const rev = ++revision.current;
    setBusy('search'); setError(''); setResults([]);
    try {
      const res = await fetch('/api/geocode?q=' + encodeURIComponent(text.trim()));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (revision.current !== rev) return;
      setResults(data);
      if (!data.length) setError('Nenhum endereço encontrado. Tente incluir o bairro e a cidade.');
    } catch (err) { if (revision.current === rev) setError(err.message); }
    finally { setBusy(''); }
  }
  function gps() {
    if (!navigator.geolocation) { setError('Este navegador não oferece localização.'); return; }
    const rev = ++revision.current;
    setBusy('gps'); setError('');
    navigator.geolocation.getCurrentPosition(pos => {
      if (revision.current === rev) {
        const address = `Localização atual (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`;
        setText(address); onChange({ address, lat: pos.coords.latitude, lng: pos.coords.longitude }); setResults([]);
      }
      setBusy('');
    }, () => { setBusy(''); setError('Não foi possível obter sua posição. Permita a localização no navegador ou informe um endereço.'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }
  return <fieldset className="address-field"><legend><MapPin size={15}/>{label}</legend>
    <div className="cep-row"><label>CEP<input aria-label={`CEP — ${label}`} placeholder="00000-000" inputMode="numeric" maxLength={9} value={cep} onChange={e=> {setCep(cleanCep(e.target.value)); edit(text);}} /></label><label>Número<input aria-label={`Número — ${label}`} placeholder="123" maxLength={12} value={number} onChange={e=> {setNumber(e.target.value); edit(text);}} /></label><button type="button" className="btn subtle cep-btn" disabled={!!busy} onClick={lookupCep}>{busy==='cep'?<LoaderCircle size={16} className="spin"/>:null}Buscar CEP</button></div>
    <label>Endereço completo<div className="address-search"><input aria-label={`Endereço — ${label}`} value={text} onChange={e=>edit(e.target.value)} maxLength={220} placeholder="Rua, número, bairro e cidade"/><button type="button" className="btn subtle" disabled={!!busy} onClick={search}>{busy==='search'?<LoaderCircle size={16} className="spin"/>:<Search size={16}/>}Localizar</button></div></label>
    {allowGps && <button type="button" className="text-button gps-button" disabled={!!busy} onClick={gps}><LocateFixed size={15}/>{busy==='gps'?'Obtendo posição…':'Usar minha posição atual'}</button>}
    {!!results.length && <div className="address-results">{results.map((result,i)=><button type="button" key={i} onClick={()=> { revision.current++; onChange(result); setText(result.address); setResults([]); setError(''); }}><MapPin size={16}/><span>{result.address}</span></button>)}</div>}
    {value && <p className="field-success"><Check size={14}/>Ponto confirmado no mapa</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <small>ViaCEP preenche o endereço. Clique em Localizar e confirme o resultado para usá-lo na rota.</small>
  </fieldset>;
}
