/**
 * Controlador de administracion: orquesta los modulos de clientes,
 * eventos, invitados y control de acceso desde la perspectiva del
 * administrador, que tiene acceso global al sistema.
 */

const clientesServicio = require('../clientes/clientesServicio');
const eventosServicio = require('../eventos/eventosServicio');
const invitadosServicio = require('../invitados/invitadosServicio');
const controlAccesoServicio = require('../controlAcceso/controlAccesoServicio');
const registrosServicio = require('../registros/registrosServicio');
const registrarAuditoria = require('../seguridad/registrarAuditoria');
const { ErrorHttp } = require('../seguridad/manejadorErrores');

// ---- Clientes -------------------------------------------------------

function listarClientes(req, res) {
  res.json({ clientes: clientesServicio.listarClientes() });
}

function crearCliente(req, res) {
  const cliente = clientesServicio.crearCliente(req.body);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'cliente_creado',
    detalle: { clienteId: cliente.id, email: cliente.email },
    direccionIp: req.ip,
  });
  res.status(201).json({ cliente });
}

function cambiarEstadoCliente(req, res) {
  const clienteId = Number(req.params.id);
  const cliente = clientesServicio.cambiarEstadoActivo(clienteId, req.body.activo);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: req.body.activo ? 'cliente_activado' : 'cliente_desactivado',
    detalle: { clienteId },
    direccionIp: req.ip,
  });
  res.json({ cliente });
}

function eliminarCliente(req, res, next) {
  const clienteId = Number(req.params.id);

  if (clientesServicio.clienteTieneEventoActivo(clienteId)) {
    return next(
      new ErrorHttp(
        409,
        'No se puede eliminar la cuenta mientras tenga un evento activo. Finaliza el evento primero.'
      )
    );
  }

  clientesServicio.eliminarCliente(clienteId);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'cliente_eliminado',
    detalle: { clienteId },
    direccionIp: req.ip,
  });
  res.status(204).send();
}

// ---- Eventos ----------------------------------------------------------

function listarEventos(req, res) {
  res.json({ eventos: eventosServicio.listarTodosLosEventos() });
}

function obtenerEvento(req, res, next) {
  const eventoId = Number(req.params.id);
  const evento = eventosServicio.obtenerEventoPorId(eventoId);
  if (!evento) {
    return next(new ErrorHttp(404, 'El evento no existe.'));
  }
  res.json({
    evento,
    estadisticas: registrosServicio.obtenerEstadisticasEvento(eventoId),
  });
}

function finalizarEvento(req, res) {
  const eventoId = Number(req.params.id);
  const evento = eventosServicio.finalizarEventoComoAdmin(eventoId, req.usuario.id);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'evento_finalizado',
    detalle: { eventoId },
    direccionIp: req.ip,
  });
  res.json({ evento });
}

// ---- Invitados y accesos (solo lectura, supervision) -----------------

function listarInvitadosDeEvento(req, res) {
  const eventoId = Number(req.params.id);
  res.json({ invitados: invitadosServicio.listarInvitadosDeEventoComoAdmin(eventoId) });
}

function listarAccesosDeEvento(req, res) {
  const eventoId = Number(req.params.id);
  res.json({ historial: controlAccesoServicio.obtenerHistorialDeEvento(eventoId) });
}

module.exports = {
  listarClientes,
  crearCliente,
  cambiarEstadoCliente,
  eliminarCliente,
  listarEventos,
  obtenerEvento,
  finalizarEvento,
  listarInvitadosDeEvento,
  listarAccesosDeEvento,
};
