/**
 * Servicio de codigos QR.
 *
 * Este es el modulo mas sensible del sistema en terminos de integridad
 * de datos: de aca depende que "no exista ninguna circunstancia normal
 * en la que dos invitados puedan tener el mismo QR".
 *
 * Estrategia de unicidad (defensa en profundidad):
 *  1. El identificador se genera con crypto.randomBytes (aleatoriedad
 *     criptografica), no con datos predecibles (ni incrementales, ni
 *     derivados del invitado). 256 bits de entropia hacen que una
 *     colision sea, en la practica, imposible.
 *  2. La columna "identificador_unico" tiene una restriccion UNIQUE en
 *     la base de datos (ver esquema.sql): si por cualquier motivo se
 *     generara un identificador repetido, la insercion fallaria y el
 *     codigo reintenta con uno nuevo.
 *  3. Un indice unico parcial impide que un mismo invitado tenga dos
 *     codigos QR con estado 'activo' al mismo tiempo.
 *  4. Regenerar un QR invalida el anterior dentro de la MISMA
 *     transaccion en la que se crea el nuevo, evitando ventanas donde
 *     ambos esten activos.
 */

const crypto = require('crypto');
const QRCode = require('qrcode');
const baseDeDatos = require('../basededatos/conexion');
const { ErrorHttp } = require('../seguridad/manejadorErrores');
const invitadosServicio = require('../invitados/invitadosServicio');

const CANTIDAD_BYTES_IDENTIFICADOR = 32; // 256 bits de entropia
const MAXIMO_REINTENTOS_POR_COLISION = 5;

const sentencias = {
  obtenerQrActivoDeInvitado: baseDeDatos.prepare(
    "SELECT * FROM codigos_qr WHERE invitado_id = ? AND estado = 'activo'"
  ),
  obtenerQrPorId: baseDeDatos.prepare('SELECT * FROM codigos_qr WHERE id = ?'),
  obtenerQrPorIdentificador: baseDeDatos.prepare(
    'SELECT * FROM codigos_qr WHERE identificador_unico = ?'
  ),
  invalidarQr: baseDeDatos.prepare(`
    UPDATE codigos_qr
    SET estado = 'invalidado', invalidado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ?
  `),
  crearQr: baseDeDatos.prepare(`
    INSERT INTO codigos_qr (identificador_unico, invitado_id, evento_id, estado)
    VALUES (@identificadorUnico, @invitadoId, @eventoId, 'activo')
  `),
  listarHistorialDeInvitado: baseDeDatos.prepare(
    'SELECT * FROM codigos_qr WHERE invitado_id = ? ORDER BY creado_en DESC'
  ),
};

function generarIdentificadorSeguro() {
  // base64url: apto para viajar en URLs/QR sin caracteres problematicos.
  return crypto.randomBytes(CANTIDAD_BYTES_IDENTIFICADOR).toString('base64url');
}

// Inserta un nuevo QR activo para un invitado, reintentando si (en un
// caso astronomicamente improbable) el identificador aleatorio ya
// existiera en la tabla.
function insertarNuevoQrConReintentos(invitadoId, eventoId) {
  for (let intento = 0; intento < MAXIMO_REINTENTOS_POR_COLISION; intento += 1) {
    const identificadorUnico = generarIdentificadorSeguro();
    try {
      const resultado = sentencias.crearQr.run({ identificadorUnico, invitadoId, eventoId });
      return sentencias.obtenerQrPorId.get(resultado.lastInsertRowid);
    } catch (error) {
      const esColisionDeIdentificador =
        String(error.message).includes('UNIQUE') && String(error.message).includes('identificador');
      if (!esColisionDeIdentificador) {
        throw error;
      }
      // Colision extremadamente improbable: se reintenta con un nuevo identificador.
    }
  }
  throw new ErrorHttp(500, 'No se pudo generar un identificador de QR unico. Intenta nuevamente.');
}

function generarQrParaInvitado(invitadoId, usuarioId) {
  const { invitado, evento } = invitadosServicio.obtenerInvitadoDeUsuarioOFallar(
    invitadoId,
    usuarioId
  );

  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'No se pueden generar codigos QR en un evento finalizado.');
  }
  if (invitado.estado === 'deshabilitado' || invitado.estado === 'cancelado') {
    throw new ErrorHttp(409, 'No se puede generar un QR para un invitado deshabilitado o cancelado.');
  }

  const qrActivoExistente = sentencias.obtenerQrActivoDeInvitado.get(invitadoId);
  if (qrActivoExistente) {
    throw new ErrorHttp(
      409,
      'Este invitado ya tiene un codigo QR activo. Usa "regenerar" si necesitas invalidarlo y crear uno nuevo.'
    );
  }

  // La creacion se protege ademas con el indice unico parcial de la
  // base de datos (un invitado no puede tener dos QR "activo" a la vez).
  const transaccion = baseDeDatos.transaction(() => {
    return insertarNuevoQrConReintentos(invitadoId, invitado.evento_id);
  });

  return transaccion();
}

function regenerarQrParaInvitado(invitadoId, usuarioId) {
  const { invitado, evento } = invitadosServicio.obtenerInvitadoDeUsuarioOFallar(
    invitadoId,
    usuarioId
  );

  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'No se pueden regenerar codigos QR en un evento finalizado.');
  }
  if (invitado.estado === 'deshabilitado' || invitado.estado === 'cancelado') {
    throw new ErrorHttp(409, 'No se puede regenerar el QR de un invitado deshabilitado o cancelado.');
  }

  // Invalidar el QR anterior (si existe) y crear el nuevo dentro de la
  // MISMA transaccion: o se hacen ambas cosas, o no se hace ninguna.
  const transaccion = baseDeDatos.transaction(() => {
    const qrActivoExistente = sentencias.obtenerQrActivoDeInvitado.get(invitadoId);
    if (qrActivoExistente) {
      sentencias.invalidarQr.run(qrActivoExistente.id);
    }
    return insertarNuevoQrConReintentos(invitadoId, invitado.evento_id);
  });

  return transaccion();
}

function obtenerQrActivoDeInvitado(invitadoId, usuarioId) {
  invitadosServicio.obtenerInvitadoDeUsuarioOFallar(invitadoId, usuarioId);
  const qr = sentencias.obtenerQrActivoDeInvitado.get(invitadoId);
  if (!qr) {
    throw new ErrorHttp(404, 'Este invitado todavia no tiene un codigo QR generado.');
  }
  return qr;
}

function listarHistorialDeInvitado(invitadoId, usuarioId) {
  invitadosServicio.obtenerInvitadoDeUsuarioOFallar(invitadoId, usuarioId);
  return sentencias.listarHistorialDeInvitado.all(invitadoId);
}

async function generarImagenPngBase64(identificadorUnico) {
  // El QR codifica UNICAMENTE el identificador opaco, nunca datos
  // personales del invitado (nombre, DNI, telefono, etc.).
  return QRCode.toDataURL(identificadorUnico, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
}

module.exports = {
  generarQrParaInvitado,
  regenerarQrParaInvitado,
  obtenerQrActivoDeInvitado,
  listarHistorialDeInvitado,
  generarImagenPngBase64,
};
