const { z } = require('zod');

// El precio se acepta como numero (permite decimales, ej: 1500.50) y se
// limita a un maximo razonable para evitar cargas por error (ej: agregar
// un cero de mas). No se permite negativo: ya lo impide tambien el CHECK
// de la base de datos (ver esquema.sql), pero validar aca da un mensaje
// de error mas claro al usuario antes de llegar a la base de datos.
const esquemaCrearCategoria = z.object({
  nombre: z.string().trim().min(1, 'El nombre de la categoria es obligatorio.').max(60),
  precio: z
    .number({ invalid_type_error: 'El precio debe ser un numero.' })
    .finite('El precio no es valido.')
    .min(0, 'El precio no puede ser negativo.')
    .max(99999999, 'El precio es demasiado alto.'),
});

const esquemaActualizarCategoria = esquemaCrearCategoria.partial();

module.exports = { esquemaCrearCategoria, esquemaActualizarCategoria };
