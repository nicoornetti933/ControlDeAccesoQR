const { z } = require('zod');

const esquemaInicioSesion = z.object({
  email: z.string().trim().min(1, 'El email es obligatorio.').email('El email no es valido.'),
  password: z.string().min(1, 'La contrasena es obligatoria.'),
});

const esquemaCambioContrasena = z.object({
  contrasenaActual: z.string().min(1, 'La contrasena actual es obligatoria.'),
  contrasenaNueva: z
    .string()
    .min(8, 'La nueva contrasena debe tener al menos 8 caracteres.')
    .max(128, 'La nueva contrasena es demasiado larga.'),
});

// Solo la usa el administrador (ver autenticacionRutas.js): el cliente no
// puede modificar los datos de su cuenta, esos los define el
// administrador al crearla.
const esquemaCambioEmail = z.object({
  contrasenaActual: z.string().min(1, 'La contrasena actual es obligatoria.'),
  emailNuevo: z.string().trim().min(1, 'El email es obligatorio.').email('El email no es valido.'),
});

module.exports = { esquemaInicioSesion, esquemaCambioContrasena, esquemaCambioEmail };
