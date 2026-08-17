/**
 * Middleware de autenticacion y autorizacion por rol.
 *
 * "autenticarPeticion": exige una sesion valida (cookie con JWT firmado
 * y no vencido) y adjunta el usuario autenticado en "req.usuario".
 *
 * "autorizarRoles": exige ademas que el rol del usuario autenticado este
 * dentro de la lista de roles permitidos para ese endpoint. Aplica el
 * principio de minimo privilegio: cada ruta declara explicitamente que
 * roles pueden usarla.
 */

const { verificarToken } = require('../autenticacion/servicioTokens');
const { ErrorHttp } = require('./manejadorErrores');
const baseDeDatos = require('../basededatos/conexion');

const obtenerUsuarioPorId = baseDeDatos.prepare(
  'SELECT id, email, rol, activo, nombre_completo, nombre_organizacion FROM usuarios WHERE id = ?'
);

function autenticarPeticion(req, res, next) {
  const token = req.cookies?.token_sesion;

  if (!token) {
    return next(new ErrorHttp(401, 'No hay una sesion activa. Inicia sesion nuevamente.'));
  }

  let datosToken;
  try {
    datosToken = verificarToken(token);
  } catch (error) {
    return next(new ErrorHttp(401, 'La sesion es invalida o expiro. Inicia sesion nuevamente.'));
  }

  const usuario = obtenerUsuarioPorId.get(datosToken.id);

  if (!usuario) {
    return next(new ErrorHttp(401, 'El usuario de la sesion ya no existe.'));
  }

  if (!usuario.activo) {
    return next(new ErrorHttp(403, 'La cuenta esta desactivada. Contacta al administrador.'));
  }

  // Nunca se expone la contrasena (ni su hash) mas alla de este punto.
  req.usuario = usuario;
  next();
}

function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(new ErrorHttp(401, 'No hay una sesion activa.'));
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new ErrorHttp(403, 'No tenes permisos para realizar esta accion.'));
    }
    next();
  };
}

module.exports = { autenticarPeticion, autorizarRoles };
