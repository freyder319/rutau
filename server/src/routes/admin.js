// Panel del equipo: métricas del piloto y exportación de evidencias de validación
import { Router } from 'express';
import { query } from '../db.js';

const r = Router();
const ADMINS = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
// Se excluye al equipo (administradores) de todas las métricas
const SIN_EQUIPO = `u.rol <> 'admin' AND NOT (LOWER(u.correo) = ANY($1::text[]))`;
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);

async function metricas() {
  const p = [ADMINS];
  const usuarios = (await query(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE es_invitado)::int AS invitados,
            COUNT(*) FILTER (WHERE NOT es_invitado)::int AS registrados
     FROM usuarios u WHERE ${SIN_EQUIPO}`, p)).rows[0];

  const activacion = (await query(
    `SELECT COUNT(*)::int AS base,
       COUNT(*) FILTER (WHERE
         (SELECT COUNT(*) FROM turnos t WHERE t.usuario_id=u.id AND t.tipo='trabajo' AND t.creado_en <= u.creado_en + INTERVAL '1 day') >= 1
         AND (SELECT COUNT(*) FROM entregas e WHERE e.usuario_id=u.id AND e.creado_en <= u.creado_en + INTERVAL '1 day') >= 3
       )::int AS activados
     FROM usuarios u WHERE ${SIN_EQUIPO} AND NOT u.es_invitado`, p)).rows[0];

  const uso = (await query(
    `WITH dias AS (
       SELECT u.id, COUNT(DISTINCT (ev.creado_en AT TIME ZONE 'America/Bogota')::date) AS d
       FROM usuarios u JOIN eventos ev ON ev.usuario_id=u.id
       WHERE ${SIN_EQUIPO} AND ev.creado_en >= NOW() - INTERVAL '7 days'
       GROUP BY u.id)
     SELECT COUNT(*)::int AS activos_7d, COUNT(*) FILTER (WHERE d >= 3)::int AS tres_o_mas,
            COALESCE(ROUND(AVG(d)::numeric, 1), 0)::float AS dias_promedio FROM dias`, p)).rows[0];

  const entregas = (await query(
    `SELECT COUNT(*) FILTER (WHERE e.estado='entregada')::int AS entregadas,
            COUNT(*) FILTER (WHERE e.estado='entregada' AND e.entregada_en <= e.fecha_limite)::int AS a_tiempo,
            COUNT(*) FILTER (WHERE e.estado='pendiente' AND e.fecha_limite < NOW())::int AS vencidas,
            COUNT(*) FILTER (WHERE e.origen='ics')::int AS importadas,
            COUNT(*) FILTER (WHERE e.origen<>'demo')::int AS creadas_por_usuarios
     FROM entregas e JOIN usuarios u ON u.id=e.usuario_id WHERE ${SIN_EQUIPO}`, p)).rows[0];

  const bloques = (await query(
    // Solo bloques marcados por la persona (se excluyen los que vienen precargados en los datos de ejemplo)
    `SELECT COUNT(*) FILTER (WHERE b.estado='cumplido' AND b.marcado_en > b.creado_en + INTERVAL '1 minute')::int AS cumplidos,
            COUNT(*) FILTER (WHERE b.estado='no_cumplido' AND b.marcado_en > b.creado_en + INTERVAL '1 minute')::int AS no_cumplidos
     FROM bloques_estudio b JOIN usuarios u ON u.id=b.usuario_id WHERE ${SIN_EQUIPO}`, p)).rows[0];

  const eventos = (await query(
    `SELECT ev.tipo, COUNT(*)::int AS total, COUNT(DISTINCT ev.usuario_id)::int AS usuarios
     FROM eventos ev JOIN usuarios u ON u.id=ev.usuario_id WHERE ${SIN_EQUIPO}
     GROUP BY ev.tipo ORDER BY total DESC`, p)).rows;
  const ev = Object.fromEntries(eventos.map((e) => [e.tipo, e]));

  const enc = (await query(
    `SELECT r.* FROM respuestas_encuesta r LEFT JOIN usuarios u ON u.id=r.usuario_id
     WHERE r.usuario_id IS NULL OR (${SIN_EQUIPO}) ORDER BY r.creado_en`, p)).rows;
  const n = enc.length;
  const prom = (k) => (n ? Math.round((enc.reduce((s, x) => s + Number(x[k]), 0) / n) * 100) / 100 : null);
  const dist = (k) => enc.reduce((acc, x) => { acc[x[k]] = (acc[x[k]] || 0) + 1; return acc; }, {});
  const trabajan = enc.filter((x) => x.trabaja !== 'no');
  const conAtraso = trabajan.filter((x) => ['una', 'varias', 'casi_siempre'].includes(x.atrasos_trabajo));

  const encuesta = {
    n,
    promedios: { utilidad: prom('utilidad'), facilidad: prom('facilidad'), ajuste_horario: prom('ajuste_horario') },
    distribuciones: Object.fromEntries(['trabaja', 'modalidad', 'semestre', 'horas_estudio', 'atrasos_trabajo', 'detecta_atraso',
      'herramienta', 'penso_retirarse', 'uso_semanal', 'pagaria', 'utilidad', 'facilidad', 'ajuste_horario'].map((k) => [k, dist(k)])),
    comentarios: enc.filter((x) => x.lo_que_gusto || x.que_mejorar)
      .map((x) => ({ fecha: x.creado_en, gusto: x.lo_que_gusto, mejorar: x.que_mejorar })),
  };

  const premiumUsuarios = ev.premium_click?.usuarios || 0;
  const hipotesis = [
    {
      id: 'H1', descripcion: 'Estudiantes que trabajan y se han atrasado por su jornada laboral',
      criterio: '≥ 60 % de quienes trabajan', valor: pct(conAtraso.length, trabajan.length), meta: 60, base: trabajan.length,
    },
    {
      id: 'H3', descripcion: 'Usuarios activos que abren RutaU 3 o más días en la semana',
      criterio: '≥ 50 % de los activos', valor: pct(uso.tres_o_mas, uso.activos_7d), meta: 50, base: uso.activos_7d,
    },
    {
      id: 'H5', descripcion: 'Usuarios que hacen clic en "Quiero Premium"',
      criterio: '≥ 10 % de los usuarios', valor: pct(premiumUsuarios, usuarios.total), meta: 10, base: usuarios.total,
    },
  ].map((h) => ({ ...h, cumple: h.valor === null ? null : h.valor >= h.meta }));

  return {
    generado_en: new Date(),
    usuarios,
    activacion: { ...activacion, porcentaje: pct(activacion.activados, activacion.base) },
    uso: { ...uso, porcentaje_tres_o_mas: pct(uso.tres_o_mas, uso.activos_7d) },
    entregas: { ...entregas, porcentaje_a_tiempo: pct(entregas.a_tiempo, entregas.entregadas) },
    bloques: { ...bloques, porcentaje_cumplimiento: pct(bloques.cumplidos, bloques.cumplidos + bloques.no_cumplidos) },
    premium: { clics: ev.premium_click?.total || 0, usuarios: premiumUsuarios, vistas: ev.premium_vista?.usuarios || 0,
      porcentaje: pct(premiumUsuarios, usuarios.total) },
    eventos,
    encuesta,
    hipotesis,
  };
}

r.get('/metricas', async (req, res) => res.json(await metricas()));

function csv(filas) {
  if (!filas.length) return '';
  const cols = Object.keys(filas[0]);
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(','), ...filas.map((f) => cols.map((c) => esc(f[c])).join(','))].join('\n');
}

r.get('/encuesta.csv', async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.creado_en, CASE WHEN u.es_invitado THEN 'invitado' ELSE 'registrado' END AS tipo_usuario,
       r.trabaja, r.modalidad, r.semestre, r.horas_estudio, r.atrasos_trabajo, r.detecta_atraso, r.herramienta,
       r.penso_retirarse, r.utilidad, r.facilidad, r.ajuste_horario, r.uso_semanal, r.pagaria, r.lo_que_gusto, r.que_mejorar
     FROM respuestas_encuesta r LEFT JOIN usuarios u ON u.id=r.usuario_id
     WHERE r.usuario_id IS NULL OR (${SIN_EQUIPO}) ORDER BY r.creado_en`, [ADMINS]);
  res.type('text/csv').attachment('rutau_encuesta.csv').send(csv(rows));
});

