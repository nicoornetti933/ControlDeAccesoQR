/**
 * Servicio de categorias de invitado. Cada categoria pertenece a un
 * evento (ej: "General", "VIP", "Palco") y tiene un precio de
 * referencia, usado tanto para mostrarlo en el QR/listado como para
 * estimar la recaudacion del evento (ver registrosServicio).
 *
 * Igual que en invitadosServicio, toda operacion verifica primero que
 * el evento pertenezca al cliente autenticado, para que un cliente
 * nunca pueda leer ni modificar categorias de otro.
 */

const baseDeDatos = require('../basededatos/conexion');
const { ErrorHttp } = require('../seguridad/manejadorErrores');
const eventosServicio = require('../eventos/eventosServicio');

const sentencias = {
  obtenerCategoriaPorId: baseDeDatos.prepare('SELECT * FROM categorias_invitado WHERE id = ?'),
  listarCategoriasDeEvento: baseDeDatos.prepare(
    'SELECT * FROM categorias_invitado WHERE evento_id = ? ORDER BY nombre'
  ),
  crearCategoria: baseDeDatos.prepare(`
    INSERT INTO categorias_invitado (evento_id, nombre, precio)
    VALUES (@eventoId, @nombre, @precio)
  `),
  actualizarCategoria: baseDeDatos.prepare(`
    UPDATE categorias_invitado
    SET nombre = @nombre, precio = @precio,
        actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = @id
  `),
  eliminarCategoria: baseDeDatos.prepare('DELETE FROM categorias_invitado WHERE id = ?'),
  contarInvitadosConCategoria: baseDeDatos.prepare(
    'SELECT COUNT(*) AS total FROM invitados WHERE categoria_id = ?'
  ),
};

function obtenerCategoriaPorId(categoriaId) {
  return sentencias.obtenerCategoriaPorId.get(categoriaId);
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

// Verifica que la categoria exista y pertenezca a un evento del usuario
// indicado. Se usa antes de actualizar/eliminar una categoria, y tambien
// desde invitadosServicio para validar la categoria elegida al cargar o
// editar un invitado.
function obtenerCategoriaDeUsuarioOFallar(categoriaId, usuarioId) {
  const categoria = obtenerCategoriaPorId(categoriaId);
  if (!categoria) {
    throw new ErrorHttp(404, 'La categoria no existe.');
  }
  const evento = obtenerEventoDeUsuarioOFallar(categoria.evento_id, usuarioId);
  return { categoria, evento };
}

function listarCategoriasDeEventoDeUsuario(eventoId, usuarioId) {
  obtenerEventoDeUsuarioOFallar(eventoId, usuarioId);
  return sentencias.listarCategoriasDeEvento.all(eventoId);
}

function crearCategoria(eventoId, usuarioId, datosCategoria) {
  const evento = obtenerEventoDeUsuarioOFallar(eventoId, usuarioId);
  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'No se pueden agregar categorias a un evento finalizado.');
  }

  try {
    const resultado = sentencias.crearCategoria.run({ eventoId, ...datosCategoria });
    return obtenerCategoriaPorId(resultado.lastInsertRowid);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      throw new ErrorHttp(409, 'Ya existe una categoria con ese nombre en este evento.');
    }
    throw error;
  }
}

function actualizarCategoria(categoriaId, usuarioId, datosCategoria) {
  const { categoria, evento } = obtenerCategoriaDeUsuarioOFallar(categoriaId, usuarioId);
  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'No se pueden modificar categorias de un evento finalizado.');
  }

  const datosCompletos = {
    nombre: datosCategoria.nombre ?? categoria.nombre,
    precio: datosCategoria.precio ?? categoria.precio,
  };

  try {
    sentencias.actualizarCategoria.run({ id: categoriaId, ...datosCompletos });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      throw new ErrorHttp(409, 'Ya existe otra categoria con ese nombre en este evento.');
    }
    throw error;
  }
  return obtenerCategoriaPorId(categoriaId);
}

function eliminarCategoria(categoriaId, usuarioId) {
  const { evento } = obtenerCategoriaDeUsuarioOFallar(categoriaId, usuarioId);
  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'No se pueden eliminar categorias de un evento finalizado.');
  }
  // No se bloquea el borrado si hay invitados usando la categoria: el
  // ON DELETE SET NULL de la base de datos los deja sin categoria
  // automaticamente (quedan como invitados "sin categoria").
  sentencias.eliminarCategoria.run(categoriaId);
}

// Uso exclusivo de invitadosServicio: valida que una categoria elegida al
// crear/editar un invitado exista y pertenezca al mismo evento que el
// invitado (no al mismo cliente en general, sino al evento puntual).
function verificarCategoriaPerteneceAEvento(categoriaId, eventoId) {
  if (categoriaId === null || categoriaId === undefined) {
    return; // "sin categoria" siempre es valido
  }
  const categoria = obtenerCategoriaPorId(categoriaId);
  if (!categoria || categoria.evento_id !== eventoId) {
    throw new ErrorHttp(400, 'La categoria elegida no pertenece a este evento.');
  }
}

module.exports = {
  obtenerCategoriaPorId,
  obtenerCategoriaDeUsuarioOFallar,
  listarCategoriasDeEventoDeUsuario,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  verificarCategoriaPerteneceAEvento,
};
