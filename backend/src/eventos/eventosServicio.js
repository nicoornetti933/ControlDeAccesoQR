/**
 * Servicio (logica de negocio + acceso a datos) del modulo de eventos.
 *
 * Regla de negocio clave: un cliente solo puede tener UN evento activo
 * a la vez. La regla se valida aca en el servicio Y ademas esta protegida
 * por un indice unico parcial en la base de datos (ver esquema.sql), de
 * forma que ninguna condicion de carrera pueda violarla.
 */

const baseDeDatos = require('../basededatos/conexion');
const { ErrorHttp } = require('../seguridad/manejadorErrores');

const sentencias = {
  obtenerEventoActivoDeUsuario: baseDeDatos.prepare(
    "SELECT * FROM eventos WHERE usuario_id = ? AND estado = 'activo'"
  ),
  obtenerEventoPorId: baseDeDatos.prepare('SELECT * FROM eventos WHERE id = ?'),
  listarEventosDeUsuario: baseDeDatos.prepare(
    'SELECT * FROM eventos WHERE usuario_id = ? ORDER BY creado_en DESC'
  ),
  listarTodosLosEventos: baseDeDatos.prepare(`
    SELECT eventos.*, usuarios.nombre_organizacion, usuarios.nombre_completo AS nombre_cliente, usuarios.email AS email_cliente
    FROM eventos
    JOIN usuarios ON usuarios.id = eventos.usuario_id
    ORDER BY eventos.creado_en DESC
  `),
  crearEvento: baseDeDatos.prepare(`
    INSERT INTO eventos (usuario_id, nombre, fecha, hora, lugar, estado)
    VALUES (@usuarioId, @nombre, @fecha, @hora, @lugar, 'activo')
  `),
  actualizarEvento: baseDeDatos.prepare(`
    UPDATE eventos
    SET nombre = @nombre, fecha = @fecha, hora = @hora, lugar = @lugar,
        actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = @id
  `),
  finalizarEvento: baseDeDatos.prepare(`
    UPDATE eventos
    SET estado = 'finalizado',
        finalizado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
        finalizado_por = @finalizadoPor
    WHERE id = @id
  `),
};

function obtenerEventoActivoDeUsuario(usuarioId) {
  return sentencias.obtenerEventoActivoDeUsuario.get(usuarioId);
}

function obtenerEventoPorId(eventoId) {
  return sentencias.obtenerEventoPorId.get(eventoId);
}

function listarEventosDeUsuario(usuarioId) {
  return sentencias.listarEventosDeUsuario.all(usuarioId);
}

function listarTodosLosEventos() {
  return sentencias.listarTodosLosEventos.all();
}

function crearEventoParaUsuario(usuarioId, datosEvento) {
  const eventoActivoExistente = obtenerEventoActivoDeUsuario(usuarioId);
  if (eventoActivoExistente) {
    throw new ErrorHttp(
      409,
      'Ya existe un evento activo para esta cuenta. Finaliza el evento actual antes de crear uno nuevo.'
    );
  }

  const resultado = sentencias.crearEvento.run({ usuarioId, ...datosEvento });
  return obtenerEventoPorId(resultado.lastInsertRowid);
}

function actualizarEventoDeUsuario(usuarioId, eventoId, datosEvento) {
  const evento = obtenerEventoPorId(eventoId);
  verificarPropiedadOAdmin(evento, usuarioId);

  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'No se puede modificar un evento ya finalizado.');
  }

  // "esquemaActualizarEvento" (ver eventosEsquemas.js) es parcial a
  // proposito: permite mandar solo el/los campos que cambian. Por eso
  // hay que completar los que no vinieron con el valor que el evento ya
  // tenia antes de ejecutar el UPDATE, igual que hacen
  // invitadosServicio.actualizarInvitado y categoriasServicio
  // .actualizarCategoria. Sin este merge, la sentencia SQL preparada
  // (que siempre setea las 4 columnas) fallaba con
  // "RangeError: Missing named parameter" apenas se mandaba un update
  // parcial, por ejemplo cambiar unicamente la fecha.
  const datosCompletos = {
    nombre: datosEvento.nombre ?? evento.nombre,
    fecha: datosEvento.fecha ?? evento.fecha,
    hora: datosEvento.hora ?? evento.hora,
    lugar: datosEvento.lugar ?? evento.lugar,
  };

  sentencias.actualizarEvento.run({ id: eventoId, ...datosCompletos });
  return obtenerEventoPorId(eventoId);
}

function finalizarEventoComoAdmin(eventoId, administradorId) {
  const evento = obtenerEventoPorId(eventoId);
  if (!evento) {
    throw new ErrorHttp(404, 'El evento no existe.');
  }
  if (evento.estado === 'finalizado') {
    throw new ErrorHttp(409, 'El evento ya estaba finalizado.');
  }

  sentencias.finalizarEvento.run({ id: eventoId, finalizadoPor: administradorId });
  return obtenerEventoPorId(eventoId);
}

// Un cliente solo puede operar sobre su propio evento. Se usa tanto para
// lecturas como para escrituras; el modulo de administracion no usa esta
// funcion porque el administrador tiene acceso global explicito.
function verificarPropiedadOAdmin(evento, usuarioId) {
  if (!evento) {
    throw new ErrorHttp(404, 'El evento no existe.');
  }
  if (evento.usuario_id !== usuarioId) {
    throw new ErrorHttp(403, 'No tenes permiso para acceder a este evento.');
  }
}

module.exports = {
  obtenerEventoActivoDeUsuario,
  obtenerEventoPorId,
  listarEventosDeUsuario,
  listarTodosLosEventos,
  crearEventoParaUsuario,
  actualizarEventoDeUsuario,
  finalizarEventoComoAdmin,
  verificarPropiedadOAdmin,
};
