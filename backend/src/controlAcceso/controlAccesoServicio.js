/**
 * Servicio de control de acceso: es el corazon operativo del sistema el
 * dia del evento. Implementa, en orden, las 6 validaciones obligatorias
 * de la especificacion antes de autorizar un ingreso.
 *
 * Toda la validacion ocurre del lado del servidor. El cliente (navegador
 * del celular que escanea) solo envia el texto leido de la camara; nunca
 * se confia en ningun dato adicional que pudiera venir del dispositivo.
 *
 * La operacion completa (validar + marcar el QR como usado + marcar al
 * invitado como ingresado + dejar constancia en el historial) se ejecuta
 * dentro de una unica transaccion sincronica de better-sqlite3. Como
 * Node.js es de un solo hilo y better-sqlite3 es sincronico, esto impide
 * que dos escaneos simultaneos del mismo QR puedan "pasar" ambos: el
 * segundo siempre vera el estado ya actualizado por el primero.
 */

const baseDeDatos = require('../basededatos/conexion');
const { ErrorHttp } = require('../seguridad/manejadorErrores');
const eventosServicio = require('../eventos/eventosServicio');

const MOTIVOS = {
  QR_INEXISTENTE: 'codigo_qr_inexistente',
  QR_INVALIDADO: 'codigo_qr_invalidado',
  QR_USADO: 'codigo_qr_ya_utilizado',
  EVENTO_NO_CORRESPONDE: 'codigo_qr_no_corresponde_al_evento_actual',
  INVITADO_DESHABILITADO: 'invitado_deshabilitado_o_cancelado',
  AUTORIZADO: 'acceso_autorizado',
};

const sentencias = {
  obtenerQrPorIdentificador: baseDeDatos.prepare(
    'SELECT * FROM codigos_qr WHERE identificador_unico = ?'
  ),
  obtenerInvitadoPorId: baseDeDatos.prepare('SELECT * FROM invitados WHERE id = ?'),
  marcarQrComoUsado: baseDeDatos.prepare(`
    UPDATE codigos_qr SET estado = 'usado', usado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ?
  `),
  marcarInvitadoComoIngresado: baseDeDatos.prepare(
    "UPDATE invitados SET estado = 'ingresado', actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
  ),
  insertarRegistroAcceso: baseDeDatos.prepare(`
    INSERT INTO registros_acceso (evento_id, invitado_id, codigo_qr_id, resultado, motivo, escaneado_por)
    VALUES (@eventoId, @invitadoId, @codigoQrId, @resultado, @motivo, @escaneadoPor)
  `),
  listarHistorialDeEvento: baseDeDatos.prepare(`
    SELECT registros_acceso.*, invitados.nombre, invitados.apellido, invitados.dni
    FROM registros_acceso
    LEFT JOIN invitados ON invitados.id = registros_acceso.invitado_id
    WHERE registros_acceso.evento_id = ?
    ORDER BY registros_acceso.fecha_hora DESC
    LIMIT 500
  `),
};

function resolverEventoActual(contexto) {
  if (contexto.rol === 'administrador') {
    if (!contexto.eventoId) {
      throw new ErrorHttp(400, 'El administrador debe indicar sobre que evento se realiza el escaneo.');
    }
    const evento = eventosServicio.obtenerEventoPorId(contexto.eventoId);
    if (!evento) {
      throw new ErrorHttp(404, 'El evento indicado no existe.');
    }
    return evento;
  }

  const evento = eventosServicio.obtenerEventoActivoDeUsuario(contexto.usuarioId);
  if (!evento) {
    throw new ErrorHttp(409, 'No tenes un evento activo en este momento.');
  }
  return evento;
}

function registrarRechazo({ eventoId, invitadoId, codigoQrId, motivo, escaneadoPor }) {
  sentencias.insertarRegistroAcceso.run({
    eventoId,
    invitadoId: invitadoId ?? null,
    codigoQrId: codigoQrId ?? null,
    resultado: 'rechazado',
    motivo,
    escaneadoPor,
  });
  return { autorizado: false, motivo };
}

