const { z } = require('zod');

// Limites razonables para el anio del evento. Sin este chequeo, el
// input "date" del navegador permite escribir anios de mas de 4 cifras
// (es un comportamiento valido segun el estandar HTML, pensado para
// fechas historicas/astronomicas) y ademas una regex que solo cuenta
// digitos (\d{4}-\d{2}-\d{2}) deja pasar fechas con mes/dia invalidos
// como "2026-13-45". Por eso, ademas del formato, se valida que sea una
// fecha de calendario real y que el anio este en un rango util para un
// sistema de eventos.
const ANIO_MINIMO = 2000;
const ANIOS_A_FUTURO_PERMITIDOS = 15;

function esFechaDeCalendarioValida(cadena) {
  const [anioTexto, mesTexto, diaTexto] = cadena.split('-');
  const anio = Number(anioTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  if (mes < 1 || mes > 12) return false;

  // El "dia 0" del mes siguiente es, en JS, el ultimo dia del mes
  // buscado: asi se obtiene la cantidad real de dias de ese mes (28, 29,
  // 30 o 31) sin tener que hardcodear los años bisiestos a mano.
  const diasEnEseMes = new Date(anio, mes, 0).getDate();
  if (dia < 1 || dia > diasEnEseMes) return false;

  return true;
}

const esquemaCrearEvento = z.object({
  nombre: z.string().trim().min(2, 'El nombre del evento es obligatorio.').max(150),
  fecha: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD.')
    .refine((valor) => Number(valor.slice(0, 4)) >= ANIO_MINIMO, {
      message: `El anio de la fecha no puede ser anterior a ${ANIO_MINIMO}.`,
    })
    .refine((valor) => Number(valor.slice(0, 4)) <= new Date().getFullYear() + ANIOS_A_FUTURO_PERMITIDOS, {
      message: 'El anio de la fecha es demasiado lejano. Revisa que no tenga digitos de mas.',
    })
    .refine(esFechaDeCalendarioValida, {
      message: 'La fecha ingresada no existe en el calendario (revisa el mes y el dia).',
    }),
  hora: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener el formato HH:MM (24 horas).'),
  lugar: z.string().trim().min(2, 'El lugar es obligatorio.').max(200),
});

const esquemaActualizarEvento = esquemaCrearEvento.partial();

module.exports = { esquemaCrearEvento, esquemaActualizarEvento };
