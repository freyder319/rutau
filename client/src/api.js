const CLAVE = 'rutau_token';

export const getToken = () => localStorage.getItem(CLAVE);
export const setToken = (t) => (t ? localStorage.setItem(CLAVE, t) : localStorage.removeItem(CLAVE));

export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${ruta}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && token) {
    setToken(null);
    window.location.href = '/ingresar';
    throw new Error('Tu sesión terminó.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No pudimos completar la acción.');
  return data;
}

export async function descargar(ruta, nombre) {
  const res = await fetch(`/api${ruta}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('No se pudo descargar el archivo.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export const evento = (tipo, meta) => api('/eventos', { method: 'POST', body: { tipo, meta } }).catch(() => {});

// ---------- Formato de fechas (hora de Colombia) ----------
const TZ = 'America/Bogota';
const f = (opts) => new Intl.DateTimeFormat('es-CO', { timeZone: TZ, ...opts });
const fFecha = f({ weekday: 'short', day: 'numeric', month: 'short' });
const fFechaHora = f({ weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const fHora = f({ hour: 'numeric', minute: '2-digit' });

export const fecha = (d) => fFecha.format(new Date(d));
export const fechaHora = (d) => fFechaHora.format(new Date(d));
export const hora = (d) => fHora.format(new Date(d));

export function relativo(d) {
  const ms = new Date(d) - new Date();
  const h = Math.round(ms / 3600000);
  if (ms < 0) return 'vencida';
  if (h < 1) return 'en menos de 1 hora';
  if (h < 24) return `en ${h} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? 'mañana' : `en ${dias} días`;
}

/** Valor para <input type="datetime-local"> en hora local */
export function aInputLocal(d) {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const ESFUERZOS = {
  pequena: { nombre: 'Pequeña', horas: 2 },
  mediana: { nombre: 'Mediana', horas: 4 },
  grande: { nombre: 'Grande', horas: 8 },
};
export const PRECIO_PREMIUM = '7.900';

export function lunesISO(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const g = x.getDay() || 7;
  x.setDate(x.getDate() - g + 1);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

export function sumarSemanas(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return lunesISO(new Date(y, m - 1, d + 7 * n));
}
