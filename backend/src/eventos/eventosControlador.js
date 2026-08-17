const eventosServicio = require('./eventosServicio');
const registrosServicio = require('../registros/registrosServicio');
const { ErrorHttp } = require('../seguridad/manejadorErrores');
const registrarAuditoria = require('../seguridad/registrarAuditoria');

function obtenerEventoActual(req, res) {
  const evento = eventosServicio.obtenerEventoActivoDeUsuario(req.usuario.id);
  res.json({ evento: evento || null });
}

function listarMisEventos(req, res) {
  res.json({ eventos: eventosServicio.listarEventosDeUsuario(req.usuario.id) });
}

function crearEvento(req, res) {
  const evento = eventosServicio.crearEventoParaUsuario(req.usuario.id, req.body);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'evento_creado',
    detalle: { eventoId: evento.id, nombre: evento.nombre },
    direccionIp: req.ip,
  });
  res.status(201).json({ evento });
}

function actualizarEvento(req, res) {
  const eventoId = Number(req.params.id);
  const evento = eventosServicio.actualizarEventoDeUsuario(req.usuario.id, eventoId, req.body);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'evento_actualizado',
    detalle: { eventoId },
    direccionIp: req.ip,
  });
  res.json({ evento });
}

function obtenerEstadisticasEvento(req, res, next) {
  const eventoId = Number(req.params.id);
  const evento = eventosServicio.obtenerEventoPorId(eventoId);

  if (!evento) {
    return next(new ErrorHttp(404, 'El evento no existe.'));
  }
  if (req.usuario.rol === 'cliente' && evento.usuario_id !== req.usuario.id) {
    return next(new ErrorHttp(403, 'No tenes permiso para acceder a este evento.'));
  }

  res.json({ estadisticas: registrosServicio.obtenerEstadisticasEvento(eventoId) });
}

module.exports = {
  obtenerEventoActual,
  listarMisEventos,
  crearEvento,
  actualizarEvento,
  obtenerEstadisticasEvento,
};
