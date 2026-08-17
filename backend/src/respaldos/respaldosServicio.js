/**
 * Servicio de respaldos automaticos de la base de datos.
 *
 * Usa el metodo "backup()" de better-sqlite3, que se apoya en la API de
 * backup online de SQLite: es seguro llamarlo con la base de datos en
 * uso (con el servidor corriendo y usuarios conectados), a diferencia de
 * copiar el archivo .db "a mano" con fs.copyFile mientras alguien podria
 * estar escribiendo en ese mismo instante.
 *
 * Cada copia queda en datos/respaldos/ con la fecha y hora en el nombre.
 * Para no llenar el disco con el tiempo, cada vez que se crea un
 * respaldo nuevo se borran los mas viejos, conservando unicamente los
 * ultimos N (configurable, ver configuracion.respaldos.cantidadAConservar).
 */

const fs = require('fs');
const path = require('path');
const baseDeDatos = require('../basededatos/conexion');
const configuracion = require('../configuracion/configuracion');
const registrarAuditoria = require('../seguridad/registrarAuditoria');

const PREFIJO_ARCHIVO = 'sistema-';
const EXTENSION_ARCHIVO = '.db';

function asegurarCarpetaRespaldos() {
  if (!fs.existsSync(configuracion.respaldos.carpeta)) {
    fs.mkdirSync(configuracion.respaldos.carpeta, { recursive: true });
  }
}

function generarNombreArchivo(fecha = new Date()) {
  // Nombre ordenable alfabeticamente por fecha (ISO sin caracteres que
  // Windows prohibe en nombres de archivo, como ":"), ej:
  // sistema-2026-08-17T14-30-00.db
  const marcaDeTiempo = fecha.toISOString().replace(/:/g, '-').split('.')[0];
  return `${PREFIJO_ARCHIVO}${marcaDeTiempo}${EXTENSION_ARCHIVO}`;
}

function listarArchivosDeRespaldo() {
  asegurarCarpetaRespaldos();
  return fs
    .readdirSync(configuracion.respaldos.carpeta)
    .filter((nombre) => nombre.startsWith(PREFIJO_ARCHIVO) && nombre.endsWith(EXTENSION_ARCHIVO));
}

function listarRespaldos() {
  return listarArchivosDeRespaldo()
    .map((nombre) => {
      const rutaCompleta = path.join(configuracion.respaldos.carpeta, nombre);
      const info = fs.statSync(rutaCompleta);
      return {
        archivo: nombre,
        tamanioBytes: info.size,
        creadoEn: info.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

// Borra los respaldos mas viejos, dejando solo los ultimos N (los mas
// recientes por nombre de archivo, que al estar en formato ISO tambien
// ordenan cronologicamente).
function eliminarRespaldosAntiguos() {
  const archivos = listarArchivosDeRespaldo().sort().reverse(); // mas nuevo primero
  const aEliminar = archivos.slice(configuracion.respaldos.cantidadAConservar);
  for (const nombre of aEliminar) {
    fs.unlinkSync(path.join(configuracion.respaldos.carpeta, nombre));
  }
  return aEliminar.length;
}

// Crea un respaldo nuevo de la base de datos. "origen" identifica quien
// lo disparo (para el registro de auditoria): 'automatico' cuando lo
// dispara el programador interno, o el id del administrador cuando lo
// pide manualmente desde el panel.
async function crearRespaldo({ origen = 'automatico', usuarioId = null, direccionIp = null } = {}) {
  asegurarCarpetaRespaldos();
  const nombreArchivo = generarNombreArchivo();
  const rutaDestino = path.join(configuracion.respaldos.carpeta, nombreArchivo);

  await baseDeDatos.backup(rutaDestino);

  const eliminados = eliminarRespaldosAntiguos();
  const info = fs.statSync(rutaDestino);

  registrarAuditoria({
    usuarioId,
    accion: 'respaldo_creado',
    detalle: { archivo: nombreArchivo, origen, tamanioBytes: info.size, respaldosEliminados: eliminados },
    direccionIp,
  });

  return { archivo: nombreArchivo, tamanioBytes: info.size, creadoEn: info.mtime.toISOString() };
}

module.exports = { crearRespaldo, listarRespaldos };
