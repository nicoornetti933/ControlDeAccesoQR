/**
 * Servicio de registros/historial: estadisticas agregadas del evento
 * (para el dashboard del organizador) y consulta de la bitacora de
 * auditoria del sistema (para el administrador).
 */

const baseDeDatos = require('../basededatos/conexion');

const sentencias = {
  estadisticasEvento: baseDeDatos.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN estado = 'ingresado' THEN 1 ELSE 0 END) AS ingresados,
      SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
      SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados,
      SUM(CASE WHEN estado = 'deshabilitado' THEN 1 ELSE 0 END) AS deshabilitados
    FROM invitados
    WHERE evento_id = ?
  `),
  // Recaudacion: suma el precio de la categoria de cada invitado
  // cargado en el sistema, sin importar si ya ingreso al evento o
  // todavia esta pendiente. Un invitado cargado ya se considera pagado
  // (el pago se hace al reservar/anotar el lugar, no al cruzar la
  // puerta), por eso no se distingue "confirmado" de "proyectado": hay
  // una unica recaudacion. Los invitados sin categoria asignada no suman
  // (precio 0, por el LEFT JOIN).
  recaudacionPorCategoria: baseDeDatos.prepare(`
    SELECT
      categorias_invitado.id AS categoria_id,
      categorias_invitado.nombre AS categoria_nombre,
      categorias_invitado.precio AS precio,
      COUNT(invitados.id) AS cantidad_invitados,
      SUM(CASE WHEN invitados.estado = 'ingresado' THEN 1 ELSE 0 END) AS cantidad_ingresados
    FROM categorias_invitado
    LEFT JOIN invitados ON invitados.categoria_id = categorias_invitado.id
    WHERE categorias_invitado.evento_id = ?
    GROUP BY categorias_invitado.id
    ORDER BY categorias_invitado.nombre
  `),
  listarAuditoria: baseDeDatos.prepare(`
    SELECT registros_auditoria.*, usuarios.email AS usuario_email, usuarios.rol AS usuario_rol
    FROM registros_auditoria
    LEFT JOIN usuarios ON usuarios.id = registros_auditoria.usuario_id
    ORDER BY registros_auditoria.creado_en DESC
    LIMIT 500
  `),
};

function obtenerEstadisticasEvento(eventoId) {
  const fila = sentencias.estadisticasEvento.get(eventoId);
  const filasCategorias = sentencias.recaudacionPorCategoria.all(eventoId);

  const porCategoria = filasCategorias.map((filaCategoria) => ({
    categoriaId: filaCategoria.categoria_id,
    nombre: filaCategoria.categoria_nombre,
    precio: filaCategoria.precio,
    cantidadInvitados: filaCategoria.cantidad_invitados || 0,
    cantidadIngresados: filaCategoria.cantidad_ingresados || 0,
    recaudado: filaCategoria.precio * (filaCategoria.cantidad_invitados || 0),
  }));

  const recaudacionTotal = porCategoria.reduce((total, c) => total + c.recaudado, 0);

  return {
    totalInvitados: fila.total || 0,
    ingresados: fila.ingresados || 0,
    pendientes: fila.pendientes || 0,
    cancelados: fila.cancelados || 0,
    deshabilitados: fila.deshabilitados || 0,
    recaudacion: {
      total: recaudacionTotal,
      porCategoria,
    },
  };
}

function listarAuditoria() {
  return sentencias.listarAuditoria.all();
}

module.exports = { obtenerEstadisticasEvento, listarAuditoria };
