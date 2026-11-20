import { useEffect, useState, useRef } from 'react';
import { api, fechaHora } from '../api.js';
import Icono from './Icono.jsx';

export default function Notificaciones() {
  const [lista, setLista] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  const cargar = () => api('/notificaciones').then(setLista).catch(() => {});
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 120000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const fuera = (e) => ref.current && !ref.current.contains(e.target) && setAbierto(false);
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const sinLeer = lista.filter((n) => !n.leida).length;
  const abrir = async () => {
    setAbierto(!abierto);
    if (!abierto && sinLeer) {
      await api('/notificaciones/leer', { method: 'POST' }).catch(() => {});
      setTimeout(() => setLista((l) => l.map((n) => ({ ...n, leida: true }))), 1500);
    }
  };

  return (
    <div className="notif" ref={ref}>
      <button className="btn-icono campana" onClick={abrir} aria-label="Notificaciones">
        <Icono nombre="campana" />
        {sinLeer > 0 && <span className="globo">{sinLeer}</span>}
      </button>
      {abierto && (
        <div className="notif-panel">
          <h4>Recordatorios</h4>
          {!lista.length && <p className="tenue">Aún no tienes recordatorios. Te avisaremos 72 y 24 horas antes de cada entrega.</p>}
          {lista.map((n) => (
            <div key={n.id} className={`notif-item ${n.leida ? '' : 'nueva'}`}>
              <strong>{n.titulo}</strong>
              <p>{n.mensaje}</p>
              <small>{fechaHora(n.creado_en)}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
