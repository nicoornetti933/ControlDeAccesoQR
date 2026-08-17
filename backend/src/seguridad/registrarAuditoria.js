/**
 * Utilidad para dejar constancia de operaciones importantes en la tabla
 * "registros_auditoria" (creacion/activacion de clientes, generacion y
 * regeneracion de QR, finalizacion de eventos, inicios de sesion, etc.).
 *
 * No debe usarse para el registro de accesos de invitados: eso vive en
 * el modulo de control de acceso (tabla "registros_acceso"), que tiene
 * un proposito distinto (estadisticas del evento, no seguridad del
 * sistema).
 */

const baseDeDatos = require('../basededatos/conexion');

const sentenciaInsercion = baseDeDatos.prepare(
  `INSERT INTO registros_auditoria (usuario_id, accion, detalle, direccion_ip)
   VALUES (@usuarioId, @accion, @detalle, @direccionIp)`
);

function registrarAuditoria({ usuarioId = null, accion, detalle = null, direccionIp = null }) {
  sentenciaInsercion.run({
    usuarioId,
    accion,
    detalle: detalle ? JSON.stringify(detalle) : null,
    direccionIp,
  });
}

module.exports = registrarAuditoria;
