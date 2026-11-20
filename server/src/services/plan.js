import { query, pool } from '../db.js';
import { planificar, turnosDelDia, intervaloDeTurno } from './planner.js';
import { semaforoEntrega, peorColor, sugerencias } from './semaforo.js';
import { sumarDias, lunesDe, fechaISO, desdeISO, horasEntre, inicioDelDia } from './tiempo.js';

const horas = (b) => horasEntre(b.inicio, b.fin);

export async function cargarContexto(usuarioId) {
  const [u, t, e, b] = await Promise.all([
    query('SELECT * FROM usuarios WHERE id = $1', [usuarioId]),
    query('SELECT * FROM turnos WHERE usuario_id = $1 ORDER BY dia_semana, hora_inicio', [usuarioId]),
    query(`SELECT e.*, m.nombre AS materia, m.color AS color
           FROM entregas e LEFT JOIN materias m ON m.id = e.materia_id
           WHERE e.usuario_id = $1 ORDER BY e.fecha_limite`, [usuarioId]),
    query('SELECT * FROM bloques_estudio WHERE usuario_id = $1 ORDER BY inicio', [usuarioId]),
  ]);
  return { usuario: u.rows[0], turnos: t.rows, entregas: e.rows, bloques: b.rows };
}

function prefsDe(u) {
  return {
    horaInicioDia: u.hora_inicio_dia,
    horaFinDia: u.hora_fin_dia,
    maxHorasDia: Number(u.max_horas_dia),
    descansoPostTurnoMin: Number(u.descanso_post_turno_min),
  };
}

/**
 * Recalcula el plan: borra los bloques futuros que siguen pendientes y vuelve a ubicar
 * las horas que faltan de cada entrega. Los bloques pasados se conservan para el check-in.
 */
