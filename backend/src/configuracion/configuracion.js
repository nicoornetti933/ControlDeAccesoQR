/**
 * Modulo de configuracion.
 *
 * Centraliza la lectura de variables de entorno para que el resto del
 * sistema nunca acceda a "process.env" directamente. Esto permite:
 *  - Detectar temprano si falta una variable obligatoria (falla al arrancar,
 *    no en medio de una peticion de un usuario).
 *  - Tener un unico lugar para cambiar valores por defecto.
 */

require('dotenv').config();

function obtenerVariableObligatoria(nombre, valorPorDefecto) {
  const valor = process.env[nombre] ?? valorPorDefecto;
  if (valor === undefined || valor === null || valor === '') {
    throw new Error(
      `Falta la variable de entorno obligatoria "${nombre}". ` +
        'Revisa el archivo .env (podes copiar .env.ejemplo como punto de partida).'
    );
  }
  return valor;
}

const configuracion = {
  entorno: process.env.NODE_ENV || 'desarrollo',
  puerto: Number(process.env.PUERTO) || 4000,
  jwt: {
    secreto: obtenerVariableObligatoria('JWT_SECRETO'),
    duracion: process.env.JWT_DURACION || '8h',
  },
  origenPermitido: process.env.ORIGEN_PERMITIDO || 'http://localhost:5173',
  rutaBaseDeDatos: require('path').join(__dirname, '..', '..', 'datos', 'sistema.db'),
  administradorInicial: {
    email: process.env.ADMIN_EMAIL_INICIAL || 'admin@sistema.local',
    password: process.env.ADMIN_PASSWORD_INICIAL || 'CambiarInmediatamente123!',
  },
  esProduccion: (process.env.NODE_ENV || 'desarrollo') === 'produccion',
  respaldos: {
    // Carpeta donde se guardan las copias automaticas de la base de
    // datos. Vive junto al archivo .db, dentro de "datos/", para que
    // quede incluida si el usuario hace un backup manual de esa carpeta.
    carpeta: require('path').join(__dirname, '..', '..', 'datos', 'respaldos'),
    intervaloHoras: Number(process.env.RESPALDO_INTERVALO_HORAS) || 6,
    cantidadAConservar: Number(process.env.RESPALDO_CANTIDAD_A_CONSERVAR) || 30,
  },
};

module.exports = configuracion;
