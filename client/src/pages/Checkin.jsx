import { useEffect, useState } from 'react';
import { api, fecha, hora } from '../api.js';
import { Vacio } from '../components/comunes.jsx';
import Icono from '../components/Icono.jsx';

export default function Checkin() {
  const [bloques, setBloques] = useState(null);
  const [marcas, setMarcas] = useState({});
  const [msg, setMsg] = useState('');

  const cargar = () => api('/checkin').then((b) => {
    setBloques(b);
    setMarcas(Object.fromEntries(b.filter((x) => x.estado !== 'pendiente').map((x) => [x.id, x.estado])));
  });
  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    const lista = Object.entries(marcas).map(([id, estado]) => ({ id: Number(id), estado }));
    const r = await api('/checkin', { method: 'POST', body: { marcas: lista } });
    setMsg(`¡Check-in guardado! Marcaste ${r.marcados} bloque(s) y tu plan se recalculó.`);
    cargar();
  };

  if (!bloques) return <div className="cargando">Cargando…</div>;
  const sinMarcar = bloques.filter((b) => b.estado === 'pendiente').length;

  return (
    <div className="pagina">
      <div className="cabecera-pagina">
        <div>
          <h1>Check-in semanal</h1>
          <p className="tenue">Marca lo que cumpliste. Lo que no pudiste hacer vuelve a tu plan en las horas libres que te quedan.</p>
        </div>
      </div>
      {msg && <div className="aviso aviso-ok">{msg}</div>}
      {!bloques.length && <Vacio titulo="Nada que marcar todavía"><p>Cuando pase la hora de tus bloques de estudio, aparecerán aquí.</p></Vacio>}
      {bloques.length > 0 && (
        <section className="tarjeta">
          <div className="tarjeta-cabecera">
            <h3>Últimos 14 días</h3>
            <span className="tenue">{sinMarcar} sin marcar</span>
          </div>
          <div className="lista-checkin">
            {bloques.map((b) => (
              <div key={b.id} className="item-checkin" style={{ '--c': b.color || '#1E9BD7' }}>
                <div>
                  <strong>{b.titulo}</strong>
                  <small>{b.materia || 'Sin materia'} · {fecha(b.inicio)}, {hora(b.inicio)} – {hora(b.fin)}</small>
                </div>
                <div className="segmentado pequeno">
                  <button className={marcas[b.id] === 'cumplido' ? 'activo ok' : ''} onClick={() => setMarcas({ ...marcas, [b.id]: 'cumplido' })}>
                    <Icono nombre="checkin" size={16} /> Cumplí
                  </button>
                  <button className={marcas[b.id] === 'no_cumplido' ? 'activo no' : ''} onClick={() => setMarcas({ ...marcas, [b.id]: 'no_cumplido' })}>
                    <Icono nombre="cerrar" size={16} /> No pude
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primario ancho" onClick={guardar}>Guardar check-in y recalcular</button>
        </section>
      )}
    </div>
  );
}
