import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Error } from '../components/comunes.jsx';

// Encuesta de validación: preguntas del problema (Anexo B) + evaluación del MVP
const PREGUNTAS = [
  { seccion: 'Sobre ti' },
  { k: 'trabaja', p: '¿Trabajas actualmente mientras estudias?', o: [['completo', 'Sí, tiempo completo'], ['medio', 'Sí, medio tiempo'], ['turnos', 'Sí, por turnos'], ['no', 'No']] },
  { k: 'modalidad', p: '¿En qué modalidad estudias?', o: [['virtual', 'Virtual'], ['distancia', 'A distancia'], ['presencial', 'Presencial'], ['hibrida', 'Híbrida']] },
  { k: 'semestre', p: '¿En qué semestre estás?', o: [['1-2', '1 – 2'], ['3-4', '3 – 4'], ['5-6', '5 – 6'], ['7+', '7 o más']] },
  { k: 'horas_estudio', p: '¿Cuántas horas a la semana puedes dedicar al estudio?', o: [['<5', 'Menos de 5'], ['5-10', '5 – 10'], ['11-15', '11 – 15'], ['>15', 'Más de 15']] },
  { seccion: 'Antes de usar RutaU' },
  { k: 'atrasos_trabajo', p: 'En el último semestre, ¿se te atrasó alguna entrega por tu trabajo?', o: [['nunca', 'Nunca'], ['una', 'Una vez'], ['varias', 'Varias veces'], ['casi_siempre', 'Casi siempre']] },
  { k: 'detecta_atraso', p: '¿Cómo te das cuenta normalmente de que estás atrasado?', o: [['antes', 'Antes de la fecha'], ['mismo_dia', 'El día de la entrega'], ['vencida', 'Cuando ya venció'], ['nota', 'Cuando veo la nota']] },
  { k: 'herramienta', p: '¿Qué usas hoy para organizar tu estudio?', o: [['ninguna', 'Nada en particular'], ['calendario', 'Calendario del celular'], ['agenda', 'Agenda o cuaderno'], ['app_tareas', 'App de tareas'], ['otra', 'Otra']] },
  { k: 'penso_retirarse', p: '¿Has pensado en retirarte o aplazar el semestre?', o: [['si', 'Sí'], ['no', 'No']] },
  { seccion: 'Sobre RutaU' },
  { k: 'utilidad', p: '¿Qué tan útil te parece RutaU para no atrasarte?', escala: true },
  { k: 'facilidad', p: '¿Qué tan fácil fue usarla?', escala: true },
  { k: 'ajuste_horario', p: '¿Qué tanto se ajustó el plan a tu horario real?', escala: true },
  { k: 'uso_semanal', p: '¿La usarías cada semana?', o: [['si', 'Sí'], ['tal_vez', 'Tal vez'], ['no', 'No']] },
  { k: 'pagaria', p: '¿Pagarías una suscripción mensual de bajo costo por funciones adicionales?', o: [['si', 'Sí'], ['tal_vez', 'Tal vez'], ['no', 'No']] },
];

export default function Encuesta() {
  const [r, setR] = useState({ lo_que_gusto: '', que_mejorar: '' });
  const [hecha, setHecha] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api('/encuesta/mia').then((x) => setHecha(x.respondida)); }, []);

  const enviar = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api('/encuesta', { method: 'POST', body: r });
      setHecha(true);
      window.scrollTo(0, 0);
    } catch (err) { setError(err.message); }
  };

  if (hecha) {
    return (
      <div className="pagina">
        <section className="tarjeta estrecha centro">
          <h2>¡Gracias por tu opinión!</h2>
          <p>Tus respuestas nos ayudan a decidir qué mejorar en la siguiente versión de RutaU.</p>
          <button className="btn" onClick={() => setHecha(false)}>Responder de nuevo</button>
        </section>
      </div>
    );
  }

  return (
    <div className="pagina">
      <div className="cabecera-pagina"><div><h1>Danos tu opinión</h1><p className="tenue">2 minutos. Es anónima: no guardamos tu nombre con las respuestas.</p></div></div>
      <form className="tarjeta estrecha encuesta" onSubmit={enviar}>
        {PREGUNTAS.map((q, i) => {
          if (q.seccion) return <h3 key={i} className="seccion">{q.seccion}</h3>;
          return (
            <fieldset key={q.k}>
              <legend>{q.p}</legend>
              <div className={`opciones ${q.escala ? 'escala' : ''}`}>
                {(q.escala ? [1, 2, 3, 4, 5].map((n) => [n, String(n)]) : q.o).map(([v, t]) => (
                  <label key={v} className={`opcion ${String(r[q.k]) === String(v) ? 'activa' : ''}`}>
                    <input type="radio" name={q.k} value={v} checked={String(r[q.k]) === String(v)} onChange={() => setR({ ...r, [q.k]: v })} />
                    {t}
                  </label>
                ))}
              </div>
              {q.escala && <div className="escala-txt"><span>Nada</span><span>Mucho</span></div>}
            </fieldset>
          );
        })}
        <label>¿Qué fue lo que más te gustó?<textarea rows={3} value={r.lo_que_gusto} onChange={(e) => setR({ ...r, lo_que_gusto: e.target.value })} /></label>
        <label>¿Qué mejorarías o qué le falta?<textarea rows={3} value={r.que_mejorar} onChange={(e) => setR({ ...r, que_mejorar: e.target.value })} /></label>
        <Error msg={error} />
        <button className="btn btn-primario ancho">Enviar respuestas</button>
      </form>
    </div>
  );
}
