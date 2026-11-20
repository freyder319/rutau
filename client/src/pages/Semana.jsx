import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fecha, fechaHora, hora, relativo, lunesISO, sumarSemanas } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Semaforo, Chip, Anillo, Modal, Vacio } from '../components/comunes.jsx';
import CalendarioSemana from '../components/CalendarioSemana.jsx';
import Prorroga from '../components/Prorroga.jsx';
import Icono from '../components/Icono.jsx';

const TITULO = {
  verde: 'Vas al día',
  amarillo: 'Ojo: te estás atrasando',
  rojo: 'Tu tiempo no alcanza para todo',
};
const DESCRIPCION = {
  verde: 'Tu plan cabe en tus horas libres. Sigue los bloques de estudio y marca lo que cumplas.',
  amarillo: 'Tienes bloques atrasados, pero el plan se reorganizó y todavía alcanzas.',
  rojo: 'Hay entregas que ya no caben en tu tiempo libre antes de la fecha límite. Mira las sugerencias.',
};

export default function Semana() {
  const { usuario } = useAuth();
  const nav = useNavigate();
  const [semana, setSemana] = useState(lunesISO());
  const [datos, setDatos] = useState(null);
  const [bloque, setBloque] = useState(null);
  const [prorroga, setProrroga] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(() => api(`/plan?semana=${semana}`).then(setDatos).catch((e) => setError(e.message)), [semana]);
  useEffect(() => { cargar(); }, [cargar]);

  const marcar = async (estado) => {
    await api(`/bloques/${bloque.id}`, { method: 'PATCH', body: { estado } });
    setBloque(null);
    cargar();
  };

  if (error) return <p className="error">{error}</p>;
  if (!datos) return <div className="cargando">Calculando tu semana…</div>;

  const sinNada = !datos.entregas.length;
  const enRojo = datos.entregas.filter((e) => e.estado === 'pendiente' && e.semaforo.color === 'rojo');
  const delaSemana = datos.entregas.filter((e) => e.estado === 'pendiente').slice(0, 6);
  const esEstaSemana = semana === lunesISO();

  return (
    <div className="pagina">
      <div className="cabecera-pagina">
        <div>
          <h1>Mi semana</h1>
          <p className="tenue">Semana del {fecha(datos.semana + 'T12:00:00')}</p>
        </div>
        <div className="nav-semana">
          <button className="btn-icono" onClick={() => setSemana(sumarSemanas(semana, -1))} aria-label="Semana anterior"><Icono nombre="izq" /></button>
          <button className="btn btn-pequeno" onClick={() => setSemana(lunesISO())} disabled={esEstaSemana}>Hoy</button>
          <button className="btn-icono" onClick={() => setSemana(sumarSemanas(semana, 1))} aria-label="Semana siguiente"><Icono nombre="der" /></button>
        </div>
      </div>

      {sinNada && (
        <Vacio titulo="Aún no tienes entregas">
          <p>Agrega tus materias, tu horario y tus entregas para que RutaU arme tu plan.</p>
          <Link to="/bienvenida" className="btn btn-primario">Empezar</Link>
        </Vacio>
      )}

      {!sinNada && (
        <>
          <div className="resumen-grid">
            <section className={`tarjeta tarjeta-semaforo borde-${datos.semaforo}`}>
              <Semaforo color={datos.semaforo} grande />
              <div>
                <h2>{TITULO[datos.semaforo]}</h2>
                <p>{DESCRIPCION[datos.semaforo]}</p>
                {datos.sugerencias.length > 0 && (
                  <div className="sugerencias">
                    {datos.sugerencias.map((s) => {
                      if (s.tipo === 'prorroga') return <button key={s.tipo} className="btn btn-pequeno" onClick={() => setProrroga(enRojo[0] || {})}><Icono nombre="copiar" size={16} /> Pedir prórroga</button>;
                      if (s.tipo === 'bienestar') return <Link key={s.tipo} className="btn btn-pequeno" to="/apoyos"><Icono nombre="apoyo" size={16} /> Contactar bienestar</Link>;
                      if (s.tipo === 'checkin') return <Link key={s.tipo} className="btn btn-pequeno" to="/checkin"><Icono nombre="checkin" size={16} /> Hacer check-in</Link>;
                      return <Link key={s.tipo} className="btn btn-pequeno" to="/horario"><Icono nombre="horario" size={16} /> Reorganizar horario</Link>;
                    })}
                  </div>
                )}
              </div>
            </section>
            <section className="tarjeta tarjeta-progreso">
              <Anillo valor={datos.resumen.progreso} etiqueta="bloques cumplidos" />
              <div className="cifras">
                <div><b>{datos.resumen.horas_cumplidas.toFixed(1)} h</b><span>estudiadas</span></div>
                <div><b>{datos.resumen.horas_planificadas.toFixed(1)} h</b><span>planificadas</span></div>
                <div><b>{datos.resumen.entregas_activas}</b><span>entregas activas</span></div>
              </div>
            </section>
          </div>

          {datos.resumen.checkin_pendiente > 0 && (
            <div className="aviso aviso-checkin">
              <Icono nombre="checkin" />
              <span>Tienes <b>{datos.resumen.checkin_pendiente}</b> bloque(s) sin marcar. Cuéntanos si los cumpliste para ajustar tu plan.</span>
              <Link to="/checkin" className="btn btn-pequeno btn-primario">Hacer check-in</Link>
            </div>
          )}

          <section className="tarjeta">
            <div className="tarjeta-cabecera">
              <h3>¿Qué hago primero?</h3>
              <button className="btn btn-pequeno" onClick={() => nav(`/horario?semana=${lunesISO()}`)}><Icono nombre="recargar" size={16} /> Mi turno cambió</button>
            </div>
            {!datos.que_hacer_primero.length && <p className="tenue">No tienes bloques próximos. ¡Buen trabajo!</p>}
            <div className="proximos">
              {datos.que_hacer_primero.map((b, i) => (
                <div key={b.id} className="proximo" style={{ '--c': b.color || '#1E9BD7' }}>
                  <span className="orden">{i + 1}</span>
                  <div>
                    <strong>{b.titulo}</strong>
                    <small>{b.materia || 'Sin materia'}</small>
                  </div>
                  <span className="cuando">{fecha(b.inicio)}<br />{hora(b.inicio)} – {hora(b.fin)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="tarjeta">
            <div className="tarjeta-cabecera">
              <h3>Plan de la semana</h3>
              <span className="tenue">Toca un bloque para marcarlo</span>
            </div>
            <CalendarioSemana semana={datos.semana} franjas={datos.franjas} bloques={datos.bloques} ahora={datos.ahora} onBloque={setBloque} />
          </section>

          <div className="dos-columnas">
            <section className="tarjeta">
              <div className="tarjeta-cabecera"><h3>Entregas pendientes</h3><Link to="/entregas">Ver todas</Link></div>
              {delaSemana.map((e) => (
                <div key={e.id} className="fila-entrega" style={{ '--c': e.color || '#1E9BD7' }}>
                  <div>
                    <strong>{e.titulo}</strong>
                    <small>{e.materia || 'Sin materia'} · vence {relativo(e.fecha_limite)} ({fechaHora(e.fecha_limite)})</small>
                    <small className="motivo">{e.semaforo.motivo}</small>
                  </div>
                  <Chip color={e.semaforo.color} />
                </div>
              ))}
            </section>
            <section className="tarjeta">
              <h3>Avance por materia esta semana</h3>
              {!datos.materias.length && <p className="tenue">Sin bloques esta semana.</p>}
              {datos.materias.map((m) => (
                <div key={m.materia} className="barra-materia">
                  <div className="barra-materia-txt"><span>{m.materia}</span><span>{m.cumplidas.toFixed(1)} / {m.planificadas.toFixed(1)} h</span></div>
                  <div className="barra-fondo"><div style={{ width: `${m.planificadas ? (m.cumplidas / m.planificadas) * 100 : 0}%`, background: m.color }} /></div>
                </div>
              ))}
            </section>
          </div>
        </>
      )}

      {bloque && (
        <Modal titulo={bloque.titulo} onClose={() => setBloque(null)} ancho={400}>
          <p><b>{bloque.materia || 'Sin materia'}</b></p>
          <p>{fechaHora(bloque.inicio)} – {hora(bloque.fin)}</p>
          <p className="tenue">Estado: {bloque.estado === 'cumplido' ? 'cumplido' : bloque.estado === 'no_cumplido' ? 'no cumplido' : 'pendiente'}</p>
          <div className="acciones">
            <button className="btn" onClick={() => marcar('no_cumplido')}>No pude</button>
            <button className="btn btn-primario" onClick={() => marcar('cumplido')}><Icono nombre="checkin" size={18} /> Lo cumplí</button>
          </div>
        </Modal>
      )}
      {prorroga && <Prorroga entrega={prorroga} nombre={usuario?.es_invitado ? '' : usuario?.nombre} onClose={() => setProrroga(false)} />}
    </div>
  );
}
