/**
 * Script de siembra: crea la cuenta de administrador inicial si todavia
 * no existe ningun usuario con rol "administrador".
 *
 * Uso:  npm run sembrar
 *
 * Las credenciales se toman de las variables de entorno
 * ADMIN_EMAIL_INICIAL y ADMIN_PASSWORD_INICIAL (ver .env.ejemplo).
 * Se recomienda cambiar la contrasena inmediatamente despues del primer
 * inicio de sesion.
 */

const bcrypt = require('bcryptjs');
const baseDeDatos = require('./conexion');
const configuracion = require('../configuracion/configuracion');

function sembrarAdministrador() {
  const yaExisteAdmin = baseDeDatos
    .prepare("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'administrador'")
    .get().total;

  if (yaExisteAdmin > 0) {
    console.log('Ya existe al menos un administrador. No se crea uno nuevo.');
    return;
  }

  const { email, password } = configuracion.administradorInicial;
  const contrasenaHash = bcrypt.hashSync(password, 12);

  baseDeDatos
    .prepare(
      `INSERT INTO usuarios (email, contrasena_hash, rol, nombre_completo, activo)
       VALUES (?, ?, 'administrador', 'Administrador del sistema', 1)`
    )
    .run(email, contrasenaHash);

  console.log('Administrador inicial creado:');
  console.log('  Email:      ', email);
  console.log('  Contrasena: ', password);
  console.log('IMPORTANTE: cambiar esta contrasena despues del primer inicio de sesion.');
}

sembrarAdministrador();
