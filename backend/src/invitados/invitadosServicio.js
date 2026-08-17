/**
 * Servicio de invitados. Garantiza el aislamiento de datos entre
 * clientes: toda operacion sobre un invitado primero verifica que el
 * evento al que pertenece sea del cliente autenticado (salvo para el
 * administrador, que tiene acceso global explicito por otras rutas).
 */

const baseDeDatos = require('../basededatos/conexion');
const { ErrorHttp } = require('../seguridad/manejadorErrores');
const eventosServicio = require('../eventos/eventosServicio');
const categoriasServicio = require('../categorias/categoriasServicio');

// Se trae el nombre y precio de la categoria con un LEFT JOIN (LEFT para
// que los invitados sin categoria asignada igual aparezcan en el
// resultado, con categoria_nombre/categoria_precio en null) en vez de
// hacer una consulta aparte por cada invitado.
const CONSULTA_INVITADO_CON_CATEGORIA = `
  SELECT
    invitados.*,
    categorias_invitado.nombre AS categoria_nombre,
    categorias_invitado.precio AS categoria_precio
  FROM invitados
  LEFT JOIN categorias_invitado ON categorias_invitado.id = invitados.categoria_id
`;

const sentencias = {
  obtenerInvitadoPorId: baseDeDatos.prepare(
    `${CONSULTA_INVITADO_CON_CATEGORIA} WHERE invitados.id = ?`
  ),
  listarInvitadosDeEvento: baseDeDatos.prepare(
    `${CONSULTA_INVITADO_CON_CATEGORIA} WHERE invitados.evento_id = ? ORDER BY invitados.apellido, invitados.nombre`
  ),
  crearInvitado: baseDeDatos.prepare(`
    INSERT INTO invitados (evento_id, categoria_id, nombre, apellido, dni, telefono)
    VALUES (@eventoId, @categoriaId, @nombre, @apellido, @dni, @telefono)
  `),
  actualizarInvitado: baseDeDatos.prepare(`
    UPDATE invitados
    SET nombre = @nombre, apellido = @apellido, dni = @dni, telefono = @telefono,
        categoria_id = @categoriaId,
        actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = @id
  `),
  cambiarEstadoInvitado: baseDeDatos.prepare(`
    UPDATE invitados
    SET estado = @estado, actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = @id
  `),
  eliminarInvitado: baseDeDatos.prepare('DELETE FROM invitados WHERE id = ?'),
  contarPorDniEnEvento: baseDeDatos.prepare(
    'SELECT COUNT(*) AS total FROM invitados WHERE evento_id = ? AND dni = ? AND id != ?'
  ),
};

function obtenerInvitadoPorId(invitadoId) {
  return sentencias.obtenerInvitadoPorId.get(invitadoId);
}

// Verifica que el invitado pertenezca a un evento del usuario indicado.
// Lanza 404 si no existe (para no filtrar si el id existe o no a otros
// clientes) y 403 si existe pero es de otro cliente.
function obtenerInvitadoDeUsuarioOFallar(invitadoId, usuarioId) {
  const invitado = obtenerInvitadoPorId(invitadoId);
  if (!invitado) {
    throw new ErrorHttp(404, 'El invitado no existe.');
  }
  const evento = eventosServicio.obtenerEventoPorId(invitado.evento_id);
  if (!evento || evento.usuario_id !== usuarioId) {
    throw new ErrorHttp(403, 'No tenes permiso para acceder a este invitado.');
  }
  return { invitado, evento };
}

function obtenerEventoDeUsuarioOFallar(eventoId, usuarioId) {
  const evento = eventosServicio.obtenerEventoPorId(eventoId);
  if (!evento) {
    throw new ErrorHttp(404, 'El evento no existe.');
  }
  if (evento.usuario_id !== usuarioId) {
    throw new ErrorHttp(403, 'No tenes permiso para acceder a este evento.');
  }
  return evento;
}

