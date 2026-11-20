// Plan semanal, check-in, notificaciones, apoyos, eventos, encuesta y datos de ejemplo
import { Router } from 'express';
import { query, registrarEvento } from '../db.js';
import { vistaSemana, recalcularPlan } from '../services/plan.js';
import { procesarRecordatorios, recordatorioPrueba } from '../services/recordatorios.js';
import { cargarDatosDemo } from '../services/demo.js';
import { fechaISO } from '../services/tiempo.js';

const r = Router();

// ---------- Plan ----------
r.get('/plan', async (req, res) => {
  const vista = await vistaSemana(req.usuario.id, req.query.semana);
  await registrarEvento(req.usuario.id, 'plan_visto', { semaforo: vista.semaforo });
  res.json(vista);
});

r.post('/plan/recalcular', async (req, res) => {
  const p = await recalcularPlan(req.usuario.id);
  await registrarEvento(req.usuario.id, 'plan_recalculado', { bloques: p.bloques.length });
  res.json({ bloques: p.bloques.length });
});

r.patch('/bloques/:id', async (req, res) => {
  const { estado } = req.body || {};
  if (!['pendiente', 'cumplido', 'no_cumplido'].includes(estado)) return res.status(400).json({ error: 'Estado no válido.' });
  const { rows } = await query(
    `UPDATE bloques_estudio SET estado=$3, marcado_en=NOW() WHERE id=$1 AND usuario_id=$2 RETURNING *`,
    [req.params.id, req.usuario.id, estado]);
  if (!rows.length) return res.status(404).json({ error: 'Bloque no encontrado.' });
  await registrarEvento(req.usuario.id, 'bloque_marcado', { estado });
  res.json(rows[0]);
});

// ---------- Check-in semanal ----------
r.get('/checkin', async (req, res) => {
  const { rows } = await query(
    `SELECT b.*, e.titulo, m.nombre AS materia, m.color FROM bloques_estudio b
     JOIN entregas e ON e.id=b.entrega_id LEFT JOIN materias m ON m.id=e.materia_id
     WHERE b.usuario_id=$1 AND b.fin <= NOW() AND b.inicio >= NOW() - INTERVAL '14 days'
     ORDER BY b.estado='pendiente' DESC, b.inicio DESC`, [req.usuario.id]);
  res.json(rows);
});

r.post('/checkin', async (req, res) => {
  const marcas = Array.isArray(req.body?.marcas) ? req.body.marcas : [];
  let n = 0;
  for (const m of marcas) {
    if (!['cumplido', 'no_cumplido'].includes(m.estado)) continue;
    const u = await query(`UPDATE bloques_estudio SET estado=$3, marcado_en=NOW() WHERE id=$1 AND usuario_id=$2`,
      [m.id, req.usuario.id, m.estado]);
    n += u.rowCount;
  }
  const p = await recalcularPlan(req.usuario.id);
  await registrarEvento(req.usuario.id, 'checkin', { marcados: n });
  res.json({ marcados: n, bloques: p.bloques.length });
});

// ---------- Notificaciones ----------
r.get('/notificaciones', async (req, res) => {
  await procesarRecordatorios(new Date(), req.usuario.id);
  const { rows } = await query(
    'SELECT * FROM notificaciones WHERE usuario_id=$1 ORDER BY creado_en DESC LIMIT 30', [req.usuario.id]);
  res.json(rows);
});

r.post('/notificaciones/leer', async (req, res) => {
  await query('UPDATE notificaciones SET leida=TRUE WHERE usuario_id=$1', [req.usuario.id]);
  res.status(204).end();
});

r.post('/notificaciones/prueba', async (req, res) => {
  const r2 = await recordatorioPrueba(req.usuario.id);
  await registrarEvento(req.usuario.id, 'recordatorio_prueba');
  res.json(r2);
});

// ---------- Apoyos ----------
r.get('/apoyos', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM apoyos WHERE usuario_id IS NULL OR usuario_id=$1 ORDER BY usuario_id NULLS FIRST, id', [req.usuario.id]);
  res.json(rows.map((a) => ({ ...a, propio: a.usuario_id === req.usuario.id })));
});

