const express = require('express');
const controlador = require('./codigosQrControlador');
const { autenticarPeticion, autorizarRoles } = require('../seguridad/autenticarPeticion');
const envolverAsync = require('../utilidades/envolverAsync');

const router = express.Router();

router.use(autenticarPeticion, autorizarRoles('cliente'));

router.post('/invitados/:id/generar', envolverAsync(controlador.generarQr));
router.post('/invitados/:id/regenerar', envolverAsync(controlador.regenerarQr));
router.get('/invitados/:id/activo', controlador.obtenerQrActivo);
router.get('/invitados/:id/imagen', envolverAsync(controlador.obtenerImagenQr));
router.get('/invitados/:id/historial', controlador.listarHistorial);

module.exports = router;
