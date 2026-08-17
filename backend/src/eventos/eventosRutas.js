const express = require('express');
const controlador = require('./eventosControlador');
const { esquemaCrearEvento, esquemaActualizarEvento } = require('./eventosEsquemas');
const validarEsquema = require('../seguridad/validarEsquema');
const { autenticarPeticion, autorizarRoles } = require('../seguridad/autenticarPeticion');

const router = express.Router();

// Todas las rutas de este modulo requieren sesion iniciada como cliente.
router.use(autenticarPeticion, autorizarRoles('cliente'));

router.get('/actual', controlador.obtenerEventoActual);
router.get('/', controlador.listarMisEventos);
router.post('/', validarEsquema(esquemaCrearEvento), controlador.crearEvento);
router.put('/:id', validarEsquema(esquemaActualizarEvento), controlador.actualizarEvento);
router.get('/:id/estadisticas', controlador.obtenerEstadisticasEvento);

module.exports = router;
