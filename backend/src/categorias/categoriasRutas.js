const express = require('express');
const controlador = require('./categoriasControlador');
const { esquemaCrearCategoria, esquemaActualizarCategoria } = require('./categoriasEsquemas');
const validarEsquema = require('../seguridad/validarEsquema');
const { autenticarPeticion, autorizarRoles } = require('../seguridad/autenticarPeticion');

const router = express.Router();

// Este router se monta en el prefijo compartido "/api" (ver aplicacion.js)
// junto con invitadosRutas, porque expone dos formas de recurso distintas
// ("/eventos/:eventoId/categorias" y "/categorias/:id"). Por eso el
// middleware de autenticacion/autorizacion se aplica POR RUTA (como un
// array que se agrega a cada definicion) y NUNCA con "router.use(...)":
// un "router.use()" sin path corre para cualquier peticion que llegue a
// este punto de montaje, incluso si no matchea ninguna ruta propia, y si
// el rol no coincide corta la cadena con next(error) antes de que la
// peticion pueda llegar al router hermano correcto (este fue exactamente
// el bug que rompio la pagina de Auditoria, ver invitadosRutas.js).
const requiereCliente = [autenticarPeticion, autorizarRoles('cliente')];

router.get('/eventos/:eventoId/categorias', ...requiereCliente, controlador.listarCategorias);
router.post(
  '/eventos/:eventoId/categorias',
  ...requiereCliente,
  validarEsquema(esquemaCrearCategoria),
  controlador.crearCategoria
);
router.put(
  '/categorias/:id',
  ...requiereCliente,
  validarEsquema(esquemaActualizarCategoria),
  controlador.actualizarCategoria
);
router.delete('/categorias/:id', ...requiereCliente, controlador.eliminarCategoria);

module.exports = router;
