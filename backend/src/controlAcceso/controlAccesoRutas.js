const express = require('express');
const controlador = require('./controlAccesoControlador');
const { esquemaEscanear } = require('./controlAccesoEsquemas');
const validarEsquema = require('../seguridad/validarEsquema');
const { autenticarPeticion, autorizarRoles } = require('../seguridad/autenticarPeticion');
const { limitadorEscaneoQr } = require('../seguridad/limitadorPeticiones');

const router = express.Router();

router.use(autenticarPeticion, autorizarRoles('cliente', 'administrador'));

router.post(
  '/escanear',
  limitadorEscaneoQr,
  validarEsquema(esquemaEscanear),
  controlador.escanear
);
router.get('/historial', controlador.obtenerHistorial);

module.exports = router;
