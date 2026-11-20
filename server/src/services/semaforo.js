// Semáforo de avance de RutaU.
//  verde    -> va al día: todo el trabajo que falta cabe en el plan y no hay bloques atrasados.
//  amarillo -> se atrasó (bloques no cumplidos o sin marcar), pero lo que falta todavía cabe,
//              o vence en menos de 24 h y aún tiene trabajo pendiente.
//  rojo     -> el tiempo libre antes de la fecha ya no alcanza, o la entrega se venció.

import { HORA } from './tiempo.js';

const ORDEN = { entregada: 0, verde: 1, amarillo: 2, rojo: 3 };

export function semaforoEntrega({ entrega, bloques, faltantes, horasRestantes, ahora }) {
  if (entrega.estado === 'entregada') {
    return { color: 'entregada', motivo: 'Entregada' };
  }
  const limite = new Date(entrega.fecha_limite);
  if (limite <= ahora) {
    return { color: 'rojo', motivo: 'La fecha límite ya pasó y la entrega no está marcada como entregada.' };
  }
  if (faltantes > 0) {
    return {
      color: 'rojo',
      motivo: `Tu tiempo libre antes de la fecha no alcanza: faltan ${faltantes} h por ubicar.`,
    };
  }
  const atrasados = bloques.filter(
    (b) => b.estado === 'no_cumplido' || (b.estado === 'pendiente' && new Date(b.fin) <= ahora),
  );
  if (horasRestantes > 0 && atrasados.length) {
    return {
      color: 'amarillo',
      motivo: `Tienes ${atrasados.length} bloque(s) atrasado(s), pero el plan se reorganizó y todavía alcanzas.`,
    };
  }
  if (horasRestantes > 0 && limite - ahora < 24 * HORA) {
    return { color: 'amarillo', motivo: 'Vence en menos de 24 horas y aún tienes trabajo pendiente.' };
  }
  return { color: 'verde', motivo: 'Vas al día con esta entrega.' };
}

export function peorColor(colores) {
  const validos = colores.filter((c) => c && c !== 'entregada');
  if (!validos.length) return 'verde';
  return validos.reduce((a, b) => (ORDEN[b] > ORDEN[a] ? b : a), 'verde');
}

export function sugerencias(color) {
  if (color === 'rojo') {
    return [
      { tipo: 'reorganizar', texto: 'Revisa tu horario: amplía tus horas máximas de estudio por día o libera una franja del fin de semana.' },
      { tipo: 'prorroga', texto: 'Escríbele a tu docente antes de la fecha límite y pide una prórroga. Te dejamos un mensaje modelo.' },
      { tipo: 'bienestar', texto: 'Contacta a bienestar universitario: pueden ayudarte a organizar la carga del semestre.' },
    ];
  }
  if (color === 'amarillo') {
    return [
      { tipo: 'checkin', texto: 'Haz tu check-in: marca los bloques que cumpliste para que el plan se ajuste.' },
      { tipo: 'reorganizar', texto: 'Si te cambiaron el turno, actualízalo en Horario y RutaU recalcula tu semana.' },
    ];
  }
  return [];
}
