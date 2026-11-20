process.env.TZ = process.env.TZ || 'America/Bogota';

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import cron from 'node-cron';
import { migrate, query } from './db.js';
import { requiereAuth, requiereAdmin } from './auth.js';
import authRoutes from './routes/auth.js';
import datosRoutes from './routes/datos.js';
import appRoutes from './routes/app.js';
import adminRoutes from './routes/admin.js';
import { procesarRecordatorios, correoConfigurado } from './services/recordatorios.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

// Permite que Express capture errores de funciones async (Express 5 lo hace de forma nativa)
app.get('/api/salud', async (req, res) => {
  await query('SELECT 1');
  res.json({ ok: true, app: 'RutaU', version: '1.0.0-mvp', correo: correoConfigurado, hora: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', requiereAuth, requiereAdmin, adminRoutes);
app.use('/api', requiereAuth, datosRoutes);
app.use('/api', requiereAuth, appRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// Interfaz React compilada (PWA)
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Ocurrió un error inesperado. Intenta de nuevo.' });
});

const PORT = Number(process.env.PORT || 3000);

await migrate();
app.listen(PORT, () => console.log(`RutaU escuchando en http://localhost:${PORT}`));

// Recordatorios 72 h y 24 h: se revisan cada 10 minutos
cron.schedule('*/10 * * * *', () => {
  procesarRecordatorios().then((n) => n && console.log(`[recordatorios] enviados: ${n}`)).catch((e) => console.error(e));
});
