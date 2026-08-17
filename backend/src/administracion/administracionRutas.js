const express = require('express');
const controlador = require('./administracionControlador');
const respaldosControlador = require('../respaldos/respaldosControlador');
const { esquemaCrearCliente, esquemaCambiarEstadoCliente } = require('./administracionEsquemas');
const validarEsquema = require('../seguridad/validarEsquema');
const { autenticarPeticion, autorizarRoles } = require('../seguridad/autenticarPeticion');
const envolverAsync = require('../utilidades/envolverAsync');

const router = express.Router();

// El administrador es el unico rol que puede usar cualquier ruta de
// este modulo (principio de minimo privilegio).
router.use(autenticarPeticion, autorizarRoles('administrador'));

router.get('/clientes', controlador.listarClientes);
router.post('/clientes', validarEsquema(esquemaCrearCliente), controlador.crearCliente);
router.patch(
  '/clientes/:id/estado',
  validarEsquema(esquemaCambiarEstadoCliente),
  controlador.cambiarEstadoCliente
);
router.delete('/clientes/:id', controlador.eliminarCliente);

router.get('/eventos', controlador.listarEventos);
router.get('/eventos/:id', controlador.obtenerEvento);
router.put('/eventos/:id/finalizar', controlador.finalizarEvento);
router.get('/eventos/:id/invitados', controlador.listarInvitadosDeEvento);
router.get('/eventos/:id/accesos', controlador.listarAccesosDeEvento);

router.get('/respaldos', respaldosControlador.listarRespaldos);
router.post('/respaldos', envolverAsync(respaldosControlador.crearRespaldoManual));

module.exports = router;
