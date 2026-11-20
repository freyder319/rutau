import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Los NUMERIC llegan como texto por defecto; los convertimos a número.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
// Las columnas DATE se manejan como texto 'YYYY-MM-DD' para evitar corrimientos de zona horaria.
pg.types.setTypeParser(1082, (v) => v);

const connectionString = process.env.DATABASE_URL || 'postgres://rutau:rutau@localhost:5432/rutau';
const useSSL = process.env.PGSSL === 'true' || /render\.com|neon\.tech|supabase/.test(connectionString);

export const pool = new pg.Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 5,
  options: '-c timezone=America/Bogota',
});

export const query = (text, params) => pool.query(text, params);

export async function migrate() {
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    nombre VARCHAR(120) PRIMARY KEY, aplicada_en TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const { rowCount } = await query('SELECT 1 FROM schema_migrations WHERE nombre = $1', [f]);
    if (rowCount) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(nombre) VALUES ($1)', [f]);
      await client.query('COMMIT');
      console.log(`[db] migración aplicada: ${f}`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  await seedApoyos();
}

async function seedApoyos() {
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM apoyos WHERE usuario_id IS NULL');
  if (rows[0].n > 0) return;
  const apoyos = [
    ['bienestar', 'Bienestar universitario de tu institución',
      'Consejería, acompañamiento psicosocial y programas de permanencia. Agrega abajo el enlace de bienestar de tu universidad para tenerlo a mano.', null],
    ['academico', 'Solicitar una prórroga al docente',
      'Si el semáforo está en rojo, escribe a tu docente antes de la fecha límite. RutaU te sugiere un mensaje modelo.', null],
    ['academico', 'Monitorías y tutorías de tu programa',
      'Pregunta en tu aula virtual por las monitorías o asesorías disponibles para la materia que más se te complica.', null],
    ['financiacion', 'ICETEX – créditos educativos',
      'Líneas de crédito para iniciar o continuar estudios de pregrado.', 'https://web.icetex.gov.co/creditos'],
  ];
  for (const a of apoyos) {
    await query('INSERT INTO apoyos(categoria, nombre, descripcion, url) VALUES ($1,$2,$3,$4)', a);
  }
}

export async function registrarEvento(usuarioId, tipo, meta = null) {
  try {
    await query('INSERT INTO eventos(usuario_id, tipo, meta) VALUES ($1,$2,$3)', [usuarioId, tipo, meta]);
  } catch (e) {
    console.error('[eventos]', e.message);
  }
}
