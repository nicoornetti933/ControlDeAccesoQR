const express = require('express');
const controlador = require('./invitadosControlador');
const {
  esquemaCrearInvitado,
  esquemaActualizarInvitado,
  esquemaCambiarEstadoInvitado,
} = require('./invitadosEsquemas');
const validarEsquema = require('../seguridad/validarEsquema');
const { autenticarPeticion, autorizarRoles } = require('../seguridad/autenticarPeticion');

const router = express.Router();

// IMPORTANTE: este router se monta en "/api" (no en un prefijo propio
// como "/api/invitados"), porque expone dos rutas con formas distintas
// ("/eventos/:eventoId/invitados" y "/invitados/:id"). Por eso la
// autenticacion/autorizacion NO se aplica con "router.use(...)" a secas:
// eso corre para CUALQUIER peticion que llegue a este router sin
// importar si despues matchea alguna ruta propia, y como esta montado en
// el prefijo mas amplio posible ("/api"), terminaria interceptando (y
// rechazando con 403) peticiones destinadas a otros modulos montados
// despues en aplicacion.js (por ejemplo /api/registros/auditoria para un
// administrador, que no es "cliente"). Por eso el middleware se agrega
// individualmente en cada ruta: asi solo corre cuando la ruta realmente
// matchea, y cualquier otro path sigue de largo hacia el siguiente
// router de la aplicacion.
const requiereCliente = [autenticarPeticion, autorizarRoles('cliente')];

// Anidado bajo el evento para dejar explicito en la URL que un invitado
// siempre pertenece a un evento especifico.
router.get('/eventos/:eventoId/invitados', ...requiereCliente, controlador.listarInvitados);
router.post(
  '/eventos/:eventoId/invitados',
  ...requiereCliente,
  validarEsquema(esquemaCrearInvitado),
  controlador.crearInvitado
);

router.put(
  '/invitados/:id',
  ...requiereCliente,
  validarEsquema(esquemaActualizarInvitado),
  controlador.actualizarInvitado
);
router.patch(
  '/invitados/:id/estado',
  ...requiereCliente,
  validarEsquema(esquemaCambiarEstadoInvitado),
  controlador.cambiarEstadoInvitado
);
router.delete('/invitados/:id', ...requiereCliente, controlador.eliminarInvitado);

module.exports = router;
