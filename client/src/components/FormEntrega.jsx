import { useState } from 'react';
import { api, aInputLocal, ESFUERZOS } from '../api.js';
import { Error } from './comunes.jsx';

export default function FormEntrega({ materias, entrega, onGuardado, onCancelar }) {
  const manana = new Date(); manana.setDate(manana.getDate() + 3); manana.setHours(23, 59, 0, 0);
  const [f, setF] = useState({
    titulo: entrega?.titulo || '',
    materia_id: entrega?.materia_id || materias[0]?.id || '',
    tipo: entrega?.tipo || 'tarea',
    fecha_limite: aInputLocal(entrega?.fecha_limite || manana),
    esfuerzo: entrega?.esfuerzo || 'mediana',
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cambiar = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setEnviando(true); setError('');
    try {
      const body = { ...f, materia_id: f.materia_id || null, fecha_limite: new Date(f.fecha_limite).toISOString() };
      if (entrega) await api(`/entregas/${entrega.id}`, { method: 'PUT', body });
      else await api('/entregas', { method: 'POST', body });
      onGuardado();
    } catch (err) { setError(err.message); } finally { setEnviando(false); }
  };

  return (
    <form onSubmit={guardar} className="formulario">
      <label>¿Qué tienes que entregar?
        <input value={f.titulo} onChange={cambiar('titulo')} placeholder="Ej.: Taller 3 de derivadas" required autoFocus />
      </label>
      <div className="fila-2">
        <label>Materia
          <select value={f.materia_id} onChange={cambiar('materia_id')}>
            <option value="">Sin materia</option>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </label>
        <label>Tipo
          <select value={f.tipo} onChange={cambiar('tipo')}>
            <option value="tarea">Tarea o taller</option>
            <option value="foro">Foro</option>
            <option value="evaluacion">Quiz o examen</option>
            <option value="proyecto">Proyecto</option>
          </select>
        </label>
      </div>
      <label>Fecha y hora límite
        <input type="datetime-local" value={f.fecha_limite} onChange={cambiar('fecha_limite')} required />
      </label>
      <fieldset className="opciones-esfuerzo">
        <legend>¿Cuánto trabajo crees que te tomará?</legend>
        {Object.entries(ESFUERZOS).map(([k, v]) => (
          <label key={k} className={`opcion ${f.esfuerzo === k ? 'activa' : ''}`}>
            <input type="radio" name="esfuerzo" value={k} checked={f.esfuerzo === k} onChange={cambiar('esfuerzo')} />
            <b>{v.nombre}</b><span>≈ {v.horas} h</span>
          </label>
        ))}
      </fieldset>
      <Error msg={error} />
      <div className="acciones">
        {onCancelar && <button type="button" className="btn" onClick={onCancelar}>Cancelar</button>}
        <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Guardando…' : entrega ? 'Guardar cambios' : 'Agregar entrega'}</button>
      </div>
    </form>
  );
}
