const { z } = require('zod');

const esquemaEscanear = z.object({
  identificadorQr: z.string().trim().min(10, 'El codigo escaneado no es valido.').max(500),
  eventoId: z.number().int().positive().optional(),
});

module.exports = { esquemaEscanear };
