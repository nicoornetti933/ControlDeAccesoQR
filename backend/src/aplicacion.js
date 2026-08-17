/**
 * Configuracion de la aplicacion Express.
 *
 * Este archivo unicamente arma el "esqueleto" HTTP: seguridad
 * transversal (helmet, cors, limites de tamano de body), montaje de
 * cada modulo en su prefijo de ruta, y el manejo de errores final.
 * Ningun modulo de negocio vive aca: cada uno se define en su propia
 * carpeta bajo src/ y se importa como un router independiente.
 */

const path = require('path');
const fs = require('fs');
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

// --- Frontend compilado (opcional) ---------------------------------------
// Si existe "frontend/dist" (resultado de "npm run build" en el
// frontend), el propio backend lo sirve como archivos estaticos. Esto
// permite desplegar todo el sistema como un UNICO servicio (por ejemplo,
// un solo Web Service en Render, ver despliegue/render.md): frontend y
// backend quedan en el mismo origen, sin necesidad de configurar CORS ni
// depender de que las cookies de sesion viajen entre dos subdominios
// distintos. En desarrollo local esta carpeta no existe (se usa "npm run
// dev" con el proxy de Vite en su lugar, ver vite.config.js), asi que
// este bloque no hace nada y no afecta el flujo de trabajo habitual.
const carpetaFrontendCompilado = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(carpetaFrontendCompilado)) {
  app.use(express.static(carpetaFrontendCompilado));
  // Cualquier ruta que no sea de la API se resuelve con index.html: es
  // React Router, del lado del cliente, quien decide que pantalla
  // mostrar segun la URL (patron estandar para SPAs).
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next(); // deja que caiga en "noEncontrado" de abajo
    }
    res.sendFile(path.join(carpetaFrontendCompilado, 'index.html'));
  });
}

// --- Manejo de errores (siempre al final) --------------------------------
app.use(noEncontrado);
app.use(manejadorErrores);

module.exports = app;
