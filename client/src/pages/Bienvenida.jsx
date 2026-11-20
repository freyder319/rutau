import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, evento, DIAS_CORTOS, fechaHora } from '../api.js';
import FormTurno from '../components/FormTurno.jsx';
import FormEntrega from '../components/FormEntrega.jsx';
import ImportarICS from '../components/ImportarICS.jsx';
import Icono from '../components/Icono.jsx';

const PASOS = ['Tus materias', 'Tu horario de trabajo', 'Tus entregas'];

export default function Bienvenida() {
  const nav = useNavigate();
  const [paso, setPaso] = useState(0);
  const [materias, setMaterias] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [modoIcs, setModoIcs] = useState(false);

  const cargar = () => Promise.all([api('/materias'), api('/turnos'), api('/entregas')])
    .then(([m, t, e]) => { setMaterias(m); setTurnos(t.filter((x) => !x.semana)); setEntregas(e); });
  useEffect(() => { cargar(); }, []);

  const agregarMateria = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await api('/materias', { method: 'POST', body: { nombre } });
    setNombre('');
    cargar();
  };

  const terminar = async () => {
    await api('/plan/recalcular', { method: 'POST' });
    evento('onboarding_completo');
    nav('/semana');
  };

  const demo = async () => {
    await api('/demo/cargar', { method: 'POST' });
    nav('/semana');
  };

  return (
    <div className="bienvenida">
      <h1>Armemos tu primera semana</h1>
      <p className="tenue">Toma unos 5 minutos. Puedes cambiar todo después.</p>
      <ol className="pasos">
        {PASOS.map((p, i) => <li key={p} className={i === paso ? 'activo' : i < paso ? 'hecho' : ''}><span>{i + 1}</span>{p}</li>)}
      </ol>

      {paso === 0 && (
        <section className="tarjeta">
          <h3>¿Qué materias estás viendo este semestre?</h3>
          <form onSubmit={agregarMateria} className="en-linea">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Cálculo I" />
            <button className="btn btn-primario"><Icono nombre="mas_circulo" size={18} /> Agregar</button>
          </form>
          <div className="chips-materias">
            {materias.map((m) => <span key={m.id} className="chip-materia" style={{ '--c': m.color }}>{m.nombre}</span>)}
          </div>
          <div className="acciones">
            <button className="btn btn-texto" onClick={demo}>Prefiero ver un ejemplo</button>
            <button className="btn btn-primario" onClick={() => setPaso(1)} disabled={!materias.length}>Siguiente</button>
          </div>
        </section>
      )}

      {paso === 1 && (
        <section className="tarjeta">
          <h3>¿Cuándo trabajas?</h3>
          <p className="tenue">Agrega tus turnos. Si tu horario cambia cada semana, registra el de esta semana; luego podrás ajustarlo semana a semana.</p>
          <FormTurno onGuardado={cargar} />
          {turnos.length > 0 && (
            <ul className="lista-simple">
              {turnos.map((t) => (
                <li key={t.id}><b>{DIAS_CORTOS[t.dia_semana - 1]}</b> {t.hora_inicio} – {t.hora_fin} · {t.tipo === 'trabajo' ? 'Trabajo' : t.descripcion || 'Bloqueado'}</li>
              ))}
            </ul>
          )}
          <div className="acciones">
            <button className="btn" onClick={() => setPaso(0)}>Atrás</button>
            <button className="btn btn-primario" onClick={() => setPaso(2)} disabled={!turnos.some((t) => t.tipo === 'trabajo')}>Siguiente</button>
          </div>
        </section>
      )}

      {paso === 2 && (
        <section className="tarjeta">
          <h3>¿Qué tienes que entregar?</h3>
          <div className="segmentado">
            <button className={!modoIcs ? 'activo' : ''} onClick={() => setModoIcs(false)}>Escribirlas</button>
            <button className={modoIcs ? 'activo' : ''} onClick={() => setModoIcs(true)}>Importar calendario (.ics)</button>
          </div>
          {modoIcs
            ? <ImportarICS onListo={() => { setModoIcs(false); cargar(); }} />
            : <FormEntrega key={entregas.length} materias={materias} onGuardado={cargar} />}
          {entregas.length > 0 && (
            <ul className="lista-simple">
              {entregas.map((e) => <li key={e.id}><b>{e.titulo}</b> · {e.materia || 'Sin materia'} · {fechaHora(e.fecha_limite)}</li>)}
            </ul>
          )}
          <div className="acciones">
            <button className="btn" onClick={() => setPaso(1)}>Atrás</button>
            <button className="btn btn-coral" onClick={terminar} disabled={!entregas.length}><Icono nombre="rayo" size={18} /> Generar mi plan</button>
          </div>
        </section>
      )}
    </div>
  );
}
