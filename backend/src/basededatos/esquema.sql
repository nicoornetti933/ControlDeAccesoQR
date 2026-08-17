-- =====================================================================
-- Esquema de base de datos - Sistema de Control de Acceso para Eventos
-- =====================================================================
-- Motor: SQLite (better-sqlite3)
--
-- Este archivo es la unica fuente de verdad sobre la estructura de datos.
-- Las restricciones de integridad (UNIQUE, CHECK, FOREIGN KEY) son la
-- ULTIMA linea de defensa para garantizar la unicidad de los codigos QR:
-- incluso si hubiera un error de logica en el codigo de la aplicacion,
-- la base de datos rechazaria la operacion que intente violarla.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Tabla: usuarios
-- Representa tanto al administrador (rol = 'administrador') como a los
-- clientes/organizadores (rol = 'cliente'). Compartir la tabla evita
-- duplicar la logica de autenticacion para dos entidades casi identicas.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  email               TEXT NOT NULL UNIQUE,
  contrasena_hash     TEXT NOT NULL,
  rol                 TEXT NOT NULL CHECK (rol IN ('administrador', 'cliente')),
  nombre_completo     TEXT NOT NULL,
  nombre_organizacion TEXT,
  telefono            TEXT,
  activo              INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  creado_en           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizado_en      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- ---------------------------------------------------------------------
-- Tabla: eventos
-- Un cliente solo puede tener UN evento con estado 'activo' a la vez.
-- Esto se garantiza con un indice UNICO parcial (WHERE estado = 'activo').
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  fecha           TEXT NOT NULL,
  hora            TEXT NOT NULL,
  lugar           TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'finalizado')),
  creado_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizado_en  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finalizado_en   TEXT,
  finalizado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evento_activo_unico_por_usuario
  ON eventos(usuario_id)
  WHERE estado = 'activo';

CREATE INDEX IF NOT EXISTS idx_eventos_usuario ON eventos(usuario_id);

-- ---------------------------------------------------------------------
-- Tabla: categorias_invitado
-- Categorias personalizadas por evento (ej: "General", "VIP", "Palco"),
-- cada una con un precio de referencia. Las define el cliente para su
-- propio evento; sirven para clasificar invitados y para estimar la
-- recaudacion (ver registrosServicio.obtenerEstadisticasEvento).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias_invitado (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id       INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  precio          REAL NOT NULL DEFAULT 0 CHECK (precio >= 0),
  creado_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizado_en  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (evento_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_categorias_evento ON categorias_invitado(evento_id);

-- ---------------------------------------------------------------------
-- Tabla: invitados
-- La columna categoria_id es opcional (un invitado puede no tener
-- categoria asignada). IMPORTANTE: en una base de datos que ya existia
-- antes de esta funcionalidad, "CREATE TABLE IF NOT EXISTS" de abajo NO
-- hace nada (la tabla ya existe sin esa columna), asi que agregarla es
-- responsabilidad de la migracion en conexion.js (ver aplicarMigraciones).
-- Por eso el indice de categoria_id NO se crea aca (fallaria en esas
-- bases viejas, porque la columna todavia no existiria en ese momento):
-- se crea siempre desde aplicarMigraciones, despues de garantizar que la
-- columna exista.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitados (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id       INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  categoria_id    INTEGER REFERENCES categorias_invitado(id) ON DELETE SET NULL,
  nombre          TEXT NOT NULL,
  apellido        TEXT NOT NULL,
  dni             TEXT NOT NULL,
  telefono        TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'ingresado', 'cancelado', 'deshabilitado')),
  creado_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizado_en  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (evento_id, dni)
);

CREATE INDEX IF NOT EXISTS idx_invitados_evento ON invitados(evento_id);

-- ---------------------------------------------------------------------
-- Tabla: codigos_qr
-- REQUISITO CRITICO: cada "identificador_unico" es UNICO EN TODO EL
-- SISTEMA (no solo por evento o por invitado). La restriccion UNIQUE de
-- la columna lo garantiza a nivel de base de datos. Ademas, un invitado
-- solo puede tener UN codigo QR con estado 'activo' a la vez (indice
-- unico parcial), de forma que regenerar un QR obliga a invalidar el
-- anterior antes de poder crear uno nuevo activo.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS codigos_qr (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  identificador_unico TEXT NOT NULL UNIQUE,
  invitado_id         INTEGER NOT NULL REFERENCES invitados(id) ON DELETE CASCADE,
  evento_id           INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  estado              TEXT NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'usado', 'invalidado')),
  creado_en           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  usado_en            TEXT,
  invalidado_en       TEXT
);

-- Un invitado no puede tener dos codigos QR activos simultaneamente.
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_activo_unico_por_invitado
  ON codigos_qr(invitado_id)
  WHERE estado = 'activo';

CREATE INDEX IF NOT EXISTS idx_qr_invitado ON codigos_qr(invitado_id);
CREATE INDEX IF NOT EXISTS idx_qr_evento ON codigos_qr(evento_id);

-- ---------------------------------------------------------------------
-- Tabla: registros_acceso
-- Historial inmutable de cada intento de ingreso (autorizado o rechazado).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_acceso (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id       INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  invitado_id     INTEGER REFERENCES invitados(id) ON DELETE SET NULL,
  codigo_qr_id    INTEGER REFERENCES codigos_qr(id) ON DELETE SET NULL,
  resultado       TEXT NOT NULL CHECK (resultado IN ('autorizado', 'rechazado')),
  motivo          TEXT NOT NULL,
  escaneado_por   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_hora      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_registros_acceso_evento ON registros_acceso(evento_id);
CREATE INDEX IF NOT EXISTS idx_registros_acceso_invitado ON registros_acceso(invitado_id);

-- ---------------------------------------------------------------------
-- Tabla: registros_auditoria
-- Bitacora general de operaciones sensibles del sistema (creacion de
-- clientes, activaciones/desactivaciones, finalizacion de eventos,
-- regeneracion de QR, inicios de sesion, etc.).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_auditoria (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  accion      TEXT NOT NULL,
  detalle     TEXT,
  direccion_ip TEXT,
  creado_en   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON registros_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON registros_auditoria(accion);
