/**
 * Limitadores de tasa (rate limiting) para proteger endpoints sensibles
 * contra ataques de fuerza bruta y abuso automatizado.
 */

const rateLimit = require('express-rate-limit');

// Login: pocos intentos por IP en una ventana corta, para dificultar
// ataques de fuerza bruta sobre contrasenas.
const limitadorInicioSesion = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesion. Intenta nuevamente mas tarde.' },
});

// Escaneo de QR: permite uso intensivo normal (varios ingresos por
// minuto en la puerta) pero corta un abuso evidente (por ejemplo, un
// script probando identificadores al azar).
const limitadorEscaneoQr = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones de escaneo en poco tiempo. Espera unos segundos.' },
});

// Limite general para el resto de la API.
const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { limitadorInicioSesion, limitadorEscaneoQr, limitadorGeneral };