function procesarEscaneo(identificadorQr, contexto) {
  const eventoActual = resolverEventoActual(contexto);

  if (eventoActual.estado !== 'activo') {
    throw new ErrorHttp(409, 'El evento no esta activo.');
  }

  const ejecutarEnTransaccion = baseDeDatos.transaction(() => {
    // 1) Que el codigo exista.
    const qr = sentencias.obtenerQrPorIdentificador.get(identificadorQr);
    if (!qr) {
      // No hay evento_id confiable para un codigo que no existe: no se
      // puede insertar en registros_acceso (requiere evento_id valido
      // por FK), asi que este intento queda fuera del historial del
      // evento pero deberia auditarse por separado si se desea.
      return { autorizado: false, motivo: MOTIVOS.QR_INEXISTENTE, sinRegistro: true };
    }

    // 3) Que corresponda al evento actual (se valida antes que "usado"
    // para no revelar informacion sobre QRs de otros eventos).
    if (qr.evento_id !== eventoActual.id) {
      return registrarRechazo({
        eventoId: eventoActual.id,
        invitadoId: qr.invitado_id,
        codigoQrId: qr.id,
        motivo: MOTIVOS.EVENTO_NO_CORRESPONDE,
        escaneadoPor: contexto.usuarioId,
      });
    }

    // 2) Que sea valido (no haya sido invalidado por una regeneracion).
    if (qr.estado === 'invalidado') {
      return registrarRechazo({
        eventoId: eventoActual.id,
        invitadoId: qr.invitado_id,
        codigoQrId: qr.id,
        motivo: MOTIVOS.QR_INVALIDADO,
        escaneadoPor: contexto.usuarioId,
      });
    }

    // 6) Que el QR no haya sido utilizado anteriormente.
    if (qr.estado === 'usado') {
      return registrarRechazo({
        eventoId: eventoActual.id,
        invitadoId: qr.invitado_id,
        codigoQrId: qr.id,
        motivo: MOTIVOS.QR_USADO,
        escaneadoPor: contexto.usuarioId,
      });
    }

    // 4) Que corresponda al invitado asociado.
    const invitado = sentencias.obtenerInvitadoPorId.get(qr.invitado_id);
    if (!invitado) {
      return registrarRechazo({
        eventoId: eventoActual.id,
        invitadoId: null,
        codigoQrId: qr.id,
        motivo: MOTIVOS.QR_INEXISTENTE,
        escaneadoPor: contexto.usuarioId,
      });
    }

    // 5) Que el invitado este habilitado.
    if (invitado.estado === 'deshabilitado' || invitado.estado === 'cancelado') {
      return registrarRechazo({
        eventoId: eventoActual.id,
        invitadoId: invitado.id,
        codigoQrId: qr.id,
        motivo: MOTIVOS.INVITADO_DESHABILITADO,
        escaneadoPor: contexto.usuarioId,
      });
    }

    // Todas las validaciones pasaron: ACCESO AUTORIZADO.
    sentencias.marcarQrComoUsado.run(qr.id);
    sentencias.marcarInvitadoComoIngresado.run(invitado.id);
    sentencias.insertarRegistroAcceso.run({
      eventoId: eventoActual.id,
      invitadoId: invitado.id,
      codigoQrId: qr.id,
      resultado: 'autorizado',
      motivo: MOTIVOS.AUTORIZADO,
      escaneadoPor: contexto.usuarioId,
    });

    return {
      autorizado: true,
      motivo: MOTIVOS.AUTORIZADO,
      invitado: {
        id: invitado.id,
        nombre: invitado.nombre,
        apellido: invitado.apellido,
      },
      fechaHora: new Date().toISOString(),
    };
  });

  return ejecutarEnTransaccion();
}

function obtenerHistorialDeEvento(eventoId) {
  return sentencias.listarHistorialDeEvento.all(eventoId);
}

module.exports = { procesarEscaneo, obtenerHistorialDeEvento, resolverEventoActual, MOTIVOS };
