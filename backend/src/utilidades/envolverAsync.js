/**
 * Envuelve un manejador de ruta asincronico para que cualquier error
 * (incluyendo errores sincronicos lanzados dentro de una funcion async,
 * como las ErrorHttp del modulo de seguridad) sea reenviado a "next(error)"
 * y termine en el middleware central de manejo de errores, en lugar de
 * convertirse en una promesa rechazada sin manejar que tumba el proceso.
 *
 * Express 4 NO captura automaticamente errores de funciones async; por
 * eso todo manejador de ruta que use "async/await" debe pasar por aca.
 */

function envolverAsync(manejador) {
  return (req, res, next) => {
    Promise.resolve(manejador(req, res, next)).catch(next);
  };
}

module.exports = envolverAsync;
