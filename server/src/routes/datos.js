// Materias, turnos laborales y entregas
import { Router } from 'express';
import { query, registrarEvento } from '../db.js';
import { HORAS_POR_ESFUERZO } from '../services/planner.js';
import { leerICS } from '../services/ics.js';
import { lunesDe, desdeISO, fechaISO } from '../services/tiempo.js';

const r = Router();
const HORA_RE = /^\d{2}:\d{2}(:\d{2})?$/;
const PALETA = ['#1E9BD7', '#E07A5F', '#2A9D8F', '#8E7CC3', '#F4A261', '#264653', '#E76F51', '#6A994E'];

// ---------- Materias ----------
r.get('/materias', async (req, res) => {
  const { rows } = await query('SELECT * FROM materias WHERE usuario_id=$1 ORDER BY nombre', [req.usuario.id]);
  res.json(rows);
});

r.post('/materias', async (req, res) => {
  const { nombre, color } = req.body || {};
  if (!nombre?.trim()) return res.status(400).json({ error: 'Escribe el nombre de la materia.' });
  const n = await query('SELECT COUNT(*)::int AS n FROM materias WHERE usuario_id=$1', [req.usuario.id]);
  const { rows } = await query('INSERT INTO materias(usuario_id, nombre, color) VALUES ($1,$2,$3) RETURNING *',
    [req.usuario.id, nombre.trim().slice(0, 120), color || PALETA[n.rows[0].n % PALETA.length]]);
  res.status(201).json(rows[0]);
});

r.put('/materias/:id', async (req, res) => {
  const { nombre, color } = req.body || {};
  const { rows } = await query(
    'UPDATE materias SET nombre=COALESCE($3,nombre), color=COALESCE($4,color) WHERE id=$1 AND usuario_id=$2 RETURNING *',
    [req.params.id, req.usuario.id, nombre?.trim() || null, color || null]);
  if (!rows.length) return res.status(404).json({ error: 'Materia no encontrada.' });
  res.json(rows[0]);
});

r.delete('/materias/:id', async (req, res) => {
  await query('DELETE FROM materias WHERE id=$1 AND usuario_id=$2', [req.params.id, req.usuario.id]);
  res.status(204).end();
});

// ---------- Turnos ----------
r.get('/turnos', async (req, res) => {
  const { rows } = await query('SELECT * FROM turnos WHERE usuario_id=$1 ORDER BY semana NULLS FIRST, dia_semana, hora_inicio',
    [req.usuario.id]);
  res.json(rows.map((t) => ({ ...t, semana: t.semana ? fechaISO(t.semana) : null,
    hora_inicio: String(t.hora_inicio).slice(0, 5), hora_fin: String(t.hora_fin).slice(0, 5) })));
});

r.post('/turnos', async (req, res) => {
  const { tipo = 'trabajo', dia_semana, hora_inicio, hora_fin, semana, descripcion } = req.body || {};
  if (!['trabajo', 'bloqueo'].includes(tipo)) return res.status(400).json({ error: 'Tipo de turno no válido.' });
  if (!(dia_semana >= 1 && dia_semana <= 7)) return res.status(400).json({ error: 'Elige el día.' });
  if (!HORA_RE.test(hora_inicio || '') || !HORA_RE.test(hora_fin || '')) return res.status(400).json({ error: 'Revisa las horas.' });
  if (hora_inicio === hora_fin) return res.status(400).json({ error: 'La hora de inicio y fin no pueden ser iguales.' });
  const sem = semana ? fechaISO(lunesDe(desdeISO(semana))) : null;
  const { rows } = await query(
    `INSERT INTO turnos(usuario_id, tipo, dia_semana, hora_inicio, hora_fin, semana, descripcion)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.usuario.id, tipo, dia_semana, hora_inicio, hora_fin, sem, descripcion?.slice(0, 120) || null]);
  await registrarEvento(req.usuario.id, 'turno_creado', { tipo, especifico: Boolean(sem) });
  res.status(201).json(rows[0]);
});

r.delete('/turnos/:id', async (req, res) => {
  await query('DELETE FROM turnos WHERE id=$1 AND usuario_id=$2', [req.params.id, req.usuario.id]);
  res.status(204).end();
});

// "Mi turno cambió esta semana": copia el horario habitual a una semana específica para editarlo
r.post('/turnos/semana', async (req, res) => {
  const { semana } = req.body || {};
  if (!semana) return res.status(400).json({ error: 'Indica la semana.' });
  const lunes = fechaISO(lunesDe(desdeISO(semana)));
  const ya = await query(`SELECT 1 FROM turnos WHERE usuario_id=$1 AND tipo='trabajo' AND semana=$2`, [req.usuario.id, lunes]);
  if (!ya.rowCount) {
    await query(
      `INSERT INTO turnos(usuario_id, tipo, dia_semana, hora_inicio, hora_fin, semana, descripcion)
       SELECT usuario_id, tipo, dia_semana, hora_inicio, hora_fin, $2, descripcion
       FROM turnos WHERE usuario_id=$1 AND tipo='trabajo' AND semana IS NULL`, [req.usuario.id, lunes]);
  }
  await registrarEvento(req.usuario.id, 'turno_cambiado', { semana: lunes });
  res.json({ semana: lunes });
});

r.delete('/turnos/semana/:fecha', async (req, res) => {
  const lunes = fechaISO(lunesDe(desdeISO(req.params.fecha)));
  await query('DELETE FROM turnos WHERE usuario_id=$1 AND semana=$2', [req.usuario.id, lunes]);
  res.status(204).end();
});

// ---------- Entregas ----------
function validarEntrega(b) {
  if (!b.titulo?.trim()) return 'Escribe el nombre de la entrega.';
  if (!b.fecha_limite || Number.isNaN(new Date(b.fecha_limite).getTime())) return 'Indica la fecha y hora de entrega.';
  if (b.esfuerzo && !HORAS_POR_ESFUERZO[b.esfuerzo]) return 'Esfuerzo no válido.';
  return null;
}

r.get('/entregas', async (req, res) => {
  const { rows } = await query(
    `SELECT e.*, m.nombre AS materia, m.color FROM entregas e LEFT JOIN materias m ON m.id=e.materia_id
     WHERE e.usuario_id=$1 ORDER BY e.estado DESC, e.fecha_limite`, [req.usuario.id]);
  res.json(rows);
});

r.post('/entregas', async (req, res) => {
  const b = req.body || {};
  const err = validarEntrega(b);
  if (err) return res.status(400).json({ error: err });
  const esfuerzo = b.esfuerzo || 'mediana';
  const horas = Number(b.horas_estimadas) > 0 ? Number(b.horas_estimadas) : HORAS_POR_ESFUERZO[esfuerzo];
  const { rows } = await query(
    `INSERT INTO entregas(usuario_id, materia_id, titulo, tipo, fecha_limite, esfuerzo, horas_estimadas)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.usuario.id, b.materia_id || null, b.titulo.trim().slice(0, 200), b.tipo || 'tarea', b.fecha_limite, esfuerzo, horas]);
  await registrarEvento(req.usuario.id, 'entrega_creada', { origen: 'manual' });
  res.status(201).json(rows[0]);
});

