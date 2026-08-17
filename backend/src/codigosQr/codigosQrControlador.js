const codigosQrServicio = require('./codigosQrServicio');
const registrarAuditoria = require('../seguridad/registrarAuditoria');

async function generarQr(req, res) {
  const invitadoId = Number(req.params.id);
  const qr = codigosQrServicio.generarQrParaInvitado(invitadoId, req.usuario.id);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'qr_generado',
    detalle: { invitadoId, codigoQrId: qr.id },
    direccionIp: req.ip,
  });
  res.status(201).json({ qr: aDatosPublicos(qr) });
}

async function regenerarQr(req, res) {
  const invitadoId = Number(req.params.id);
  const qr = codigosQrServicio.regenerarQrParaInvitado(invitadoId, req.usuario.id);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'qr_regenerado',
    detalle: { invitadoId, nuevoCodigoQrId: qr.id },
    direccionIp: req.ip,
  });
  res.status(201).json({ qr: aDatosPublicos(qr) });
}

function obtenerQrActivo(req, res) {
  const invitadoId = Number(req.params.id);
  const qr = codigosQrServicio.obtenerQrActivoDeInvitado(invitadoId, req.usuario.id);
  res.json({ qr: aDatosPublicos(qr) });
}

async function obtenerImagenQr(req, res) {
  const invitadoId = Number(req.params.id);
  const qr = codigosQrServicio.obtenerQrActivoDeInvitado(invitadoId, req.usuario.id);
  const imagenBase64 = await codigosQrServicio.generarImagenPngBase64(qr.identificador_unico);
  res.json({ imagen: imagenBase64 });
}

function listarHistorial(req, res) {
  const invitadoId = Number(req.params.id);
  const historial = codigosQrServicio.listarHistorialDeInvitado(invitadoId, req.usuario.id);
  res.json({ historial: historial.map(aDatosPublicos) });
}

// Nunca se expone el identificador completo salvo en la respuesta de
// creacion/consulta del propio QR activo, que es lo que el organizador
// necesita para mostrar o imprimir. El historial oculta el valor de los
// codigos ya invalidados/usados para reducir superficie de exposicion.
function aDatosPublicos(qr) {
  return {
    id: qr.id,
    identificadorUnico: qr.identificador_unico,
    estado: qr.estado,
    creadoEn: qr.creado_en,
    usadoEn: qr.usado_en,
    invalidadoEn: qr.invalidado_en,
  };
}

module.exports = { generarQr, regenerarQr, obtenerQrActivo, obtenerImagenQr, listarHistorial };
