/**
 * Modulo de conexion a la base de datos.
 *
 * Expone una unica instancia (singleton) de la conexion SQLite para que
 * toda la aplicacion comparta el mismo archivo y la misma configuracion
 * de PRAGMAs. Tambien se encarga de aplicar el esquema (esquema.sql) de
 * forma idempotente al arrancar, para que el sistema funcione con un
 * simple "npm start" sin pasos manuales de migracion.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const configuracion = require('../configuracion/configuracion');

const carpetaDatos = path.dirname(configuracion.rutaBaseDeDatos);
if (!fs.existsSync(carpetaDatos)) {
  fs.mkdirSync(carpetaDatos, { recursive: true });
}

const baseDeDatos = new Database(configuracion.rutaBaseDeDatos);

// PRAGMAs recomendados:
// - foreign_keys: sin esto, SQLite ignora las restricciones FOREIGN KEY.
// - journal_mode=WAL: mejora la concurrencia entre lecturas y escrituras.
baseDeDatos.pragma('foreign_keys = ON');
baseDeDatos.pragma('journal_mode = WAL');

function aplicarEsquema() {
  const rutaEsquema = path.join(__dirname, 'esquema.sql');
  const esquemaSql = fs.readFileSync(rutaEsquema, 'utf8');
  baseDeDatos.exec(esquemaSql);
}

// Migraciones manuales para bases de datos que ya existian antes de que
// se agregara una columna nueva a una tabla ya creada. "CREATE TABLE IF
// NOT EXISTS" (en esquema.sql) no alcanza para eso: si la tabla ya
// existe, esa sentencia no hace nada. Cada migracion chequea primero si
// la columna ya existe (con PRAGMA table_info) antes de agregarla, para
// que este archivo se pueda ejecutar de forma segura en cada arranque.
function aplicarMigraciones() {
  const columnasInvitados = baseDeDatos.prepare('PRAGMA table_info(invitados)').all();
  const tieneCategoriaId = columnasInvitados.some((columna) => columna.name === 'categoria_id');
  if (!tieneCategoriaId) {
    baseDeDatos.exec(
      'ALTER TABLE invitados ADD COLUMN categoria_id INTEGER REFERENCES categorias_invitado(id) ON DELETE SET NULL'
    );
  }
  // Se crea siempre (con IF NOT EXISTS), tanto en bases nuevas (donde la
  // columna ya vino en el CREATE TABLE de esquema.sql) como en bases
  // migradas recien arriba: en esquema.sql no se puede crear este indice
  // porque en una base vieja, en el momento en que se ejecuta ese
  // archivo, la columna todavia no existe.
  baseDeDatos.exec('CREATE INDEX IF NOT EXISTS idx_invitados_categoria ON invitados(categoria_id)');
}

aplicarEsquema();
aplicarMigraciones();

module.exports = baseDeDatos;
