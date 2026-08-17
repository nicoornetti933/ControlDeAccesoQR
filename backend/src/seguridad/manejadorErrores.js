/**
 * Manejo centralizado de errores.
 *
 * Usar la clase ErrorHttp en cualquier modulo para lanzar errores con un
 * codigo de estado HTTP y un mensaje seguro para mostrar al usuario final.
 * El middleware "manejadorErrores" es el ultimo eslabon de la cadena de
 * Express y evita que detalles internos (rutas de archivos, mensajes de
 * SQLite, stack traces) se filtren al cliente.
 */

class ErrorHttp extends Error {
  constructor(codigoEstado, mensaje, detalles) {
    super(mensaje);
    this.codigoEstado = codigoEstado;
    this.detalles = detalles;
  }
}

function noEncontrado(req, res, next) {
  next(new ErrorHttp(404, 'El recurso solicitado no existe.'));
}

// Firma de 4 parametros: Express la reconoce como middleware de errores.
// eslint-disable-next-line no-unused-vars
function manejadorErrores(error, req, res, next) {
  const codigoEstado = error instanceof ErrorHttp ? error.codigoEstado : 500;
  const mensaje =
    error instanceof ErrorHttp ? error.message : 'Ocurrio un error interno del servidor.';

  // Los errores no controlados (500) se registran en el servidor con su
  // detalle completo, pero NUNCA se exponen tal cual al cliente.
  if (codigoEstado >= 500) {
    console.error('[error-interno]', error);
  }

  res.status(codigoEstado).json({
    error: mensaje,
    detalles: error instanceof ErrorHttp ? error.detalles : undefined,
  });
}

module.exports = { ErrorHttp, noEncontrado, manejadorErrores };
