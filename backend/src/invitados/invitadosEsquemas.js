const { z } = require('zod');

// categoriaId es opcional (un invitado puede no tener categoria) y se
// acepta explicitamente en null para poder "quitarle" la categoria a un
// invitado que ya tenia una asignada al editarlo.
const esquemaCategoriaId = z
  .number({ invalid_type_error: 'La categoria elegida no es valida.' })
  .int()
  .positive()
  .nullable()
  .optional();

const esquemaCrearInvitado = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(100),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio.').max(100),
  dni: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, 'El DNI debe contener entre 6 y 10 digitos numericos.'),
  telefono: z
    .string()
    .trim()
    .regex(/^[\d+\-\s()]{6,20}$/, 'El telefono no tiene un formato valido.'),
  categoriaId: esquemaCategoriaId,
});

const esquemaActualizarInvitado = esquemaCrearInvitado.partial();

const esquemaCambiarEstadoInvitado = z.object({
  estado: z.enum(['pendiente', 'cancelado', 'deshabilitado'], {
    errorMap: () => ({ message: 'Estado invalido.' }),
  }),
});

module.exports = { esquemaCrearInvitado, esquemaActualizarInvitado, esquemaCambiarEstadoInvitado };
