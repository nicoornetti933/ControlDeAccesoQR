/**
 * Servicio de tokens de sesion (JWT).
 *
 * El token viaja en una cookie httpOnly (ver autenticacionRutas.js), no
 * en localStorage ni en el cuerpo de la respuesta, para reducir el
 * riesgo de robo de sesion mediante ataques XSS.
 */

const jwt = require('jsonwebtoken');
const configuracion = require('../configuracion/configuracion');

function firmarToken(datosUsuario) {
  // Solo se incluye lo minimo necesario para autorizar peticiones.
  // Nunca se incluye la contrasena (ni su hash) dentro del token.
  return jwt.sign(
    { id: datosUsuario.id, rol: datosUsuario.rol, email: datosUsuario.email },
    configuracion.jwt.secreto,
    { expiresIn: configuracion.jwt.duracion }
  );
}

function verificarToken(token) {
  return jwt.verify(token, configuracion.jwt.secreto);
}

module.exports = { firmarToken, verificarToken };
