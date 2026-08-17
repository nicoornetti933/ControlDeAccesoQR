const express = require('express');
const controlador = require('./registrosControlador');
const { autenticarPeticion, autorizarRoles } = require('../seguridad/autenticarPeticion');

const router = express.Router();

// La bitacora de auditoria del sistema es informacion sensible: solo el
// administrador puede consultarla.
router.use(autenticarPeticion, autorizarRoles('administrador'));

router.get('/auditoria', controlador.listarAuditoria);

module.exports = router;
