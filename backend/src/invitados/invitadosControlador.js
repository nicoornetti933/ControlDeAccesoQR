const invitadosServicio = require('./invitadosServicio');
const registrarAuditoria = require('../seguridad/registrarAuditoria');

function listarInvitados(req, res) {
  const eventoId = Number(req.params.eventoId);
  const invitados = invitadosServicio.listarInvitadosDeEventoDeUsuario(eventoId, req.usuario.id);
  res.json({ invitados });
}

function crearInvitado(req, res) {
  const eventoId = Number(req.params.eventoId);
  const invitado = invitadosServicio.crearInvitado(eventoId, req.usuario.id, req.body);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'invitado_creado',
    detalle: { invitadoId: invitado.id, eventoId },
    direccionIp: req.ip,
  });
  res.status(201).json({ invitado });
}

function actualizarInvitado(req, res) {
  const invitadoId = Number(req.params.id);
  const invitado = invitadosServicio.actualizarInvitado(invitadoId, req.usuario.id, req.body);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'invitado_actualizado',
    detalle: { invitadoId },
    direccionIp: req.ip,
  });
  res.json({ invitado });
}

function cambiarEstadoInvitado(req, res) {
  const invitadoId = Number(req.params.id);
  const invitado = invitadosServicio.cambiarEstadoInvitado(
    invitadoId,
    req.usuario.id,
    req.body.estado
  );
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'invitado_cambio_estado',
    detalle: { invitadoId, nuevoEstado: req.body.estado },
    direccionIp: req.ip,
  });
  res.json({ invitado });
}

function eliminarInvitado(req, res) {
  const invitadoId = Number(req.params.id);
  invitadosServicio.eliminarInvitado(invitadoId, req.usuario.id);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'invitado_eliminado',
    detalle: { invitadoId },
    direccionIp: req.ip,
  });
  res.status(204).send();
}

module.exports = {
  listarInvitados,
  crearInvitado,
  actualizarInvitado,
  cambiarEstadoInvitado,
  eliminarInvitado,
};
