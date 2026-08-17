/**
 * Punto de entrada del backend.
 *
 * Uso:
 *   npm run sembrar   (una sola vez, para crear el administrador inicial)
 *   npm start         (o "npm run dev" para reinicio automatico)
 */

const app = require('./src/aplicacion');
const configuracion = require('./src/configuracion/configuracion');
const { iniciarProgramadorDeRespaldos } = require('./src/respaldos/respaldosProgramador');

// Red de seguridad ante errores no controlados: se registran en el log
// del servidor para poder diagnosticarlos. Cualquier error esperable de
// una peticion HTTP deberia llegar siempre al manejador de errores de
// Express (ver src/seguridad/manejadorErrores.js); si algo termina aca
// es indicio de un bug que conviene corregir en el origen.
process.on('unhandledRejection', (error) => {
  console.error('[promesa-no-manejada]', error);
});
process.on('uncaughtException', (error) => {
  console.error('[excepcion-no-capturada]', error);
});

app.listen(configuracion.puerto, () => {
  console.log(`API del sistema de control de acceso escuchando en el puerto ${configuracion.puerto}`);
  console.log(`Entorno: ${configuracion.entorno}`);
});

iniciarProgramadorDeRespaldos();
