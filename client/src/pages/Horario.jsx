import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, DIAS, fecha, lunesISO, sumarSemanas } from '../api.js';
import { useAuth } from '../auth.jsx';
import FormTurno from '../components/FormTurno.jsx';
import Icono from '../components/Icono.jsx';
import { Error } from '../components/comunes.jsx';

function ListaTurnos({ turnos, onBorrar }) {
  if (!turnos.length) return <p className="tenue">Sin turnos registrados.</p>;
  return (
    <div className="turnos-dias">
      {DIAS.map((d, i) => {
        const delDia = turnos.filter((t) => t.dia_semana === i + 1);
        if (!delDia.length) return null;
        return (
          <div key={d} className="turno-dia">
            <b>{d}</b>
            {delDia.map((t) => (
              <span key={t.id} className={`turno-pill ${t.tipo}`}>
                {t.hora_inicio} – {t.hora_fin} {t.descripcion ? `· ${t.descripcion}` : t.tipo === 'trabajo' ? '· Trabajo' : ''}
                <button onClick={() => onBorrar(t)} aria-label="Quitar"><Icono nombre="cerrar" size={14} /></button>
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function Horario() {
  const { usuario, setUsuario } = useAuth();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('semana') ? 'semana' : 'habitual');
  const [semana, setSemana] = useState(params.get('semana') || lunesISO());
  const [turnos, setTurnos] = useState([]);
  const [prefs, setPrefs] = useState({
    hora_inicio_dia: usuario.hora_inicio_dia, hora_fin_dia: usuario.hora_fin_dia,
    max_horas_dia: usuario.max_horas_dia, descanso_post_turno_min: usuario.descanso_post_turno_min,
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(() => api('/turnos').then(setTurnos), []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambio = async (texto) => {
    await api('/plan/recalcular', { method: 'POST' });
    cargar();
    setMsg(texto || 'Listo. Tu plan se recalculó con el nuevo horario.');
    setTimeout(() => setMsg(''), 4000);
  };
  const borrar = async (t) => { await api(`/turnos/${t.id}`, { method: 'DELETE' }); cambio(); };

  const habituales = turnos.filter((t) => !t.semana);
  const deSemana = turnos.filter((t) => t.semana === semana);
  const tieneCambio = deSemana.some((t) => t.tipo === 'trabajo');

  const crearCambio = async () => { await api('/turnos/semana', { method: 'POST', body: { semana } }); cargar(); };
  const quitarCambio = async () => { await api(`/turnos/semana/${semana}`, { method: 'DELETE' }); cambio('Volviste a tu horario habitual en esa semana.'); };

  const guardarPrefs = async (e) => {
    e.preventDefault(); setError('');
    try {
      const r = await api('/auth/preferencias', { method: 'PUT', body: prefs });
      setUsuario(r.usuario);
      cambio('Preferencias guardadas y plan recalculado.');
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="pagina">
      <div className="cabecera-pagina">
        <div><h1>Horario</h1><p className="tenue">RutaU solo ubica bloques de estudio en tus horas libres.</p></div>
      </div>
      {msg && <div className="aviso aviso-ok">{msg}</div>}

      <div className="segmentado grande">
        <button className={tab === 'habitual' ? 'activo' : ''} onClick={() => setTab('habitual')}>Horario habitual</button>
        <button className={tab === 'semana' ? 'activo' : ''} onClick={() => setTab('semana')}>Cambio de turno (rotativo)</button>
        <button className={tab === 'prefs' ? 'activo' : ''} onClick={() => setTab('prefs')}>Mis horas de estudio</button>
      </div>

      {tab === 'habitual' && (
        <div className="dos-columnas">
          <section className="tarjeta"><h3>Agregar turno o franja bloqueada</h3><FormTurno onGuardado={() => cambio()} /></section>
          <section className="tarjeta"><h3>Tu semana habitual</h3><ListaTurnos turnos={habituales} onBorrar={borrar} /></section>
        </div>
      )}

      {tab === 'semana' && (
        <section className="tarjeta">
          <div className="tarjeta-cabecera">
            <h3>¿Te cambiaron el turno?</h3>
            <div className="nav-semana">
              <button className="btn-icono" onClick={() => setSemana(sumarSemanas(semana, -1))}><Icono nombre="izq" /></button>
              <span>Semana del {fecha(semana + 'T12:00:00')}</span>
              <button className="btn-icono" onClick={() => setSemana(sumarSemanas(semana, 1))}><Icono nombre="der" /></button>
            </div>
          </div>
          {!tieneCambio ? (
            <div className="vacio">
              <p>Esa semana usas tu horario habitual. Si tu turno cambia, crea un horario solo para esa semana.</p>
              <button className="btn btn-primario" onClick={crearCambio}><Icono nombre="recargar" size={18} /> Mi turno cambia esta semana</button>
            </div>
          ) : (
            <div className="dos-columnas">
              <div>
                <p className="tenue">Este horario reemplaza a tu horario habitual solo en esa semana. Quita los turnos que no aplican y agrega los nuevos.</p>
                <ListaTurnos turnos={deSemana} onBorrar={borrar} />
                <button className="btn btn-texto" onClick={quitarCambio}>Volver al horario habitual esa semana</button>
              </div>
              <div><FormTurno semana={semana} onGuardado={() => cambio()} /></div>
            </div>
          )}
        </section>
      )}

      {tab === 'prefs' && (
        <section className="tarjeta estrecha">
          <h3>¿Cuánto puedes estudiar al día?</h3>
          <form className="formulario" onSubmit={guardarPrefs}>
            <div className="fila-2">
              <label>Empiezo a estar disponible a las<input type="time" value={prefs.hora_inicio_dia} onChange={(e) => setPrefs({ ...prefs, hora_inicio_dia: e.target.value })} /></label>
              <label>No estudio después de las<input type="time" value={prefs.hora_fin_dia} onChange={(e) => setPrefs({ ...prefs, hora_fin_dia: e.target.value })} /></label>
            </div>
            <label>Máximo de horas de estudio por día: <b>{prefs.max_horas_dia} h</b>
              <input type="range" min="1" max="8" step="0.5" value={prefs.max_horas_dia} onChange={(e) => setPrefs({ ...prefs, max_horas_dia: Number(e.target.value) })} />
            </label>
            <label>Descanso después del trabajo (minutos)
              <input type="number" min="0" max="180" step="15" value={prefs.descanso_post_turno_min} onChange={(e) => setPrefs({ ...prefs, descanso_post_turno_min: Number(e.target.value) })} />
            </label>
            <Error msg={error} />
            <button className="btn btn-primario">Guardar y recalcular</button>
          </form>
        </section>
      )}
    </div>
  );
}
