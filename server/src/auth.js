import jwt from 'jsonwebtoken';
import { query } from './db.js';

const SECRETO = process.env.JWT_SECRET || 'cambia-este-secreto-en-produccion';
const ADMINS = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

export const firmarToken = (u) => jwt.sign({ id: u.id }, SECRETO, { expiresIn: '7d' });

export const esAdmin = (u) => u && (u.rol === 'admin' || ADMINS.includes(String(u.correo).toLowerCase()));

export function publico(u) {
  return {
    id: u.id, nombre: u.nombre, correo: u.correo, institucion: u.institucion, programa: u.programa,
    semestre: u.semestre, modalidad: u.modalidad, es_invitado: u.es_invitado, admin: esAdmin(u),
    hora_inicio_dia: String(u.hora_inicio_dia).slice(0, 5), hora_fin_dia: String(u.hora_fin_dia).slice(0, 5),
    max_horas_dia: Number(u.max_horas_dia), descanso_post_turno_min: u.descanso_post_turno_min,
    recordatorios_correo: u.recordatorios_correo, creado_en: u.creado_en,
  };
}

export async function requiereAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  try {
    const { id } = jwt.verify(token, SECRETO);
    const { rows } = await query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (!rows.length) return res.status(401).json({ error: 'La sesión ya no es válida.' });
    req.usuario = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'La sesión expiró. Vuelve a iniciar sesión.' });
  }
}

export function requiereAdmin(req, res, next) {
  if (!esAdmin(req.usuario)) return res.status(403).json({ error: 'Solo para el equipo de RutaU.' });
  next();
}

// Límite sencillo de intentos para el inicio de sesión
const intentos = new Map();
export function limitarIntentos(req, res, next) {
  const k = req.ip;
  const ahora = Date.now();
  const r = (intentos.get(k) || []).filter((t) => ahora - t < 10 * 60 * 1000);
  if (r.length >= 20) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  r.push(ahora);
  intentos.set(k, r);
  next();
}
