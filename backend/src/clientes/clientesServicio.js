/**
 * Servicio de clientes (organizadores). Encapsula toda la logica y el
 * acceso a datos relacionados con la cuenta de un cliente. El modulo de
 * administracion lo usa para exponer estas operaciones al administrador,
 * pero la logica de negocio (por ejemplo, que no se pueda crear un
 * cliente con un email repetido) vive aca, no en el controlador.
 */

const baseDeDatos = require('../basededatos/conexion');
const { ErrorHttp } = require('../seguridad/manejadorErrores');
const { hashearContrasena } = require('../autenticacion/servicioContrasenas');

const sentencias = {
  crearCliente: baseDeDatos.prepare(`
    INSERT INTO usuarios (email, contrasena_hash, rol, nombre_completo, nombre_organizacion, telefono, activo)
    VALUES (@email, @contrasenaHash, 'cliente', @nombreCompleto, @nombreOrganizacion, @telefono, 1)
  `),
  // Nunca se selecciona "contrasena_hash": este dato no debe salir jamas
  // del modulo de autenticacion, ni siquiera hacia el propio administrador.
  obtenerClientePorId: baseDeDatos.prepare(
    "SELECT id, email, rol, nombre_completo, nombre_organizacion, telefono, activo, creado_en, actualizado_en FROM usuarios WHERE id = ? AND rol = 'cliente'"
  ),
  obtenerPorEmail: baseDeDatos.prepare('SELECT id FROM usuarios WHERE email = ?'),
  listarClientes: baseDeDatos.prepare(
    "SELECT id, email, nombre_completo, nombre_organizacion, telefono, activo, creado_en FROM usuarios WHERE rol = 'cliente' ORDER BY creado_en DESC"
  ),
  actualizarEstadoActivo: baseDeDatos.prepare(
    "UPDATE usuarios SET activo = ?, actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND rol = 'cliente'"
  ),
  eliminarCliente: baseDeDatos.prepare("DELETE FROM usuarios WHERE id = ? AND rol = 'cliente'"),
  tieneEventoActivo: baseDeDatos.prepare(
    "SELECT COUNT(*) AS total FROM eventos WHERE usuario_id = ? AND estado = 'activo'"
  ),
};

function listarClientes() {
  return sentencias.listarClientes.all();
}

function obtenerClientePorId(clienteId) {
  const cliente = sentencias.obtenerClientePorId.get(clienteId);
  if (!cliente) {
    throw new ErrorHttp(404, 'El cliente no existe.');
  }
  return cliente;
}

function crearCliente(datos) {
  const existente = sentencias.obtenerPorEmail.get(datos.email);
  if (existente) {
    throw new ErrorHttp(409, 'Ya existe un usuario registrado con ese email.');
  }

  const contrasenaHash = hashearContrasena(datos.password);
  const resultado = sentencias.crearCliente.run({
    email: datos.email,
    contrasenaHash,
    nombreCompleto: datos.nombreCompleto,
    nombreOrganizacion: datos.nombreOrganizacion || null,
    telefono: datos.telefono || null,
  });

  return obtenerClientePorId(resultado.lastInsertRowid);
}

function cambiarEstadoActivo(clienteId, activo) {
  obtenerClientePorId(clienteId);
  sentencias.actualizarEstadoActivo.run(activo ? 1 : 0, clienteId);
  return obtenerClientePorId(clienteId);
}

function eliminarCliente(clienteId) {
  obtenerClientePorId(clienteId);
  // ON DELETE CASCADE elimina en cadena sus eventos, invitados, QR y
  // registros de acceso asociados. La bitacora de auditoria conserva la
  // referencia (usuario_id queda en NULL) para no perder trazabilidad.
  sentencias.eliminarCliente.run(clienteId);
}

function clienteTieneEventoActivo(clienteId) {
  return sentencias.tieneEventoActivo.get(clienteId).total > 0;
}

module.exports = {
  listarClientes,
  obtenerClientePorId,
  crearCliente,
  cambiarEstadoActivo,
  eliminarCliente,
  clienteTieneEventoActivo,
};
