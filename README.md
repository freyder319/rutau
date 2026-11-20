# RutaU – MVP

Aplicación web progresiva (PWA) que convierte los turnos de trabajo y las fechas de entrega de un estudiante en un **plan de estudio semanal realista**, le avisa **72 y 24 horas antes** de cada entrega y muestra un **semáforo de avance** (verde, amarillo, rojo).

Proyecto del módulo *Emprendimiento de Base Tecnológica* – Politécnico Grancolombiano (EquipoEBTB09-15).

## Funcionalidades del MVP

| Funcionalidad | Dónde está en el código |
|---|---|
| Registro e inicio de sesión (JWT + bcrypt), autorización Ley 1581 | `server/src/routes/auth.js` |
| Turnos de trabajo fijos, rotativos (por semana) y nocturnos; franjas de descanso/familia | `server/src/routes/datos.js` |
| Materias y entregas (manual o importadas de un calendario `.ics` de Canvas/Moodle) | `server/src/routes/datos.js`, `server/src/services/ics.js` |
| Motor de planificación (prioriza lo que vence primero y lo que requiere más trabajo) | `server/src/services/planner.js` |
| Semáforo de avance y sugerencias (reorganizar, prórroga, bienestar) | `server/src/services/semaforo.js` |
| Check-in semanal y recálculo automático del plan | `server/src/services/plan.js` |
| Recordatorios 72 h y 24 h (campana en la app + correo opcional) | `server/src/services/recordatorios.js` |
| Apoyos institucionales y mensaje modelo de prórroga | `client/src/pages/Apoyos.jsx` |
| Prueba de humo "Quiero Premium" (hipótesis H5) | `client/src/components/PremiumModal.jsx` |
| Encuesta de validación dentro de la app | `client/src/pages/Encuesta.jsx` |
| Panel del equipo con métricas del piloto y exportación CSV | `server/src/routes/admin.js`, `client/src/pages/Admin.jsx` |
| Modo "Probar con datos de ejemplo" (cuenta de invitado) | `server/src/services/demo.js` |

## Tecnologías

React 19 + Vite (PWA) · Node.js 22 + Express 5 (API REST) · PostgreSQL · JWT + bcrypt · node-cron + Nodemailer · node-ical · Render (servidor de pruebas) · Git y GitHub.

## Ejecutar en local

Requisitos: Node.js 22.9 o superior y PostgreSQL.

```bash
# 1. Base de datos
createdb rutau            # o crea la base con pgAdmin

# 2. Variables de entorno
cp .env.example server/.env   # y ajusta DATABASE_URL y ADMIN_EMAILS

# 3. Instalar, compilar y arrancar
npm run build
npm start                 # http://localhost:3000
```

Para desarrollo con recarga: `npm run dev:server` en una terminal y `npm run dev:client` en otra (http://localhost:5173).

Pruebas del motor de planificación: `npm test`.

Las tablas se crean solas al arrancar (`server/src/migrations/001_init.sql`).

## Desplegar en el servidor de pruebas (Render, plan gratuito)

1. Sube este repositorio a GitHub.
2. En https://render.com → **New + → Blueprint** → elige el repositorio. Render lee `render.yaml` y crea la base de datos PostgreSQL y el servicio web.
3. Cuando lo pida, completa las variables:
   - `ADMIN_EMAILS`: los correos del equipo (separados por coma) que podrán ver el **Panel del equipo**.
   - `APP_URL`: la URL que te asigne Render (por ejemplo `https://rutau.onrender.com`).
   - `SMTP_*` y `MAIL_FROM` (opcional): para que los recordatorios también lleguen por correo. Con Gmail, crea una *contraseña de aplicación*.
4. Espera a que termine el despliegue y abre la URL. Revisa `https://TU-URL/api/salud`.
5. Registra en la app las cuentas del equipo con los mismos correos de `ADMIN_EMAILS` y entra a **Panel del equipo**.

> En el plan gratuito, Render apaga el servicio tras 15 minutos sin visitas y tarda unos 50 segundos en despertar. Para que los recordatorios se revisen aunque nadie entre, crea una tarea en https://cron-job.org que visite `https://TU-URL/api/salud` cada 10 minutos.
>
> La base de datos gratuita de Render vence a los 30 días; alcanza para el piloto. Para algo permanente se puede usar Neon o Supabase cambiando `DATABASE_URL`.

## Piloto de validación (cómo recoger evidencias reales)

1. Comparte la URL en los grupos del curso, WhatsApp o Teams con estudiantes que trabajan.
2. Cada persona puede **crear su cuenta** (mejor: se mide activación y uso real) o tocar **Probar con datos de ejemplo**.
3. Después de usarla, responde **Danos tu opinión** (2 minutos, anónima).
4. En **Panel del equipo** se ven las métricas (activación, uso 3+ días por semana, entregas a tiempo, clics en Premium, resultados de la encuesta y comentarios). Botones **Encuesta CSV** y **Uso CSV** para descargar los datos.
5. Las métricas excluyen automáticamente las cuentas del equipo (`ADMIN_EMAILS`).

## Estructura

```
rutau/
├── client/            Interfaz React (PWA)
│   ├── public/        manifest, service worker e íconos
│   └── src/pages/     Pantallas (Mi semana, Entregas, Horario, Check-in, Apoyos, Opinión, Panel)
├── server/            API Express
│   ├── src/migrations Esquema de base de datos
│   ├── src/routes/    Endpoints REST
│   ├── src/services/  Motor de planificación, semáforo, recordatorios, .ics, datos de ejemplo
│   └── test/          Pruebas del motor
└── render.yaml        Despliegue en Render
```