r.get('/usuarios.csv', async (req, res) => {
  // Datos anonimizados: no se exportan nombres ni correos (Ley 1581 de 2012)
  const { rows } = await query(
    `SELECT u.id AS usuario, CASE WHEN u.es_invitado THEN 'invitado' ELSE 'registrado' END AS tipo, u.creado_en,
       (SELECT COUNT(*) FROM turnos t WHERE t.usuario_id=u.id) AS turnos,
       (SELECT COUNT(*) FROM entregas e WHERE e.usuario_id=u.id) AS entregas,
       (SELECT COUNT(*) FROM bloques_estudio b WHERE b.usuario_id=u.id AND b.estado='cumplido') AS bloques_cumplidos,
       (SELECT COUNT(DISTINCT (ev.creado_en AT TIME ZONE 'America/Bogota')::date) FROM eventos ev WHERE ev.usuario_id=u.id) AS dias_activos,
       EXISTS (SELECT 1 FROM eventos ev WHERE ev.usuario_id=u.id AND ev.tipo='premium_click') AS clic_premium,
       EXISTS (SELECT 1 FROM respuestas_encuesta r WHERE r.usuario_id=u.id) AS respondio_encuesta
     FROM usuarios u WHERE ${SIN_EQUIPO} ORDER BY u.creado_en`, [ADMINS]);
  res.type('text/csv').attachment('rutau_usuarios_anonimos.csv').send(csv(rows));
});

export default r;
