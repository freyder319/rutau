import { useState } from 'react';
import { api, fechaHora, ESFUERZOS } from '../api.js';
import { Error } from './comunes.jsx';
import Icono from './Icono.jsx';

export default function ImportarICS({ onListo }) {
  const [items, setItems] = useState(null);
  const [sel, setSel] = useState({});
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const leer = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError(''); setCargando(true);
    try {
      const contenido = await archivo.text();
      const r = await api('/entregas/ics/previsualizar', { method: 'POST', body: { contenido } });
      setItems(r.items);
      setSel(Object.fromEntries(r.items.map((it) => [it.uid, true])));
    } catch (err) { setError(err.message); } finally { setCargando(false); }
  };

  const cambiarEsfuerzo = (uid, esfuerzo) => setItems(items.map((it) => (it.uid === uid ? { ...it, esfuerzo } : it)));

  const importar = async () => {
    setCargando(true);
    try {
      const r = await api('/entregas/ics/importar', { method: 'POST', body: { items: items.filter((it) => sel[it.uid]) } });
      onListo(r.creadas);
    } catch (err) { setError(err.message); } finally { setCargando(false); }
  };

  return (
    <div className="importar">
      {!items && (
        <>
          <p>Descarga el calendario de tu aula virtual en formato <b>.ics</b> (en Canvas: <i>Calendario → Fuente del calendario</i>) y súbelo aquí.
            RutaU toma las fechas de entrega y la materia de cada actividad.</p>
          <label className="zona-archivo">
            <Icono nombre="subir" size={28} />
            <span>{cargando ? 'Leyendo calendario…' : 'Elegir archivo .ics'}</span>
            <input type="file" accept=".ics,text/calendar" onChange={leer} hidden />
          </label>
        </>
      )}
      {items && !items.length && <p>No encontramos entregas futuras en ese calendario.</p>}
      {items?.length > 0 && (
        <>
          <p className="tenue">Encontramos {items.length} actividades futuras. Revisa el esfuerzo estimado y elige cuáles importar.</p>
          <div className="lista-import">
            {items.map((it) => (
              <div key={it.uid} className="item-import">
                <input type="checkbox" checked={!!sel[it.uid]} onChange={(e) => setSel({ ...sel, [it.uid]: e.target.checked })} />
                <div>
                  <strong>{it.titulo}</strong>
                  <small>{it.materia || 'Sin materia'} · {fechaHora(it.fecha_limite)}</small>
                </div>
                <select value={it.esfuerzo} onChange={(e) => cambiarEsfuerzo(it.uid, e.target.value)}>
                  {Object.entries(ESFUERZOS).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button className="btn btn-primario ancho" onClick={importar} disabled={cargando}>
            Importar {Object.values(sel).filter(Boolean).length} entregas
          </button>
        </>
      )}
      <Error msg={error} />
    </div>
  );
}