r.put('/entregas/:id', async (req, res) => {
  const b = req.body || {};
  const err = validarEntrega(b);
  if (err) return res.status(400).json({ error: err });
  const esfuerzo = b.esfuerzo || 'mediana';
  const horas = Number(b.horas_estimadas) > 0 ? Number(b.horas_estimadas) : HORAS_POR_ESFUERZO[esfuerzo];
  const { rows } = await query(
    `UPDATE entregas SET materia_id=$3, titulo=$4, tipo=$5, fecha_limite=$6, esfuerzo=$7, horas_estimadas=$8
     WHERE id=$1 AND usuario_id=$2 RETURNING *`,
    [req.params.id, req.usuario.id, b.materia_id || null, b.titulo.trim().slice(0, 200), b.tipo || 'tarea',
      b.fecha_limite, esfuerzo, horas]);
  if (!rows.length) return res.status(404).json({ error: 'Entrega no encontrada.' });
  res.json(rows[0]);
});

r.post('/entregas/:id/estado', async (req, res) => {
  const entregada = Boolean(req.body?.entregada);
  const { rows } = await query(
    `UPDATE entregas SET estado=$3, entregada_en=$4 WHERE id=$1 AND usuario_id=$2 RETURNING *`,
    [req.params.id, req.usuario.id, entregada ? 'entregada' : 'pendiente', entregada ? new Date() : null]);
  if (!rows.length) return res.status(404).json({ error: 'Entrega no encontrada.' });
  if (entregada) {
    await query(`DELETE FROM bloques_estudio WHERE entrega_id=$1 AND estado='pendiente' AND inicio >= NOW()`, [req.params.id]);
    const aTiempo = new Date(rows[0].entregada_en) <= new Date(rows[0].fecha_limite);
    await registrarEvento(req.usuario.id, 'entrega_entregada', { a_tiempo: aTiempo });
  }
  res.json(rows[0]);
});

r.delete('/entregas/:id', async (req, res) => {
  await query('DELETE FROM entregas WHERE id=$1 AND usuario_id=$2', [req.params.id, req.usuario.id]);
  res.status(204).end();
});

// ---------- Importación .ics ----------
r.post('/entregas/ics/previsualizar', async (req, res) => {
  const contenido = req.body?.contenido;
  if (!contenido || !contenido.includes('BEGIN:VCALENDAR')) {
    return res.status(400).json({ error: 'El archivo no parece un calendario .ics válido.' });
  }
  try {
    res.json({ items: leerICS(contenido) });
  } catch (e) {
    res.status(400).json({ error: 'No pudimos leer el calendario: ' + e.message });
  }
});

r.post('/entregas/ics/importar', async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 200) : [];
  const uid = req.usuario.id;
  const materias = Object.fromEntries((await query('SELECT id, nombre FROM materias WHERE usuario_id=$1', [uid]))
    .rows.map((m) => [m.nombre.toLowerCase(), m.id]));
  let creadas = 0;
  for (const it of items) {
    if (validarEntrega(it)) continue;
    const dup = await query('SELECT 1 FROM entregas WHERE usuario_id=$1 AND uid_ics=$2', [uid, it.uid]);
    if (dup.rowCount) continue;
    let materiaId = null;
    if (it.materia) {
      const k = it.materia.toLowerCase();
      if (!materias[k]) {
        const n = Object.keys(materias).length;
        const m = await query('INSERT INTO materias(usuario_id, nombre, color) VALUES ($1,$2,$3) RETURNING id',
          [uid, it.materia.slice(0, 120), PALETA[n % PALETA.length]]);
        materias[k] = m.rows[0].id;
      }
      materiaId = materias[k];
    }
    const esfuerzo = HORAS_POR_ESFUERZO[it.esfuerzo] ? it.esfuerzo : 'mediana';
    await query(
      `INSERT INTO entregas(usuario_id, materia_id, titulo, tipo, fecha_limite, esfuerzo, horas_estimadas, origen, uid_ics)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ics',$8)`,
      [uid, materiaId, it.titulo.slice(0, 200), it.tipo || 'tarea', it.fecha_limite, esfuerzo, HORAS_POR_ESFUERZO[esfuerzo], it.uid]);
    creadas++;
  }
  await registrarEvento(uid, 'ics_importado', { creadas });
  res.json({ creadas });
});

export default r;
