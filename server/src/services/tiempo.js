// Utilidades de fecha. El servidor corre con TZ=America/Bogota (UTC-5, sin horario de verano),
// así que los métodos locales de Date trabajan en hora de Colombia.

export const MIN = 60 * 1000;
export const HORA = 60 * MIN;
export const DIA = 24 * HORA;

export function inicioDelDia(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sumarDias(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** 1 = lunes … 7 = domingo */
export function diaIso(d) {
  const g = new Date(d).getDay();
  return g === 0 ? 7 : g;
}

export function lunesDe(d) {
  const x = inicioDelDia(d);
  return sumarDias(x, 1 - diaIso(x));
}

export function fechaISO(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) && d.length <= 10) return d;
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Interpreta 'YYYY-MM-DD' como medianoche local. */
export function desdeISO(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Devuelve una fecha con la hora 'HH:MM' o 'HH:MM:SS' en el día de `d`. */
export function conHora(d, hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  const x = inicioDelDia(d);
  x.setHours(h, m || 0, 0, 0);
  return x;
}

export function redondearArriba(d, minutos = 30) {
  const ms = minutos * MIN;
  return new Date(Math.ceil(new Date(d).getTime() / ms) * ms);
}

export function horasEntre(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / HORA;
}

export function semanaISO(s) {
  return s ? fechaISO(desdeISO(s)) : null;
}
