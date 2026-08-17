const controlAccesoServicio = require('./controlAccesoServicio');
const eventosServicio = require('../eventos/eventosServicio');
const registrarAuditoria = require('../seguridad/registrarAuditoria');
const { ErrorHttp } = require('../seguridad/manejadorErrores');

function escanear(req, res) {
  const { identificadorQr, eventoId } = req.body;

  const resultado = controlAccesoServicio.procesarEscaneo(identificadorQr, {
    rol: req.usuario.rol,
    usuarioId: req.usuario.id,
    eventoId,
  });

  if (resultado.sinRegistro) {
    // Codigo que no existe en el sistema: se audita igual, sin asociarlo
    // a un evento particular (podria ser un intento sobre cualquier evento).
    registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'escaneo_qr_inexistente',
      direccionIp: req.ip,
    });
  }

  res.json({
    autorizado: resultado.autorizado,
    motivo: resultado.motivo,
    invitado: resultado.invitado || null,
    fechaHora: resultado.fechaHora || null,
  });
}

function obtenerHistorial(req, res, next) {
  let eventoId;

  if (req.usuario.rol === 'administrador') {
    eventoId = Number(req.query.eventoId);
    if (!eventoId) {
      return next(new ErrorHttp(400, 'Indica el evento (eventoId) para consultar su historial.'));
    }
  } else {
    const eventoActivo = eventosServicio.obtenerEventoActivoDeUsuario(req.usuario.id);
    if (!eventoActivo) {
      return res.json({ historial: [] });
    }
    eventoId = eventoActivo.id;
  }

  res.json({ historial: controlAccesoServicio.obtenerHistorialDeEvento(eventoId) });
}

module.exports = { escanear, obtenerHistorial };