function listarInvitadosDeEventoDeUsuario(eventoId, usuarioId) {
  obtenerEventoDeUsuarioOFallar(eventoId, usuarioId);
  return sentencias.listarInvitadosDeEvento.all(eventoId);
}

function crearInvitado(eventoId, usuarioId, datosInvitado) {
  const evento = obtenerEventoDeUsuarioOFallar(eventoId, usuarioId);
  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'No se pueden agregar invitados a un evento finalizado.');
  }

  // "?? null" porque better-sqlite3 no acepta "undefined" como parametro:
  // si el cliente no mando categoriaId, se guarda como sin categoria.
  const categoriaId = datosInvitado.categoriaId ?? null;
  categoriasServicio.verificarCategoriaPerteneceAEvento(categoriaId, eventoId);

  try {
    const resultado = sentencias.crearInvitado.run({ eventoId, ...datosInvitado, categoriaId });
    return obtenerInvitadoPorId(resultado.lastInsertRowid);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      throw new ErrorHttp(409, 'Ya existe un invitado con ese DNI en este evento.');
    }
    throw error;
  }
}

function actualizarInvitado(invitadoId, usuarioId, datosInvitado) {
  const { invitado, evento } = obtenerInvitadoDeUsuarioOFallar(invitadoId, usuarioId);
  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'No se pueden modificar invitados de un evento finalizado.');
  }

  const datosCompletos = {
    nombre: datosInvitado.nombre ?? invitado.nombre,
    apellido: datosInvitado.apellido ?? invitado.apellido,
    dni: datosInvitado.dni ?? invitado.dni,
    telefono: datosInvitado.telefono ?? invitado.telefono,
    // "categoriaId" en el body puede venir como null (para "quitar" la
    // categoria); solo si no vino la clave (undefined) se conserva la
    // que ya tenia el invitado.
    categoriaId: 'categoriaId' in datosInvitado ? datosInvitado.categoriaId : invitado.categoria_id,
  };
  categoriasServicio.verificarCategoriaPerteneceAEvento(datosCompletos.categoriaId, invitado.evento_id);

  const duplicados = sentencias.contarPorDniEnEvento.get(
    invitado.evento_id,
    datosCompletos.dni,
    invitadoId
  ).total;
  if (duplicados > 0) {
    throw new ErrorHttp(409, 'Ya existe otro invitado con ese DNI en este evento.');
  }

  sentencias.actualizarInvitado.run({ id: invitadoId, ...datosCompletos });
  return obtenerInvitadoPorId(invitadoId);
}

function cambiarEstadoInvitado(invitadoId, usuarioId, estado) {
  const { evento } = obtenerInvitadoDeUsuarioOFallar(invitadoId, usuarioId);
  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'No se puede modificar el estado en un evento finalizado.');
  }
  sentencias.cambiarEstadoInvitado.run({ id: invitadoId, estado });
  return obtenerInvitadoPorId(invitadoId);
}

function eliminarInvitado(invitadoId, usuarioId) {
  const { evento } = obtenerInvitadoDeUsuarioOFallar(invitadoId, usuarioId);
  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'No se pueden eliminar invitados de un evento finalizado.');
  }
  // ON DELETE CASCADE en la base de datos elimina tambien sus codigos QR.
  sentencias.eliminarInvitado.run(invitadoId);
}

// Uso exclusivo del modulo de administracion: el administrador tiene
// acceso global, por lo que esta funcion omite deliberadamente la
// verificacion de propiedad (ya se valida el rol en administracionRutas).
function listarInvitadosDeEventoComoAdmin(eventoId) {
  return sentencias.listarInvitadosDeEvento.all(eventoId);
}

module.exports = {
  obtenerInvitadoPorId,
  obtenerInvitadoDeUsuarioOFallar,
  obtenerEventoDeUsuarioOFallar,
  listarInvitadosDeEventoDeUsuario,
  listarInvitadosDeEventoComoAdmin,
  crearInvitado,
  actualizarInvitado,
  cambiarEstadoInvitado,
  eliminarInvitado,
};
