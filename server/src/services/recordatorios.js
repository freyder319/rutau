import nodemailer from 'nodemailer';
import { query } from '../db.js';
import { HORA } from './tiempo.js';

let transporte = null;
export const correoConfigurado = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

if (correoConfigurado) {
  transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const fmt = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota',
});

export async function enviarCorreo(para, asunto, texto) {
  if (!transporte) {
    console.log(`[correo simulado] Para: ${para} | ${asunto}`);
    return false;
  }
  try {
    await transporte.sendMail({
      from: process.env.MAIL_FROM || `RutaU <${process.env.SMTP_USER}>`,
      to: para,
      subject: asunto,
      text: texto,
    });
    return true;
  } catch (e) {
    console.error('[correo] error', e.message);
    return false;
  }
}

async function notificar(usuarioId, titulo, mensaje, tipo = 'recordatorio') {
  await query('INSERT INTO notificaciones(usuario_id, titulo, mensaje, tipo) VALUES ($1,$2,$3,$4)',
    [usuarioId, titulo, mensaje, tipo]);
}

function mensajeEntrega(e, tipo) {
  const cuando = fmt.format(new Date(e.fecha_limite)).replace(/\.$/, '');
  const materia = e.materia ? ` (${e.materia})` : '';
  const anticipacion = tipo === '24h' ? 'menos de 24 horas' : tipo === '72h' ? 'menos de 72 horas' : 'pocos días';
  return {
    titulo: `Vence en ${anticipacion}: ${e.titulo}`,
    mensaje: `Tu entrega "${e.titulo}"${materia} vence el ${cuando}. Revisa tu plan en RutaU y marca tus bloques de estudio cuando los cumplas.`,
  };
}

/** Revisa las entregas que vencen pronto y envía los recordatorios de 72 h y 24 h una sola vez. */
export async function procesarRecordatorios(ahora = new Date(), usuarioId = null) {
  const params = [ahora, new Date(ahora.getTime() + 72 * HORA)];
  let filtro = '';
  if (usuarioId) { params.push(usuarioId); filtro = 'AND e.usuario_id = $3'; }
  const { rows } = await query(
    `SELECT e.*, m.nombre AS materia, u.correo, u.recordatorios_correo, u.es_invitado
     FROM entregas e
     JOIN usuarios u ON u.id = e.usuario_id
     LEFT JOIN materias m ON m.id = e.materia_id
     WHERE e.estado = 'pendiente' AND e.fecha_limite > $1 AND e.fecha_limite <= $2 ${filtro}`,
    params,
  );
  let enviados = 0;
  for (const e of rows) {
    const restante = (new Date(e.fecha_limite) - ahora) / HORA;
    const tipo = restante <= 24 ? '24h' : '72h';
    const app = await query(
      `INSERT INTO recordatorios(usuario_id, entrega_id, tipo, canal) VALUES ($1,$2,$3,'app')
       ON CONFLICT DO NOTHING RETURNING id`, [e.usuario_id, e.id, tipo],
    );
    if (!app.rowCount) continue;
    const { titulo, mensaje } = mensajeEntrega(e, tipo);
    await notificar(e.usuario_id, titulo, mensaje);
    enviados++;
    if (e.recordatorios_correo && !e.es_invitado) {
      const ok = await enviarCorreo(e.correo, `RutaU · ${titulo}`, `${mensaje}\n\nEntra a RutaU: ${process.env.APP_URL || ''}`);
      if (ok) {
        await query(
          `INSERT INTO recordatorios(usuario_id, entrega_id, tipo, canal) VALUES ($1,$2,$3,'correo')
           ON CONFLICT DO NOTHING`, [e.usuario_id, e.id, tipo],
        );
      }
    }
  }
  return enviados;
}

/** Recordatorio de prueba para mostrar el funcionamiento durante la validación. */
export async function recordatorioPrueba(usuarioId) {
  const { rows } = await query(
    `SELECT e.*, m.nombre AS materia, u.correo, u.es_invitado, u.recordatorios_correo
     FROM entregas e JOIN usuarios u ON u.id = e.usuario_id
     LEFT JOIN materias m ON m.id = e.materia_id
     WHERE e.usuario_id = $1 AND e.estado = 'pendiente' AND e.fecha_limite > NOW()
     ORDER BY e.fecha_limite LIMIT 1`, [usuarioId],
  );
  if (!rows.length) return { ok: false, motivo: 'No tienes entregas pendientes.' };
  const e = rows[0];
  const { titulo, mensaje } = mensajeEntrega(e, 'prueba');
  await notificar(usuarioId, `Prueba · ${titulo}`, mensaje, 'prueba');
  let correo = false;
  if (!e.es_invitado && e.recordatorios_correo) {
    correo = await enviarCorreo(e.correo, `RutaU · Recordatorio de prueba`, mensaje);
  }
  return { ok: true, correo };
}
