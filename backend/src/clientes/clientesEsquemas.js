const { z } = require('zod');

const esquemaCrearCliente = z.object({
  email: z.string().trim().min(1, 'El email es obligatorio.').email('El email no es valido.'),
  password: z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres.')
    .max(128, 'La contrasena es demasiado larga.'),
  nombreCompleto: z.string().trim().min(2, 'El nombre completo es obligatorio.').max(150),
  nombreOrganizacion: z.string().trim().max(150).optional(),
  telefono: z.string().trim().max(30).optional(),
});

module.exports = { esquemaCrearCliente };
