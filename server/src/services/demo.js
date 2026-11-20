// Datos de ejemplo para que una persona pueda probar RutaU en 5 minutos sin escribir nada.
import { pool } from '../db.js';
import { sumarDias, lunesDe, fechaISO, conHora, inicioDelDia } from './tiempo.js';
import { HORAS_POR_ESFUERZO } from './planner.js';

export async function cargarDatosDemo(usuarioId, ahora = new Date()) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    for (const t of ['bloques_estudio', 'recordatorios', 'entregas', 'turnos', 'materias', 'notificaciones']) {
      await c.query(`DELETE FROM ${t} WHERE usuario_id = $1`, [usuarioId]);
    }
    await c.query(
      `UPDATE usuarios SET hora_inicio_dia='06:00', hora_fin_dia='23:00', max_horas_dia=3,
       descanso_post_turno_min=30 WHERE id=$1`, [usuarioId],
    );

    const materias = {};
    for (const [nombre, color] of [
      ['Cálculo I', '#1E9BD7'],
      ['Fundamentos de Programación', '#E07A5F'],
      ['Inglés II', '#2A9D8F'],
      ['Comunicación Oral y Escrita', '#8E7CC3'],
    ]) {
      const r = await c.query('INSERT INTO materias(usuario_id, nombre, color) VALUES ($1,$2,$3) RETURNING id',
        [usuarioId, nombre, color]);
      materias[nombre] = r.rows[0].id;
    }

    const turno = (tipo, dia, ini, fin, desc, semana = null) => c.query(
      `INSERT INTO turnos(usuario_id, tipo, dia_semana, hora_inicio, hora_fin, descripcion, semana)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`, [usuarioId, tipo, dia, ini, fin, desc, semana]);

    // Horario habitual: oficina de lunes a viernes y medio día el sábado
    for (let d = 1; d <= 5; d++) await turno('trabajo', d, '08:00', '17:00', 'Turno oficina');
    await turno('trabajo', 6, '08:00', '12:00', 'Turno sábado');
    for (let d = 1; d <= 5; d++) await turno('bloqueo', d, '19:00', '20:00', 'Cena y familia');
    await turno('bloqueo', 7, '10:00', '18:00', 'Tiempo en familia');
    // Turno rotativo: la próxima semana le cambian a turno de tarde
    const proxima = fechaISO(sumarDias(lunesDe(ahora), 7));
    for (let d = 1; d <= 5; d++) await turno('trabajo', d, '14:00', '22:00', 'Turno tarde (rotativo)', proxima);
    await turno('trabajo', 6, '08:00', '12:00', 'Turno sábado', proxima);

    const hoy = inicioDelDia(ahora);
    const entrega = async (titulo, materia, tipo, dias, esfuerzo, extra = {}) => {
      const fecha = conHora(sumarDias(hoy, dias), '23:59');
      const r = await c.query(
        `INSERT INTO entregas(usuario_id, materia_id, titulo, tipo, fecha_limite, esfuerzo, horas_estimadas, estado, entregada_en, origen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'demo') RETURNING id`,
        [usuarioId, materias[materia], titulo, tipo, fecha, esfuerzo, HORAS_POR_ESFUERZO[esfuerzo],
          extra.estado || 'pendiente', extra.entregada_en || null],
      );
      return r.rows[0].id;
    };

    const lectura = await entrega('Lectura y resumen capítulo 2', 'Comunicación Oral y Escrita', 'tarea', -1, 'pequena',
      { estado: 'entregada', entregada_en: conHora(sumarDias(hoy, -1), '21:30') });
    const quiz = await entrega('Quiz semana 5', 'Cálculo I', 'evaluacion', 2, 'pequena');
    await entrega('Taller de algoritmos', 'Fundamentos de Programación', 'tarea', 1, 'grande');
    await entrega('Foro: presentación personal', 'Inglés II', 'foro', 4, 'pequena');
    const ensayo = await entrega('Ensayo argumentativo', 'Comunicación Oral y Escrita', 'tarea', 6, 'mediana');
    await entrega('Proyecto final – entrega 1', 'Fundamentos de Programación', 'proyecto', 9, 'grande');

    // Historial de ayer: dos bloques cumplidos y uno que no se pudo cumplir
    const ayer = sumarDias(hoy, -1);
    const bloque = (eid, ini, fin, estado) => c.query(
      `INSERT INTO bloques_estudio(usuario_id, entrega_id, inicio, fin, estado, marcado_en) VALUES ($1,$2,$3,$4,$5,NOW())`,
      [usuarioId, eid, conHora(ayer, ini), conHora(ayer, fin), estado]);
    await bloque(lectura, '20:00', '21:00', 'cumplido');
    await bloque(quiz, '06:00', '07:00', 'cumplido');
    await bloque(ensayo, '21:00', '22:00', 'no_cumplido');

    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