r.post('/apoyos', async (req, res) => {
  const { nombre, url, categoria = 'bienestar', descripcion } = req.body || {};
  if (!nombre?.trim()) return res.status(400).json({ error: 'Escribe un nombre.' });
  if (url && !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'El enlace debe empezar por http:// o https://' });
  const { rows } = await query(
    'INSERT INTO apoyos(usuario_id, categoria, nombre, descripcion, url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.usuario.id, categoria, nombre.trim().slice(0, 160), descripcion || null, url || null]);
  res.status(201).json(rows[0]);
});

r.delete('/apoyos/:id', async (req, res) => {
  await query('DELETE FROM apoyos WHERE id=$1 AND usuario_id=$2', [req.params.id, req.usuario.id]);
  res.status(204).end();
});

// ---------- Eventos de uso (métricas de validación) ----------
const EVENTOS_CLIENTE = new Set(['visita', 'premium_vista', 'premium_click', 'apoyo_click', 'prorroga_copiada', 'onboarding_completo']);
r.post('/eventos', async (req, res) => {
  const { tipo, meta } = req.body || {};
  if (!EVENTOS_CLIENTE.has(tipo)) return res.status(400).json({ error: 'Evento no permitido.' });
  if (tipo === 'visita') {
    // una visita por día y usuario
    const ya = await query(
      `SELECT 1 FROM eventos WHERE usuario_id=$1 AND tipo='visita' AND (creado_en AT TIME ZONE 'America/Bogota')::date = $2::date`,
      [req.usuario.id, fechaISO(new Date())]);
    if (ya.rowCount) return res.status(204).end();
  }
  await registrarEvento(req.usuario.id, tipo, meta || null);
  res.status(204).end();
});

// ---------- Encuesta de validación ----------
const OPC = {
  trabaja: ['completo', 'medio', 'turnos', 'no'],
  modalidad: ['virtual', 'distancia', 'presencial', 'hibrida'],
  semestre: ['1-2', '3-4', '5-6', '7+'],
  horas_estudio: ['<5', '5-10', '11-15', '>15'],
  atrasos_trabajo: ['nunca', 'una', 'varias', 'casi_siempre'],
  detecta_atraso: ['antes', 'mismo_dia', 'vencida', 'nota'],
  herramienta: ['ninguna', 'calendario', 'agenda', 'app_tareas', 'otra'],
  penso_retirarse: ['si', 'no'],
  uso_semanal: ['si', 'tal_vez', 'no'],
  pagaria: ['si', 'tal_vez', 'no'],
};

r.get('/encuesta/mia', async (req, res) => {
  const { rows } = await query('SELECT id, creado_en FROM respuestas_encuesta WHERE usuario_id=$1 ORDER BY id DESC LIMIT 1', [req.usuario.id]);
  res.json({ respondida: rows.length > 0, respuesta: rows[0] || null });
});

r.post('/encuesta', async (req, res) => {
  const b = req.body || {};
  for (const [k, ops] of Object.entries(OPC)) {
    if (!ops.includes(b[k])) return res.status(400).json({ error: `Responde la pregunta: ${k.replace('_', ' ')}.` });
  }
  for (const k of ['utilidad', 'facilidad', 'ajuste_horario']) {
    const v = Number(b[k]);
    if (!(v >= 1 && v <= 5)) return res.status(400).json({ error: 'Califica de 1 a 5 todas las preguntas de la app.' });
  }
  await query(
    `INSERT INTO respuestas_encuesta(usuario_id, trabaja, modalidad, semestre, horas_estudio, atrasos_trabajo, detecta_atraso,
      herramienta, penso_retirarse, utilidad, facilidad, ajuste_horario, uso_semanal, pagaria, lo_que_gusto, que_mejorar)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [req.usuario.id, b.trabaja, b.modalidad, b.semestre, b.horas_estudio, b.atrasos_trabajo, b.detecta_atraso, b.herramienta,
      b.penso_retirarse, b.utilidad, b.facilidad, b.ajuste_horario, b.uso_semanal, b.pagaria,
      b.lo_que_gusto?.slice(0, 1000) || null, b.que_mejorar?.slice(0, 1000) || null]);
  await registrarEvento(req.usuario.id, 'encuesta_respondida');
  res.status(201).json({ ok: true });
});

// ---------- Datos de ejemplo ----------
r.post('/demo/cargar', async (req, res) => {
  await cargarDatosDemo(req.usuario.id);
  await registrarEvento(req.usuario.id, 'demo_cargado');
  res.json({ ok: true });
});

export default r;
