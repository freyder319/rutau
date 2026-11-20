// Motor de planificación de RutaU.
// Función pura: recibe el horario del estudiante y sus entregas pendientes y devuelve
// los bloques de estudio propuestos. No toca la base de datos, por eso se puede probar aislada.

import {
  MIN, HORA, inicioDelDia, sumarDias, diaIso, lunesDe, fechaISO, conHora, redondearArriba,
} from './tiempo.js';

export const HORAS_POR_ESFUERZO = { pequena: 2, mediana: 4, grande: 8 };
const SLOT_MIN = 30;                 // granularidad de la agenda
const MAX_BLOQUE_MIN = 120;          // un bloque de estudio dura máximo 2 h seguidas
const TOPE_TAREA_DIA_H = 2;          // en la primera pasada, máximo 2 h por entrega al día
const MARGEN_ANTES_LIMITE_MIN = 60;  // terminar al menos 1 h antes de la hora de entrega
const HORIZONTE_DIAS = 28;

/**
 * Turnos que aplican a un día concreto.
 * Si la semana tiene turnos de trabajo específicos (turno rotativo), reemplazan a los recurrentes.
 * Los bloqueos (descanso, familia) recurrentes siempre se suman a los específicos.
 */
export function turnosDelDia(turnos, dia) {
  const lunes = fechaISO(lunesDe(dia));
  const iso = diaIso(dia);
  const trabajoSemana = turnos.filter((t) => t.tipo === 'trabajo' && t.semana && fechaISO(t.semana) === lunes);
  const trabajo = trabajoSemana.length
    ? trabajoSemana
    : turnos.filter((t) => t.tipo === 'trabajo' && !t.semana);
  const bloqueos = turnos.filter((t) => t.tipo === 'bloqueo' && (!t.semana || fechaISO(t.semana) === lunes));
  return [...trabajo, ...bloqueos].filter((t) => Number(t.dia_semana) === iso);
}

/** Convierte un turno en un intervalo real; si termina a una hora menor o igual, cruza la medianoche. */
export function intervaloDeTurno(t, dia) {
  const inicio = conHora(dia, t.hora_inicio);
  let fin = conHora(dia, t.hora_fin);
  if (fin <= inicio) fin = conHora(sumarDias(dia, 1), t.hora_fin);
  return { inicio, fin, tipo: t.tipo, descripcion: t.descripcion || null };
}

/** Intervalos ocupados que tocan un día (incluye turnos nocturnos del día anterior). */
export function ocupadosDelDia(turnos, dia, descansoPostTurnoMin = 0) {
  const res = [];
  for (const d of [sumarDias(dia, -1), dia]) {
    for (const t of turnosDelDia(turnos, d)) {
      const iv = intervaloDeTurno(t, d);
      if (iv.tipo === 'trabajo' && descansoPostTurnoMin > 0) {
        iv.fin = new Date(iv.fin.getTime() + descansoPostTurnoMin * MIN);
      }
      res.push(iv);
    }
  }
  return res;
}

function restarIntervalos(base, ocupados) {
  let libres = [base];
  for (const o of ocupados) {
    const sig = [];
    for (const l of libres) {
      if (o.fin <= l.inicio || o.inicio >= l.fin) { sig.push(l); continue; }
      if (o.inicio > l.inicio) sig.push({ inicio: l.inicio, fin: o.inicio });
      if (o.fin < l.fin) sig.push({ inicio: o.fin, fin: l.fin });
    }
    libres = sig;
  }
  return libres;
}

/** Franjas libres de 30 minutos entre `desde` y `hasta`, respetando la ventana diaria de estudio. */
export function franjasLibres({ desde, hasta, turnos, prefs, ocupadosExtra = [] }) {
  const slots = [];
  const inicio = redondearArriba(desde, SLOT_MIN);
  for (let dia = inicioDelDia(inicio); dia <= hasta; dia = sumarDias(dia, 1)) {
    const ventana = { inicio: conHora(dia, prefs.horaInicioDia), fin: conHora(dia, prefs.horaFinDia) };
    if (ventana.fin <= ventana.inicio) continue;
    const ocupados = [
      ...ocupadosDelDia(turnos, dia, prefs.descansoPostTurnoMin),
      ...ocupadosExtra,
    ];
    for (const l of restarIntervalos(ventana, ocupados)) {
      let s = redondearArriba(l.inicio > inicio ? l.inicio : inicio, SLOT_MIN);
      while (s.getTime() + SLOT_MIN * MIN <= l.fin.getTime() && s < hasta) {
        const fin = new Date(s.getTime() + SLOT_MIN * MIN);
        slots.push({ inicio: s, fin, dia: fechaISO(s) });
        s = fin;
      }
    }
  }
  return slots;
}

