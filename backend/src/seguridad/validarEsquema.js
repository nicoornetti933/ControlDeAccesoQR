/**
 * Middleware generico de validacion de datos de entrada usando "zod".
 *
 * Toda la informacion que llega del cliente (body, query o params) debe
 * pasar por un esquema de validacion antes de tocar la logica de negocio
 * o la base de datos. Esto evita datos malformados, tipos incorrectos e
 * inyeccion de contenido inesperado.
 */

const { ErrorHttp } = require('./manejadorErrores');

function validarEsquema(esquema, origen = 'body') {
  return (req, res, next) => {
    const resultado = esquema.safeParse(req[origen]);

    if (!resultado.success) {
      const detalles = resultado.error.issues.map((problema) => ({
        campo: problema.path.join('.'),
        mensaje: problema.message,
      }));
      return next(new ErrorHttp(400, 'Los datos enviados no son validos.', detalles));
    }

    req[origen] = resultado.data;
    next();
  };
}

module.exports = validarEsquema;
