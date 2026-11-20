import { useState } from 'react';
import { api, DIAS_CORTOS } from '../api.js';
import { Error } from './comunes.jsx';

// Agrega el mismo turno a varios días de una vez (por ejemplo, lunes a viernes de 8 a 5)
export default function FormTurno({ semana = null, tipoInicial = 'trabajo', onGuardado }) {
  const [f, setF] = useState({ tipo: tipoInicial, dias: [1, 2, 3, 4, 5], hora_inicio: '08:00', hora_fin: '17:00', descripcion: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alternarDia = (d) => setF({ ...f, dias: f.dias.includes(d) ? f.dias.filter((x) => x !== d) : [...f.dias, d] });

  const guardar = async (e) => {
    e.preventDefault();
    if (!f.dias.length) return setError('Elige al menos un día.');
    setEnviando(true); setError('');
    try {
      for (const d of f.dias) {
        await api('/turnos', { method: 'POST', body: { tipo: f.tipo, dia_semana: d, hora_inicio: f.hora_inicio, hora_fin: f.hora_fin, descripcion: f.descripcion || null, semana } });
      }
      onGuardado?.();
      setF({ ...f, descripcion: '' });
    } catch (err) { setError(err.message); } finally { setEnviando(false); }
  };

  return (
    <form onSubmit={guardar} className="formulario form-turno">
      <div className="segmentado">
        <button type="button" className={f.tipo === 'trabajo' ? 'activo' : ''} onClick={() => setF({ ...f, tipo: 'trabajo' })}>Turno de trabajo</button>
        <button type="button" className={f.tipo === 'bloqueo' ? 'activo' : ''} onClick={() => setF({ ...f, tipo: 'bloqueo', hora_inicio: '19:00', hora_fin: '20:00' })}>Descanso / familia</button>
      </div>
      <div className="dias">
        {DIAS_CORTOS.map((n, i) => (
          <button type="button" key={n} className={`dia ${f.dias.includes(i + 1) ? 'activo' : ''}`} onClick={() => alternarDia(i + 1)}>{n}</button>
        ))}
      </div>
      <div className="fila-3">
        <label>Desde<input type="time" value={f.hora_inicio} onChange={(e) => setF({ ...f, hora_inicio: e.target.value })} required /></label>
        <label>Hasta<input type="time" value={f.hora_fin} onChange={(e) => setF({ ...f, hora_fin: e.target.value })} required /></label>
        <label>Nota (opcional)<input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder={f.tipo === 'trabajo' ? 'Turno oficina' : 'Cena con mi hijo'} /></label>
      </div>
      <small className="tenue">Si el turno termina después de medianoche (ej. 10:00 p. m. a 6:00 a. m.), RutaU lo entiende como turno nocturno.</small>
      <Error msg={error} />
      <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Guardando…' : 'Agregar'}</button>
    </form>
  );
}
