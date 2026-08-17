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

const path = require('path');

const configuracion = {
  entorno: process.env.NODE_ENV || 'desarrollo',
  // Ademas de la variable propia ("PUERTO"), se acepta "PORT": es el
  // nombre que usan Render y la mayoria de los servicios de hosting para
  // indicarle a la app en que puerto tiene que escuchar. Asi el sistema
  // funciona en esos servicios sin tener que configurar nada extra.
  puerto: Number(process.env.PUERTO || process.env.PORT) || 4000,
  jwt: {
    secreto: obtenerVariableObligatoria('JWT_SECRETO'),
    duracion: process.env.JWT_DURACION || '8h',
  },
  origenPermitido: process.env.ORIGEN_PERMITIDO || 'http://localhost:5173',
  // Por defecto, la base de datos vive dentro de la carpeta del proyecto
  // ("backend/datos/sistema.db"). En un hosting con disco efimero (como
  // Render sin un "persistent disk"), ese archivo se borra en cada
  // reinicio/despliegue. "RUTA_BASE_DATOS" permite apuntar el archivo a
  // una ruta distinta (por ejemplo, un disco persistente montado en
  // "/var/data") sin tocar el codigo. Ver despliegue/render.md.
  rutaBaseDeDatos: process.env.RUTA_BASE_DATOS || path.join(__dirname, '..', '..', 'datos', 'sistema.db'),
  administradorInicial: {
    email: process.env.ADMIN_EMAIL_INICIAL || 'admin@sistema.local',
    password: process.env.ADMIN_PASSWORD_INICIAL || 'CambiarInmediatamente123!',
  },
  esProduccion: (process.env.NODE_ENV || 'desarrollo') === 'produccion',
  respaldos: {
    // Igual que "rutaBaseDeDatos": por defecto vive junto al .db, pero se
    // puede redirigir a un disco persistente con "RUTA_CARPETA_RESPALDOS".
    carpeta: process.env.RUTA_CARPETA_RESPALDOS || path.join(__dirname, '..', '..', 'datos', 'respaldos'),
    intervaloHoras: Number(process.env.RESPALDO_INTERVALO_HORAS) || 6,
    cantidadAConservar: Number(process.env.RESPALDO_CANTIDAD_A_CONSERVAR) || 30,
  },
};

module.exports = configuracion;
