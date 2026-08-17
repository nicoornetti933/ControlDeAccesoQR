/**
 * Programador de respaldos automaticos.
 *
 * Se inicia una unica vez desde servidor.js. No usa una libreria externa
 * de cron: alcanza con un setInterval simple, porque el requisito es
 * "cada tantas horas mientras el servidor esta corriendo", no horarios
 * calendario complejos.
 *
 * Se hace un primer respaldo poco despues de arrancar (no inmediato, para
 * no competir con el resto de las tareas de arranque) y despues uno cada
 * "intervaloHoras". Si un respaldo individual falla (ej: falta espacio en
 * disco), se registra el error pero el programador sigue corriendo: no
 * queremos que un problema de respaldo tire abajo el servidor.
 */

const configuracion = require('../configuracion/configuracion');
const respaldosServicio = require('./respaldosServicio');

const UN_MINUTO_EN_MS = 60 * 1000;
const UNA_HORA_EN_MS = 60 * UN_MINUTO_EN_MS;
const DEMORA_PRIMER_RESPALDO_MS = 2 * UN_MINUTO_EN_MS;

async function ejecutarRespaldoAutomatico() {
  try {
    const resultado = await respaldosServicio.crearRespaldo({ origen: 'automatico' });
    console.log(`[respaldo-automatico] Copia creada: ${resultado.archivo} (${resultado.tamanioBytes} bytes)`);
  } catch (error) {
    console.error('[respaldo-automatico] Fallo al crear el respaldo:', error);
  }
}

function iniciarProgramadorDeRespaldos() {
  const intervaloMs = configuracion.respaldos.intervaloHoras * UNA_HORA_EN_MS;

  setTimeout(() => {
    ejecutarRespaldoAutomatico();
    setInterval(ejecutarRespaldoAutomatico, intervaloMs);
  }, DEMORA_PRIMER_RESPALDO_MS);

  console.log(
    `[respaldo-automatico] Programador iniciado: cada ${configuracion.respaldos.intervaloHoras}h, ` +
      `se conservan los ultimos ${configuracion.respaldos.cantidadAConservar} respaldos.`
  );
}

module.exports = { iniciarProgramadorDeRespaldos };
