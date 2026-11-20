// Lectura de calendarios iCalendar (.ics) exportados desde el aula virtual (Canvas, Moodle, Google Calendar).
import ical from 'node-ical';

const texto = (v) => (v && typeof v === 'object' && 'val' in v ? v.val : v || '').toString().trim();

/** Canvas nombra los eventos así: "Taller 2 [Cálculo I - Grupo B01]". Separamos tarea y materia. */
export function separarMateria(resumen) {
  const m = resumen.match(/^(.*)\[([^\]]+)\]\s*$/);
  if (!m) return { titulo: resumen, materia: null };
  return { titulo: m[1].trim() || resumen, materia: m[2].trim() };
}

function adivinarEsfuerzo(titulo) {
  const t = titulo.toLowerCase();
  if (/(proyecto|ensayo|informe|trabajo final|entrega final|parcial|examen)/.test(t)) return 'grande';
  if (/(quiz|foro|lectura|cuestionario|participaci)/.test(t)) return 'pequena';
  return 'mediana';
}

function adivinarTipo(titulo) {
  const t = titulo.toLowerCase();
  if (/(examen|parcial|quiz|cuestionario)/.test(t)) return 'evaluacion';
  if (/foro/.test(t)) return 'foro';
  if (/proyecto/.test(t)) return 'proyecto';
  return 'tarea';
}

export function leerICS(contenido, ahora = new Date()) {
  const datos = ical.sync.parseICS(contenido);
  const items = [];
  for (const ev of Object.values(datos)) {
    if (!ev || ev.type !== 'VEVENT') continue;
    const resumen = texto(ev.summary);
    if (!resumen) continue;
    let fecha = ev.end || ev.start;
    if (!fecha) continue;
    fecha = new Date(fecha);
    if (ev.start?.dateOnly || ev.datetype === 'date') {
      // Evento de todo el día: se toma como entrega a las 11:59 p. m. de ese día
      const d = new Date(ev.start);
      fecha = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59);
    }
    if (fecha < ahora) continue;
    const { titulo, materia } = separarMateria(resumen);
    items.push({
      uid: texto(ev.uid) || `${resumen}-${fecha.toISOString()}`,
      titulo: titulo.slice(0, 200),
      materia,
      fecha_limite: fecha.toISOString(),
      esfuerzo: adivinarEsfuerzo(titulo),
      tipo: adivinarTipo(titulo),
    });
  }
  return items.sort((a, b) => new Date(a.fecha_limite) - new Date(b.fecha_limite));
}
