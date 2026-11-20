import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { query, registrarEvento } from '../db.js';
import { firmarToken, publico, requiereAuth, limitarIntentos } from '../auth.js';
import { cargarDatosDemo } from '../services/demo.js';

const r = Router();
const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c || '');

r.post('/registro', limitarIntentos, async (req, res) => {
  const { nombre, correo, password, institucion, programa, semestre, modalidad, acepta } = req.body || {};
  if (!nombre?.trim()) return res.status(400).json({ error: 'Escribe tu nombre.' });
  if (!correoValido(correo)) return res.status(400).json({ error: 'El correo no es válido.' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  if (!acepta) return res.status(400).json({ error: 'Debes autorizar el tratamiento de datos para crear tu cuenta.' });
  const existe = await query('SELECT 1 FROM usuarios WHERE LOWER(correo) = LOWER($1)', [correo]);
  if (existe.rowCount) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO usuarios(nombre, correo, password_hash, institucion, programa, semestre, modalidad, acepto_datos_en)
     VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, NOW()) RETURNING *`,
    [nombre.trim(), correo.trim(), hash, institucion || null, programa || null, semestre || null, modalidad || 'virtual'],
  );
  await registrarEvento(rows[0].id, 'registro');
  res.status(201).json({ token: firmarToken(rows[0]), usuario: publico(rows[0]) });
});

r.post('/login', limitarIntentos, async (req, res) => {
  const { correo, password } = req.body || {};
  const { rows } = await query('SELECT * FROM usuarios WHERE LOWER(correo) = LOWER($1)', [correo || '']);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  await registrarEvento(u.id, 'login');
  res.json({ token: firmarToken(u), usuario: publico(u) });
});

// "Probar con datos de ejemplo": crea una cuenta de invitado con un semestre de muestra
r.post('/invitado', limitarIntentos, async (req, res) => {
  const id = crypto.randomBytes(5).toString('hex');
  const hash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
  const { rows } = await query(
    `INSERT INTO usuarios(nombre, correo, password_hash, institucion, programa, semestre, es_invitado, acepto_datos_en)
     VALUES ('Invitado', $1, $2, 'Institución de ejemplo', 'Programa virtual', 3, TRUE, NOW()) RETURNING *`,
    [`invitado-${id}@rutau.demo`, hash],
  );
  await cargarDatosDemo(rows[0].id);
  await registrarEvento(rows[0].id, 'invitado_creado');
  res.status(201).json({ token: firmarToken(rows[0]), usuario: publico(rows[0]) });
});

r.get('/yo', requiereAuth, (req, res) => res.json({ usuario: publico(req.usuario) }));

r.put('/preferencias', requiereAuth, async (req, res) => {
  const b = req.body || {};
  const hora = (h, def) => (/^\d{2}:\d{2}$/.test(h || '') ? h : def);
  const u = req.usuario;
  const max = Math.min(12, Math.max(0.5, Number(b.max_horas_dia ?? u.max_horas_dia)));
  const { rows } = await query(
    `UPDATE usuarios SET nombre=$2, institucion=$3, programa=$4, semestre=$5, hora_inicio_dia=$6, hora_fin_dia=$7,
       max_horas_dia=$8, descanso_post_turno_min=$9, recordatorios_correo=$10 WHERE id=$1 RETURNING *`,
    [u.id, b.nombre?.trim() || u.nombre, b.institucion ?? u.institucion, b.programa ?? u.programa,
      b.semestre || u.semestre, hora(b.hora_inicio_dia, u.hora_inicio_dia), hora(b.hora_fin_dia, u.hora_fin_dia),
      max, Math.max(0, Number(b.descanso_post_turno_min ?? u.descanso_post_turno_min)),
      b.recordatorios_correo ?? u.recordatorios_correo],
  );
  res.json({ usuario: publico(rows[0]) });
});

export default r;
