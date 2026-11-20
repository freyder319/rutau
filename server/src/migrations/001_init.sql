-- RutaU: esquema inicial
CREATE TABLE IF NOT EXISTS usuarios (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(120) NOT NULL,
  correo           VARCHAR(160) NOT NULL UNIQUE,
  password_hash    VARCHAR(100) NOT NULL,
  institucion      VARCHAR(160),
  programa         VARCHAR(160),
  semestre         SMALLINT,
  modalidad        VARCHAR(20) DEFAULT 'virtual',
  rol              VARCHAR(20) NOT NULL DEFAULT 'estudiante',
  es_invitado      BOOLEAN NOT NULL DEFAULT FALSE,
  hora_inicio_dia  TIME NOT NULL DEFAULT '06:00',
  hora_fin_dia     TIME NOT NULL DEFAULT '23:00',
  max_horas_dia    NUMERIC(3,1) NOT NULL DEFAULT 3,
  descanso_post_turno_min SMALLINT NOT NULL DEFAULT 30,
  recordatorios_correo BOOLEAN NOT NULL DEFAULT TRUE,
  acepto_datos_en  TIMESTAMPTZ,              -- autorización Ley 1581 de 2012
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materias (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre      VARCHAR(120) NOT NULL,
  color       VARCHAR(9) NOT NULL DEFAULT '#1E9BD7',
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turnos de trabajo y franjas bloqueadas (descanso, familia).
-- semana = NULL  -> se repite todas las semanas
-- semana = fecha -> lunes de la semana en la que aplica (turno rotativo)
CREATE TABLE IF NOT EXISTS turnos (
  id           SERIAL PRIMARY KEY,
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo         VARCHAR(10) NOT NULL CHECK (tipo IN ('trabajo','bloqueo')),
  dia_semana   SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1 = lunes
  hora_inicio  TIME NOT NULL,
  hora_fin     TIME NOT NULL,
  semana       DATE,
  descripcion  VARCHAR(120),
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entregas (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  materia_id      INTEGER REFERENCES materias(id) ON DELETE SET NULL,
  titulo          VARCHAR(200) NOT NULL,
  tipo            VARCHAR(20) NOT NULL DEFAULT 'tarea',
  fecha_limite    TIMESTAMPTZ NOT NULL,
  esfuerzo        VARCHAR(10) NOT NULL DEFAULT 'mediana' CHECK (esfuerzo IN ('pequena','mediana','grande')),
  horas_estimadas NUMERIC(4,1) NOT NULL DEFAULT 4,
  estado          VARCHAR(12) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','entregada')),
  entregada_en    TIMESTAMPTZ,
  origen          VARCHAR(10) NOT NULL DEFAULT 'manual',
  uid_ics         VARCHAR(255),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bloques_estudio (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  entrega_id  INTEGER NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  inicio      TIMESTAMPTZ NOT NULL,
  fin         TIMESTAMPTZ NOT NULL,
  estado      VARCHAR(12) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','cumplido','no_cumplido')),
  marcado_en  TIMESTAMPTZ,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recordatorios (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  entrega_id  INTEGER NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  tipo        VARCHAR(10) NOT NULL,          -- 72h | 24h | prueba
  canal       VARCHAR(10) NOT NULL,          -- app | correo
  enviado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entrega_id, tipo, canal)
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo      VARCHAR(160) NOT NULL,
  mensaje     TEXT NOT NULL,
  tipo        VARCHAR(20) NOT NULL DEFAULT 'recordatorio',
  leida       BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apoyos institucionales (globales si usuario_id es NULL, o agregados por el estudiante)
CREATE TABLE IF NOT EXISTS apoyos (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria   VARCHAR(20) NOT NULL,  -- bienestar | financiacion | academico
  nombre      VARCHAR(160) NOT NULL,
  descripcion TEXT,
  url         VARCHAR(300),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eventos de uso para las métricas de validación (Lean Startup)
CREATE TABLE IF NOT EXISTS eventos (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo        VARCHAR(40) NOT NULL,
  meta        JSONB,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Encuesta de validación dentro del MVP
CREATE TABLE IF NOT EXISTS respuestas_encuesta (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  trabaja             VARCHAR(30),
  modalidad           VARCHAR(20),
  semestre            VARCHAR(10),
  horas_estudio       VARCHAR(20),
  atrasos_trabajo     VARCHAR(20),
  detecta_atraso      VARCHAR(30),
  herramienta         VARCHAR(40),
  penso_retirarse     VARCHAR(5),
  utilidad            SMALLINT CHECK (utilidad BETWEEN 1 AND 5),
  facilidad           SMALLINT CHECK (facilidad BETWEEN 1 AND 5),
  ajuste_horario      SMALLINT CHECK (ajuste_horario BETWEEN 1 AND 5),
  uso_semanal         VARCHAR(10),
  pagaria             VARCHAR(10),
  lo_que_gusto        TEXT,
  que_mejorar         TEXT,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entregas_usuario ON entregas(usuario_id, fecha_limite);
CREATE INDEX IF NOT EXISTS idx_bloques_usuario ON bloques_estudio(usuario_id, inicio);
CREATE INDEX IF NOT EXISTS idx_turnos_usuario ON turnos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_eventos_usuario ON eventos(usuario_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificaciones(usuario_id, leida);