/**
 * Planifica las entregas pendientes.
 * @param {object} p
 * @param {Date} p.ahora
 * @param {object} p.prefs { horaInicioDia, horaFinDia, maxHorasDia, descansoPostTurnoMin }
 * @param {Array} p.turnos
 * @param {Array} p.entregas [{ id, fecha_limite, horas_estimadas, horas_avanzadas }]
 * @param {Object} p.horasUsadasPorDia { 'YYYY-MM-DD': horas ya ocupadas ese día }
 * @param {Array} p.ocupadosExtra intervalos que no se pueden usar (bloques en curso)
 */
export function planificar({ ahora, prefs, turnos, entregas, horasUsadasPorDia = {}, ocupadosExtra = [] }) {
  const pendientes = entregas
    .map((e) => {
      const limite = new Date(new Date(e.fecha_limite).getTime() - MARGEN_ANTES_LIMITE_MIN * MIN);
      const restante = Math.max(0, Number(e.horas_estimadas) - Number(e.horas_avanzadas || 0));
      return { id: e.id, limite, restanteSlots: Math.ceil(restante * 2), fecha_limite: new Date(e.fecha_limite) };
    })
    .filter((e) => e.fecha_limite > ahora)
    // Prioridad: primero lo que vence antes; a igual fecha, lo que requiere más trabajo.
    .sort((a, b) => a.limite - b.limite || b.restanteSlots - a.restanteSlots);

  const resultado = { bloques: [], porEntrega: {}, horasLibres: 0 };
  for (const e of pendientes) resultado.porEntrega[e.id] = { asignadas: 0, faltantes: e.restanteSlots / 2 };
  if (!pendientes.length) return resultado;

  const tope = new Date(Math.min(
    Math.max(...pendientes.map((e) => e.limite.getTime())),
    ahora.getTime() + HORIZONTE_DIAS * 24 * HORA,
  ));
  const slots = franjasLibres({ desde: ahora, hasta: tope, turnos, prefs, ocupadosExtra });
  resultado.horasLibres = slots.length / 2;

  const usoDia = { ...horasUsadasPorDia };
  const usoTareaDia = {};
  const asignado = new Map(); // índice de slot -> id de entrega
  const maxDia = Number(prefs.maxHorasDia);

  // Cada entrega, en orden de prioridad, primero intenta repartirse (máx. 2 h al día) y,
  // si no alcanza, usa cualquier franja libre antes de su fecha límite.
  for (const e of pendientes) {
    for (const pasada of [1, 2]) {
      let falta = e.restanteSlots - resultado.porEntrega[e.id].asignadas * 2;
      for (let i = 0; i < slots.length && falta > 0; i++) {
        const s = slots[i];
        if (s.fin > e.limite) break;
        if (asignado.has(i)) continue;
        if ((usoDia[s.dia] || 0) + 0.5 > maxDia) continue;
        const clave = `${e.id}|${s.dia}`;
        if (pasada === 1 && (usoTareaDia[clave] || 0) + 0.5 > TOPE_TAREA_DIA_H) continue;
        asignado.set(i, e.id);
        usoDia[s.dia] = (usoDia[s.dia] || 0) + 0.5;
        usoTareaDia[clave] = (usoTareaDia[clave] || 0) + 0.5;
        resultado.porEntrega[e.id].asignadas += 0.5;
        falta -= 1;
      }
    }
  }

  // Une franjas consecutivas de la misma entrega en bloques de hasta 2 horas.
  let actual = null;
  slots.forEach((s, i) => {
    const id = asignado.get(i);
    const contiguo = actual && id === actual.entrega_id && s.inicio.getTime() === actual.fin.getTime()
      && (actual.fin - actual.inicio) / MIN + SLOT_MIN <= MAX_BLOQUE_MIN;
    if (id === undefined) { if (actual) resultado.bloques.push(actual); actual = null; return; }
    if (contiguo) { actual.fin = s.fin; return; }
    if (actual) resultado.bloques.push(actual);
    actual = { entrega_id: id, inicio: s.inicio, fin: s.fin };
  });
  if (actual) resultado.bloques.push(actual);

  for (const e of pendientes) {
    const r = resultado.porEntrega[e.id];
    r.faltantes = Math.max(0, e.restanteSlots / 2 - r.asignadas);
  }
  return resultado;
}
