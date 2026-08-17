const express = require('express');
const controlador = require('./autenticacionControlador');
const {
  esquemaInicioSesion,
  esquemaCambioContrasena,
  esquemaCambioEmail,
} = require('./autenticacionEsquemas');
const validarEsquema = require('../seguridad/validarEsquema');
const { autenticarPeticion, autorizarRoles } = require('../seguridad/autenticarPeticion');
const { limitadorInicioSesion } = require('../seguridad/limitadorPeticiones');

const router = express.Router();

router.post(
  '/iniciar-sesion',
  limitadorInicioSesion,
  validarEsquema(esquemaInicioSesion),
  controlador.iniciarSesion
);

router.post('/cerrar-sesion', autenticarPeticion, controlador.cerrarSesion);

router.get('/perfil', autenticarPeticion, controlador.obtenerPerfil);

// El email y la contrasena del cliente son datos que le asigna el
// administrador al crear la cuenta (ver modulo "clientes"); el cliente
// no puede modificarlos por su cuenta. Solo el administrador puede
// autogestionar su propio email/contrasena.
router.put(
  '/cambiar-contrasena',
  autenticarPeticion,
  autorizarRoles('administrador'),
  validarEsquema(esquemaCambioContrasena),
  controlador.cambiarContrasenaPropia
);

router.put(
  '/cambiar-email',
  autenticarPeticion,
  autorizarRoles('administrador'),
  validarEsquema(esquemaCambioEmail),
  controlador.cambiarEmailPropio
);

module.exports = router;
