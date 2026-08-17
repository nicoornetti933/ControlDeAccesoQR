const { z } = require('zod');
const { esquemaCrearCliente } = require('../clientes/clientesEsquemas');

const esquemaCambiarEstadoCliente = z.object({
  activo: z.boolean(),
});

module.exports = { esquemaCrearCliente, esquemaCambiarEstadoCliente };