export async function recalcularPlan(usuarioId, ahora = new Date()) {
  const ctx = await cargarContexto(usuarioId);
  const vivos = ctx.bloques.filter((b) => !(b.estado === 'pendiente' && new Date(b.inicio) >= ahora));

  const avanzadas = {};
  const usadasDia = {};
  const ocupadosExtra = [];
  const hoy = fechaISO(ahora);
  for (const b of vivos) {
    if (b.estado === 'cumplido') avanzadas[b.entrega_id] = (avanzadas[b.entrega_id] || 0) + horas(b);
    const enCurso = b.estado === 'pendiente' && new Date(b.inicio) < ahora && new Date(b.fin) > ahora;
    if (enCurso) {
      avanzadas[b.entrega_id] = (avanzadas[b.entrega_id] || 0) + horas(b);
      ocupadosExtra.push({ inicio: new Date(b.inicio), fin: new Date(b.fin) });
    }
    if (b.estado !== 'no_cumplido' && fechaISO(b.inicio) === hoy) usadasDia[hoy] = (usadasDia[hoy] || 0) + horas(b);
  }

  const pendientes = ctx.entregas
    .filter((e) => e.estado === 'pendiente')
    .map((e) => ({ ...e, horas_avanzadas: avanzadas[e.id] || 0 }));

  const res = planificar({
    ahora,
    prefs: prefsDe(ctx.usuario),
    turnos: ctx.turnos,
    entregas: pendientes,
    horasUsadasPorDia: usadasDia,
    ocupadosExtra,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM bloques_estudio WHERE usuario_id = $1 AND estado = 'pendiente' AND inicio >= $2`,
      [usuarioId, ahora],
    );
    for (const b of res.bloques) {
      await client.query(
        'INSERT INTO bloques_estudio(usuario_id, entrega_id, inicio, fin) VALUES ($1,$2,$3,$4)',
        [usuarioId, b.entrega_id, b.inicio, b.fin],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return res;
}

/** Arma la vista de la semana: turnos, bloques, entregas con semáforo, progreso y sugerencias. */
export async function vistaSemana(usuarioId, semanaISO, ahora = new Date()) {
  const plan = await recalcularPlan(usuarioId, ahora);
  const ctx = await cargarContexto(usuarioId);
  const lunes = semanaISO ? lunesDe(desdeISO(semanaISO)) : lunesDe(ahora);
  const domingoFin = sumarDias(lunes, 7);

  // Turnos concretos de la semana para pintar el calendario
  const franjas = [];
  for (let d = 0; d < 7; d++) {
    const dia = sumarDias(lunes, d);
    for (const t of turnosDelDia(ctx.turnos, dia)) {
      const iv = intervaloDeTurno(t, dia);
      franjas.push({ ...iv, especifico: Boolean(t.semana) });
    }
  }

  const entregasPorId = Object.fromEntries(ctx.entregas.map((e) => [e.id, e]));
  const bloquesSemana = ctx.bloques
    .filter((b) => new Date(b.inicio) >= lunes && new Date(b.inicio) < domingoFin)
    .map((b) => {
      const e = entregasPorId[b.entrega_id];
      return { ...b, titulo: e?.titulo, materia: e?.materia, color: e?.color || '#1E9BD7' };
    });

  const entregas = ctx.entregas.map((e) => {
    const bl = ctx.bloques.filter((b) => b.entrega_id === e.id);
    const cumplidas = bl.filter((b) => b.estado === 'cumplido').reduce((s, b) => s + horas(b), 0);
    const planificadas = bl.filter((b) => b.estado === 'pendiente' && new Date(b.fin) > ahora)
      .reduce((s, b) => s + horas(b), 0);
    const restantes = Math.max(0, Number(e.horas_estimadas) - cumplidas);
    const faltantes = plan.porEntrega[e.id]?.faltantes || 0;
    const semaforo = semaforoEntrega({ entrega: e, bloques: bl, faltantes, horasRestantes: restantes, ahora });
    const proximo = bl.filter((b) => b.estado === 'pendiente' && new Date(b.fin) > ahora)
      .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))[0] || null;
    return {
      ...e, horas_cumplidas: cumplidas, horas_planificadas: planificadas, horas_restantes: restantes,
      horas_sin_ubicar: faltantes, semaforo, proximo_bloque: proximo,
    };
  });

  const activas = entregas.filter((e) => e.estado === 'pendiente');
  const color = peorColor(activas.map((e) => e.semaforo.color));

  // Progreso de la semana: bloques cuya hora ya pasó
  const pasados = bloquesSemana.filter((b) => new Date(b.fin) <= ahora);
  const cumplidos = pasados.filter((b) => b.estado === 'cumplido');
  const sinMarcar = ctx.bloques.filter((b) => b.estado === 'pendiente' && new Date(b.fin) <= ahora);

  const progresoMaterias = {};
  for (const b of bloquesSemana) {
    const k = b.materia || 'Sin materia';
    progresoMaterias[k] ??= { materia: k, color: b.color, planificadas: 0, cumplidas: 0 };
    progresoMaterias[k].planificadas += horas(b);
    if (b.estado === 'cumplido') progresoMaterias[k].cumplidas += horas(b);
  }

  const queHacerPrimero = ctx.bloques
    .filter((b) => b.estado === 'pendiente' && new Date(b.fin) > ahora)
    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
    .slice(0, 3)
    .map((b) => ({ ...b, titulo: entregasPorId[b.entrega_id]?.titulo, materia: entregasPorId[b.entrega_id]?.materia, color: entregasPorId[b.entrega_id]?.color }));

  return {
    semana: fechaISO(lunes),
    ahora,
    semaforo: color,
    sugerencias: sugerencias(color),
    franjas,
    bloques: bloquesSemana,
    entregas,
    que_hacer_primero: queHacerPrimero,
    resumen: {
      bloques_pasados: pasados.length,
      bloques_cumplidos: cumplidos.length,
      progreso: pasados.length ? Math.round((cumplidos.length / pasados.length) * 100) : null,
      horas_planificadas: bloquesSemana.reduce((s, b) => s + horas(b), 0),
      horas_cumplidas: cumplidos.reduce((s, b) => s + horas(b), 0),
      horas_libres_proximas: plan.horasLibres,
      checkin_pendiente: sinMarcar.length,
      entregas_activas: activas.length,
    },
    materias: Object.values(progresoMaterias),
    hoy: fechaISO(inicioDelDia(ahora)),
  };
}
