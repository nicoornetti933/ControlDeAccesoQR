/**
 * Controlador de autenticacion: inicio de sesion, cierre de sesion y
 * consulta/actualizacion del perfil propio.
 */

const baseDeDatos = require('../basededatos/conexion');
const { hashearContrasena, compararContrasena } = require('./servicioContrasenas');
const { firmarToken } = require('./servicioTokens');
const { ErrorHttp } = require('../seguridad/manejadorErrores');
const registrarAuditoria = require('../seguridad/registrarAuditoria');
const configuracion = require('../configuracion/configuracion');

const obtenerUsuarioPorEmail = baseDeDatos.prepare('SELECT * FROM usuarios WHERE email = ?');
const actualizarContrasena = baseDeDatos.prepare(
  "UPDATE usuarios SET contrasena_hash = ?, actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
);
const actualizarEmail = baseDeDatos.prepare(
  "UPDATE usuarios SET email = ?, actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
);

// Nombre de la cookie centralizado para que no se repita el literal en
// varios archivos (login la crea, logout la borra, el middleware la lee).
const NOMBRE_COOKIE_SESION = 'token_sesion';

function opcionesCookieSesion() {
  return {
    httpOnly: true, // inaccesible desde JavaScript del navegador (mitiga XSS)
    secure: configuracion.esProduccion, // solo por HTTPS en produccion
    sameSite: 'lax', // mitiga CSRF en la mayoria de los casos de uso
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  };
}

function iniciarSesion(req, res, next) {
  const { email, password } = req.body;

  const usuario = obtenerUsuarioPorEmail.get(email);

  // Se compara siempre contra un hash (aunque el usuario no exista) para
  // no filtrar por tiempo de respuesta si un email esta registrado o no.
  const contrasenaHashParaComparar =
    usuario?.contrasena_hash || '$2a$12$aaaaaaaaaaaaaaaaaaaaaeaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const contrasenaValida = compararContrasena(password, contrasenaHashParaComparar);

  if (!usuario || !contrasenaValida) {
    registrarAuditoria({
      accion: 'inicio_sesion_fallido',
      detalle: { email },
      direccionIp: req.ip,
    });
    return next(new ErrorHttp(401, 'Email o contrasena incorrectos.'));
  }

  if (!usuario.activo) {
    return next(new ErrorHttp(403, 'La cuenta esta desactivada. Contacta al administrador.'));
  }

  const token = firmarToken(usuario);
  res.cookie(NOMBRE_COOKIE_SESION, token, opcionesCookieSesion());

  registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'inicio_sesion_exitoso',
    direccionIp: req.ip,
  });

  res.json({
    usuario: {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombreCompleto: usuario.nombre_completo,
      nombreOrganizacion: usuario.nombre_organizacion,
    },
  });
}

function cerrarSesion(req, res) {
  res.clearCookie(NOMBRE_COOKIE_SESION, { path: '/' });
  res.json({ mensaje: 'Sesion cerrada.' });
}

function obtenerPerfil(req, res) {
  res.json({
    usuario: {
      id: req.usuario.id,
      email: req.usuario.email,
      rol: req.usuario.rol,
      nombreCompleto: req.usuario.nombre_completo,
      nombreOrganizacion: req.usuario.nombre_organizacion,
    },
  });
}

function cambiarContrasenaPropia(req, res, next) {
  const { contrasenaActual, contrasenaNueva } = req.body;

  const usuario = baseDeDatos.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);

  if (!compararContrasena(contrasenaActual, usuario.contrasena_hash)) {
    return next(new ErrorHttp(400, 'La contrasena actual no es correcta.'));
  }

  actualizarContrasena.run(hashearContrasena(contrasenaNueva), usuario.id);

  registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'cambio_contrasena_propia',
    direccionIp: req.ip,
  });

  res.json({ mensaje: 'Contrasena actualizada correctamente.' });
}

// Solo el administrador puede llamar a este endpoint (ver
// autenticacionRutas.js): el email del cliente es un dato que le asigna
// el administrador al crear la cuenta, el cliente no lo puede tocar.
function cambiarEmailPropio(req, res, next) {
  const { contrasenaActual, emailNuevo } = req.body;

  const usuario = baseDeDatos.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);

  if (!compararContrasena(contrasenaActual, usuario.contrasena_hash)) {
    return next(new ErrorHttp(400, 'La contrasena actual no es correcta.'));
  }

  const emailEnUso = obtenerUsuarioPorEmail.get(emailNuevo);
  if (emailEnUso && emailEnUso.id !== usuario.id) {
    return next(new ErrorHttp(409, 'Ya existe otra cuenta registrada con ese email.'));
  }

  actualizarEmail.run(emailNuevo, usuario.id);

  registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'cambio_email_propio',
    detalle: { emailAnterior: usuario.email, emailNuevo },
    direccionIp: req.ip,
  });

  res.json({
    usuario: {
      id: usuario.id,
      email: emailNuevo,
      rol: usuario.rol,
      nombreCompleto: usuario.nombre_completo,
      nombreOrganizacion: usuario.nombre_organizacion,
    },
  });
}

module.exports = {
  NOMBRE_COOKIE_SESION,
  iniciarSesion,
  cerrarSesion,
  obtenerPerfil,
  cambiarContrasenaPropia,
  cambiarEmailPropio,
};
