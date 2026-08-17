/**
 * Servicio de contrasenas: nunca se guarda ni se compara una contrasena
 * en texto plano. Se usa bcrypt (con costo 12) tanto para el hash como
 * para la comparacion segura.
 */

const bcrypt = require('bcryptjs');

const COSTO_HASH = 12;

function hashearContrasena(contrasenaPlana) {
  return bcrypt.hashSync(contrasenaPlana, COSTO_HASH);
}

function compararContrasena(contrasenaPlana, contrasenaHash) {
  return bcrypt.compareSync(contrasenaPlana, contrasenaHash);
}

module.exports = { hashearContrasena, compararContrasena };
