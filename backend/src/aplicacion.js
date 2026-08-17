/**
 * Configuracion de la aplicacion Express.
 *
 * Este archivo unicamente arma el "esqueleto" HTTP: seguridad
 * transversal (helmet, cors, limites de tamano de body), montaje de
 * cada modulo en su prefijo de ruta, y el manejo de errores final.
 * Ningun modulo de negocio vive aca: cada uno se define en su propia
 * carpeta bajo src/ y se importa como un router independiente.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const configuracion = require('./configuracion/configuracion');
const { limitadorGeneral } = require('./seguridad/limitadorPeticiones');
const { noEncontrado, manejadorErrores } = require('./seguridad/manejadorErrores');

const autenticacionRutas = require('./autenticacion/autenticacionRutas');
const administracionRutas = require('./administracion/administracionRutas');
const eventosRutas = require('./eventos/eventosRutas');
const invitadosRutas = require('./invitados/invitadosRutas');
const categoriasRutas = require('./categorias/categoriasRutas');
const codigosQrRutas = require('./codigosQr/codigosQrRutas');
const controlAccesoRutas = require('./controlAcceso/controlAccesoRutas');
const registrosRutas = require('./registros/registrosRutas');

const app = express();

// Necesario para que "req.ip" refleje la IP real cuando el sistema corre
// detras de un proxy/balanceador (comun en despliegues en la nube).
app.set('trust proxy', 1);

// --- Seguridad transversal ---------------------------------------------
app.use(helmet());
app.use(
  cors({
    origin: configuracion.origenPermitido,
    credentials: true, // permite el envio de la cookie de sesion
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(limitadorGeneral);

// --- Modulos de la API ---------------------------------------------------
app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));

app.use('/api/autenticacion', autenticacionRutas);
app.use('/api/administracion', administracionRutas);
app.use('/api/eventos', eventosRutas);
app.use('/api', invitadosRutas); // define sus propios prefijos /eventos/:id/invitados y /invitados/:id
app.use('/api', categoriasRutas); // define sus propios prefijos /eventos/:id/categorias y /categorias/:id
app.use('/api/codigos-qr', codigosQrRutas);
app.use('/api/control-acceso', controlAccesoRutas);
app.use('/api/registros', registrosRutas);

// --- Manejo de errores (siempre al final) --------------------------------
app.use(noEncontrado);
app.use(manejadorErrores);

module.exports = app;
