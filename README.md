# Sistema de Control de Acceso para Eventos

Sistema web para gestionar invitados y controlar el ingreso a eventos mediante
codigos QR individuales, unicos e irrepetibles. Pensado para que un
administrador (dueno del sistema) le alquile el servicio a organizadores de
eventos, cada uno con su propio evento, invitados y control de acceso
aislado del resto.

Stack: **Node.js + Express + SQLite** (backend) y **React + Vite +
TailwindCSS** (frontend), con todo el codigo (carpetas, archivos, variables,
funciones, comentarios) escrito en espanol.

---

## Indice

1. [Arranque rapido](#arranque-rapido)
2. [Arquitectura general](#arquitectura-general)
3. [Estructura de carpetas](#estructura-de-carpetas)
4. [Modelo de datos](#modelo-de-datos)
5. [Como se garantiza la unicidad de los QR](#como-se-garantiza-la-unicidad-de-los-qr)
6. [Las 6 validaciones del control de acceso](#las-6-validaciones-del-control-de-acceso)
7. [Seguridad implementada](#seguridad-implementada)
8. [Referencia de la API](#referencia-de-la-api)
9. [Guia de mantenimiento](#guia-de-mantenimiento)
10. [Como agregar funcionalidad nueva](#como-agregar-funcionalidad-nueva)
11. [Solucion de problemas frecuentes](#solucion-de-problemas-frecuentes)
12. [Probar el escaner con la camara del celular (en local)](#probar-el-escaner-con-la-camara-del-celular-en-local)
13. [Despliegue en produccion con HTTPS](#despliegue-en-produccion-con-https)

---

## Arranque rapido

### Requisitos

- **Node.js 22 LTS** (recomendado; es con la version que se probo el
  proyecto). Evita instalar la version "Current" mas nueva de Node en
  Windows: el paquete de base de datos (`better-sqlite3`) puede no tener
  todavia un binario precompilado para versiones recien salidas, y eso
  obliga a compilar con Visual Studio (ver la seccion de
  [solucion de problemas](#solucion-de-problemas-frecuentes) si te pasa).
- No hace falta instalar ninguna base de datos aparte: SQLite guarda todo en
  un archivo (`backend/datos/sistema.db`) que se crea solo.

### 1. Backend

```bash
cd backend
cp .env.ejemplo .env
# Editar .env y cambiar, como minimo, JWT_SECRETO y las credenciales de
# ADMIN_EMAIL_INICIAL / ADMIN_PASSWORD_INICIAL.

npm install
npm run sembrar   # crea el usuario administrador inicial (una sola vez)
npm run dev       # levanta la API en http://localhost:4000
```

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev   # levanta la web en http://localhost:5173
```

(No hace falta crear un `.env` en el frontend para el uso normal: por
defecto habla con el backend a traves de un proxy interno de Vite. Ver
`frontend/.env.ejemplo` si el backend corriera en otro lado.)

### 3. Usar el sistema

1. Entra a `http://localhost:5173/iniciar-sesion`.
2. Inicia sesion con el email/contrasena que imprimio `npm run sembrar`
   (por defecto `admin@sistema.local` / la que hayas puesto en `.env`).
3. Como administrador, crea un cliente (organizador) desde
   **Administracion → Clientes**.
4. Cierra sesion y entra con las credenciales de ese cliente: desde ahi se
   crea el evento, se cargan invitados, se generan los QR y se usa el
   escaner de control de acceso (con la camara del celular del staff).

> Cambia la contrasena del administrador inicial apenas puedas, desde
> **Mi cuenta**.

---

## Arquitectura general

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────┐
│   Frontend (React)  │ ────────────────────────► │   Backend (Express)  │
│  Vite + TailwindCSS  │ ◄──────────────────────── │   + SQLite (archivo) │
└─────────────────────┘     cookie httpOnly JWT     └──────────────────────┘
```

- El **frontend** es una SPA (Single Page Application) que solo se encarga
  de mostrar datos y mandar peticiones a la API. No contiene ninguna
  logica de seguridad real: es "maquillaje" para la experiencia de uso.
- El **backend** es la unica fuente de verdad. Toda validacion de permisos,
  toda regla de negocio (un evento activo por cliente, unicidad de QR,
  las 6 validaciones del escaneo) se hace ahi, porque un cliente del lado
  del navegador siempre puede ser manipulado por quien lo usa.
- La **base de datos** (SQLite) no es solo almacenamiento: tiene
  restricciones (`UNIQUE`, `CHECK`, `FOREIGN KEY`, indices unicos
  parciales) que actuan como ultima linea de defensa de la integridad de
  los datos, incluso si hubiera un error de logica en el codigo.

### Principio de organizacion del backend

Cada carpeta bajo `backend/src/` es un modulo independiente con esta forma:

```
modulo/
  moduloEsquemas.js     -> validacion de datos de entrada (zod)
  moduloServicio.js     -> logica de negocio + acceso a datos (SQL)
  moduloControlador.js  -> traduce peticion HTTP <-> funciones del servicio
  moduloRutas.js         -> define los endpoints Express y los middlewares
```

Esta separacion (muy parecida a una arquitectura en capas / MVC) permite
que, por ejemplo, cambiar como se valida un DNI (`invitadosEsquemas.js`)
nunca afecte la logica de negocio (`invitadosServicio.js`), o que cambiar
un mensaje de error en una ruta no obligue a tocar el acceso a datos. El
"servicio" es la unica capa que sabe SQL; el "controlador" es la unica
capa que sabe de `req`/`res`.

---

## Estructura de carpetas

```
sistema-control-acceso/
├── backend/
│   ├── servidor.js                  # Punto de entrada (arranca Express)
│   ├── .env.ejemplo                 # Plantilla de variables de entorno
│   └── src/
│       ├── configuracion/           # Lectura centralizada de variables de entorno
│       ├── basededatos/             # Esquema SQL, conexion, script de siembra del admin
│       ├── seguridad/               # Middlewares transversales: auth, roles, rate
│       │                             # limiting, validacion, manejo de errores, auditoria
│       ├── autenticacion/           # Login, logout, tokens JWT, hash de contrasenas
│       ├── clientes/                # Logica de negocio de la cuenta "cliente"
│       ├── administracion/          # Endpoints exclusivos del administrador
│       ├── eventos/                 # Un evento activo por cliente
│       ├── invitados/               # CRUD de invitados, aislado por evento/cliente
│       ├── codigosQr/               # Generacion/regeneracion/unicidad de QR
│       ├── controlAcceso/           # Escaneo: las 6 validaciones obligatorias
│       ├── registros/               # Estadisticas del evento + bitacora de auditoria
│       └── utilidades/              # Helpers genericos (ej. manejo de errores async)
│
└── frontend/
    └── src/
        ├── principal.jsx             # Punto de entrada de React
        ├── Aplicacion.jsx             # Definicion de rutas (react-router-dom)
        ├── contexto/                  # Estado global de sesion (usuario autenticado)
        ├── servicios/                 # Cliente HTTP unico hacia la API
        ├── componentes/               # Piezas de UI reutilizables (layout, tablas, modales)
        ├── paginas/
        │   ├── cliente/                # Panel, invitados, escaner del organizador
        │   └── administracion/         # Clientes, eventos, auditoria del administrador
        └── estilos/                   # Configuracion de estilos globales (Tailwind)
```

---

## Modelo de datos

Ver el detalle completo, comentado campo por campo, en
[`backend/src/basededatos/esquema.sql`](backend/src/basededatos/esquema.sql).
Resumen de las tablas y sus relaciones:

```
usuarios (administrador | cliente)
   └── eventos (1 activo por usuario, maximo)
          └── invitados (unicos por DNI dentro del evento)
                 └── codigos_qr (1 activo por invitado, identificador UNICO GLOBAL)
          └── registros_acceso (historial de cada escaneo, autorizado o rechazado)
usuarios ── registros_auditoria (bitacora de operaciones sensibles)
```

Puntos clave del diseno:

- **`usuarios`** representa tanto al administrador como a los clientes
  (columna `rol`). Comparten la logica de autenticacion.
- **`eventos`** tiene un indice `UNIQUE` parcial
  (`WHERE estado = 'activo'`) que impide, a nivel de base de datos, que un
  mismo usuario tenga dos eventos activos simultaneamente.
- **`codigos_qr.identificador_unico`** tiene `UNIQUE NOT NULL`: ningun
  identificador se puede repetir en TODO el sistema, sin importar el
  evento o el invitado.
- **`codigos_qr`** tambien tiene un indice `UNIQUE` parcial
  (`WHERE estado = 'activo'`) que impide que un invitado tenga dos QR
  activos al mismo tiempo.
- Los borrados en cascada (`ON DELETE CASCADE`) mantienen la base
  consistente: si se elimina un cliente, se eliminan sus eventos,
  invitados y QR; si se elimina un evento, se eliminan sus invitados y QR.

---

## Como se garantiza la unicidad de los QR

Este era el requisito mas critico de la especificacion, y se resuelve con
**tres capas independientes** (ver
`backend/src/codigosQr/codigosQrServicio.js`):

1. **Generacion criptograficamente aleatoria**: cada identificador se crea
   con `crypto.randomBytes(32)` (256 bits de entropia), nunca con datos
   predecibles (ni secuenciales, ni derivados del nombre/DNI del
   invitado). Es matematicamente inviable que se repita por azar.
2. **Restriccion `UNIQUE` en la base de datos**: aunque el paso anterior
   fallara, la columna `identificador_unico` rechaza cualquier insercion
   duplicada. El codigo detecta ese error puntual y reintenta con un
   nuevo identificador (`insertarNuevoQrConReintentos`).
3. **Un solo QR activo por invitado**: un indice unico parcial impide que
   un invitado tenga dos codigos con `estado = 'activo'` al mismo tiempo.
   Por eso, **regenerar** un QR invalida el anterior y crea el nuevo
   dentro de la MISMA transaccion SQL (o se hacen las dos cosas, o
   ninguna) — nunca hay una ventana de tiempo con dos QR activos.

El QR impreso/mostrado **solo contiene ese identificador opaco** (por
ejemplo `AJhNgvyb_8ezdbkjSSvJ0Wj_...`), nunca el nombre, DNI o telefono del
invitado. El servidor es quien traduce ese identificador al invitado real
al momento de escanear.

---

## Las 6 validaciones del control de acceso

Implementadas en orden en
`backend/src/controlAcceso/controlAccesoServicio.js` → `procesarEscaneo`,
dentro de una unica transaccion SQL sincronica (evita que dos escaneos
simultaneos del mismo QR puedan autorizarse ambos):

| # | Validacion | Resultado si falla |
|---|---|---|
| 1 | El codigo existe en el sistema | `codigo_qr_inexistente` |
| 2 | El codigo esta vigente (no fue invalidado por una regeneracion) | `codigo_qr_invalidado` |
| 3 | Corresponde al evento actual | `codigo_qr_no_corresponde_al_evento_actual` |
| 4 | Corresponde a un invitado existente | `codigo_qr_inexistente` |
| 5 | El invitado esta habilitado (no cancelado/deshabilitado) | `invitado_deshabilitado_o_cancelado` |
| 6 | El codigo no fue usado antes | `codigo_qr_ya_utilizado` |

Si las 6 pasan: se marca el QR como `usado`, el invitado como
`ingresado`, y se guarda un registro en `registros_acceso` con la fecha y
hora exactas. Toda esta logica corre **del lado del servidor**; el
navegador que escanea solo envia el texto leido por la camara, nunca se
confia en ningun otro dato que venga del dispositivo.

---

## Seguridad implementada

| Area | Como se resuelve | Donde |
|---|---|---|
| Contrasenas | Hash con bcrypt (costo 12), nunca texto plano | `autenticacion/servicioContrasenas.js` |
| Sesiones | JWT firmado, en cookie `httpOnly` + `sameSite=lax` (no accesible desde JS, mitiga XSS) | `autenticacion/servicioTokens.js`, `autenticacionControlador.js` |
| Roles y permisos | Middleware `autorizarRoles(...)` en cada ruta; minimo privilegio explicito | `seguridad/autenticarPeticion.js` |
| Aislamiento entre clientes | Todo acceso a evento/invitado verifica el `usuario_id` dueno antes de leer/escribir | `eventos/eventosServicio.js`, `invitados/invitadosServicio.js` |
| Validacion de entradas | Esquemas `zod` en cada endpoint que recibe datos | `*Esquemas.js` + `seguridad/validarEsquema.js` |
| Fuerza bruta / abuso | Rate limiting en login y en el escaneo de QR | `seguridad/limitadorPeticiones.js` |
| Cabeceras HTTP | `helmet` (CSP, X-Frame-Options, HSTS, etc.) | `aplicacion.js` |
| CORS | Solo se acepta el origen configurado (`ORIGEN_PERMITIDO`) | `aplicacion.js` |
| Inyeccion SQL | 100% consultas parametrizadas (`better-sqlite3` con placeholders), nunca concatenacion de strings | todos los `*Servicio.js` |
| Exposicion de datos | Las consultas de `usuarios` nunca seleccionan `contrasena_hash` salvo dentro del propio modulo de autenticacion | `clientes/clientesServicio.js`, `seguridad/autenticarPeticion.js` |
| Auditoria | Bitacora de operaciones sensibles (altas, bajas, generacion/regeneracion de QR, inicios de sesion) | `seguridad/registrarAuditoria.js`, tabla `registros_auditoria` |
| Errores | Los errores 500 nunca exponen detalles internos (stack traces, rutas de archivo) al cliente | `seguridad/manejadorErrores.js` |

---

## Referencia de la API

Todas las rutas viven bajo `http://localhost:4000/api`. Las que requieren
sesion esperan la cookie `token_sesion` (el navegador la maneja solo si se
usa `fetch` con `credentials: 'include'`, como hace `clienteApi.js`).

### Autenticacion (`/autenticacion`)

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| POST | `/iniciar-sesion` | publico | Login, deja la cookie de sesion |
| POST | `/cerrar-sesion` | cualquiera | Borra la cookie |
| GET | `/perfil` | cualquiera | Usuario autenticado actual |
| PUT | `/cambiar-contrasena` | solo administrador | Cambia la contrasena propia |
| PUT | `/cambiar-email` | solo administrador | Cambia el email propio |

> El cliente **no** puede cambiar su email ni su contrasena: son datos
> que le asigna el administrador al crear la cuenta (ver seccion 2 de la
> especificacion). Si un cliente necesita cambiarlos, se lo tiene que
> pedir al administrador.

### Eventos (`/eventos`) — solo cliente

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/actual` | El evento activo del cliente (o `null`) |
| GET | `/` | Historial de eventos propios |
| POST | `/` | Crea el evento (falla si ya hay uno activo) |
| PUT | `/:id` | Edita nombre/fecha/hora/lugar |
| GET | `/:id/estadisticas` | Totales para el dashboard |

### Invitados (`/eventos/:eventoId/invitados`, `/invitados/:id`) — solo cliente

CRUD completo + `PATCH /invitados/:id/estado` (pendiente / cancelado /
deshabilitado).

### Codigos QR (`/codigos-qr/invitados/:id/...`) — solo cliente

`generar`, `regenerar`, `activo`, `imagen` (PNG en base64), `historial`.

### Control de acceso (`/control-acceso`) — cliente y administrador

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/escanear` | Valida un `identificadorQr` y registra el resultado |
| GET | `/historial` | Ultimos 500 escaneos del evento |

### Administracion (`/administracion`) — solo administrador

Gestion de clientes (`/clientes`), eventos globales (`/eventos`,
`/eventos/:id`, `/eventos/:id/finalizar`), y supervision
(`/eventos/:id/invitados`, `/eventos/:id/accesos`).

### Registros (`/registros`) — solo administrador

`GET /auditoria`: bitacora completa del sistema.

---

## Guia de mantenimiento

### Ejecutar en produccion

- Backend: `npm start` (o usar un manejador de procesos como `pm2` para
  que se reinicie solo ante un cierre inesperado).
- Configurar `NODE_ENV=produccion` en `.env` para que las cookies de
  sesion exijan HTTPS (`secure: true`).
- Frontend: `npm run build` genera una carpeta `dist/` estatica lista
  para servir con cualquier servidor web (Nginx, Vercel, Netlify, etc.).
  Configurar `VITE_URL_API` apuntando al dominio real del backend antes
  de compilar.
- Hacer copias de seguridad periodicas del archivo
  `backend/datos/sistema.db` (y sus acompanantes `-wal`/`-shm` si el
  proceso esta corriendo).

### Ver y explorar la base de datos

```bash
cd backend
npx --yes sqlite3 datos/sistema.db
sqlite> .tables
sqlite> SELECT * FROM usuarios;
```

(o usar una herramienta grafica como "DB Browser for SQLite" apuntando al
mismo archivo).

### Reiniciar el sistema desde cero

```bash
cd backend
rm -f datos/sistema.db datos/sistema.db-wal datos/sistema.db-shm
npm run sembrar
```

### Logs

- El backend imprime por consola cada error 500 (`[error-interno]`) y
  cualquier excepcion no controlada (`[excepcion-no-capturada]`,
  `[promesa-no-manejada]`) — esto ultimo NO deberia ocurrir nunca en
  operacion normal; si aparece, es sintoma de un bug para corregir en el
  origen (ver `backend/servidor.js`).
- La tabla `registros_auditoria` es el log de negocio (quien hizo que y
  cuando); los logs de consola son el log tecnico (errores del servidor).

### Variables de entorno relevantes

Ver `backend/.env.ejemplo` y `frontend/.env.ejemplo`, ambos comentados
linea por linea.

---

## Como agregar funcionalidad nueva

Gracias a la separacion por modulos, casi cualquier cambio queda contenido
en una sola carpeta:

- **Agregar un campo a "invitados"** (por ejemplo, "empresa"):
  1. Agregar la columna en `basededatos/esquema.sql` (con
     `ALTER TABLE` si ya hay datos, o directamente en la definicion si es
     un proyecto nuevo).
  2. Sumarla al esquema de validacion en `invitados/invitadosEsquemas.js`.
  3. Incluirla en los `INSERT`/`UPDATE` de `invitados/invitadosServicio.js`.
  4. Mostrarla/editarla en
     `frontend/src/paginas/cliente/FormularioInvitado.jsx` y en la tabla
     de `GestionInvitados.jsx`.

- **Agregar un modulo nuevo** (por ejemplo, "notificaciones por email"):
  crear una carpeta `backend/src/notificaciones/` con la misma forma que
  los demas modulos (`*Servicio.js`, `*Controlador.js`, `*Rutas.js`), y
  montarla en `backend/src/aplicacion.js` junto a las demas.

- **Agregar un rol nuevo** (por ejemplo, "staff" con permisos limitados
  para escanear sin ver el resto del panel): sumar el valor al `CHECK` de
  la columna `rol` en `esquema.sql`, y usar
  `autorizarRoles('cliente', 'staff')` en las rutas donde corresponda.

En todos los casos, seguir la regla de oro del proyecto: **la logica de
negocio y el acceso a datos viven en el `*Servicio.js`**, nunca en el
controlador ni en las rutas.

---

## Solucion de problemas frecuentes

**`npm install` falla en Windows con errores de `node-gyp`/`Visual
Studio` al instalar `better-sqlite3`** → este paquete incluye codigo
nativo en C++ que necesita compilarse (o descargarse ya compilado) para
tu version exacta de Node. Si tenes instalada una version de Node muy
nueva (por ejemplo Node 24.x recien salida), puede que todavia no exista
un binario precompilado para ella en Windows, y npm intenta compilarlo el
solo, lo cual requiere Visual Studio con el workload "Desktop development
with C++" (varios GB de descarga).

La solucion mas simple es instalar **Node.js 22 LTS** (la version con la
que se probo este proyecto, marcada como "LTS — Recomendado" en
[nodejs.org](https://nodejs.org)) en lugar de la version mas nueva:

1. Desinstalar la version actual de Node desde "Agregar o quitar
   programas" de Windows.
2. Instalar Node 22 LTS desde nodejs.org.
3. Abrir una terminal **nueva** (para que tome el Node recien instalado).
4. Si la carpeta `backend/node_modules` quedo a medio crear, borrala
   manualmente (cerrando antes cualquier editor/explorador que la tenga
   abierta) y volver a correr `npm install`.

Si preferis mantener tu version actual de Node, la alternativa es
instalar las Visual C++ Build Tools (`winget install --id
Microsoft.VisualStudio.2022.BuildTools`, seleccionando el workload
"Desktop development with C++") para que `node-gyp` pueda compilar el
paquete localmente.

> Tip: si tu carpeta del proyecto esta dentro de una carpeta sincronizada
> por OneDrive (como suele pasar con "Escritorio" en Windows 11), a veces
> OneDrive bloquea archivos mientras los sincroniza y `npm install` no
> puede borrarlos (`EPERM: operation not permitted`). Si ves ese error,
> pausa la sincronizacion de OneDrive un momento y reintenta, o mueve el
> proyecto a una carpeta fuera de OneDrive (por ejemplo `C:\Proyectos\`).

**"No se pudo acceder a la camara" en el escaner** → el navegador necesita
un contexto seguro (HTTPS o `localhost` exactamente) para pedir permiso de
camara. Si estas probando desde el celular contra tu PC en local, esto es
esperado (ver la seccion
[Probar el escaner con la camara del celular](#probar-el-escaner-con-la-camara-del-celular-en-local)
mas abajo). Como alternativa siempre esta el campo de carga manual del
codigo.

**Error 401 apenas se entra a una pagina protegida** → la sesion expiro
(dura 8 horas por defecto, `JWT_DURACION` en `.env`) o se borraron las
cookies. Volver a iniciar sesion.

**"Ya existe un evento activo para esta cuenta"** → un cliente solo puede
tener un evento activo. El administrador debe finalizar el evento
anterior (o el cliente debe esperar a que se finalice) antes de crear uno
nuevo.

**"No se puede eliminar la cuenta mientras tenga un evento activo"** → es
una regla de negocio intencional (ver seccion 2 de la especificacion): el
administrador debe finalizar el evento del cliente antes de eliminar o
desactivar su cuenta.

---

## Probar el escaner con la camara del celular (en local)

Los navegadores solo dejan usar la camara (`getUserMedia`) en un
**"contexto seguro"**: una pagina servida por HTTPS, o la palabra exacta
`localhost`. Cuando abrís el sistema desde tu PC en `http://localhost:5173`
funciona porque cumple esa segunda condicion — pero el celular es OTRO
dispositivo: para el, tu PC es una IP de red (por ejemplo
`http://192.168.0.15:5173`) o una URL externa, nunca "localhost", asi que
el navegador del celular bloquea la camara aunque el sistema este andando
perfecto.

La forma mas simple de probarlo sin desplegar nada es abrir un **tunel
HTTPS temporal** con [ngrok](https://ngrok.com) hacia el frontend:

1. Con el backend y el frontend corriendo en tu PC (`npm run dev` en las
   dos carpetas, como siempre), instala ngrok y crea una cuenta gratis en
   ngrok.com. Seguí las instrucciones de su sitio para el paso
   `ngrok config add-authtoken <tu-token>` (una sola vez).

2. En una tercera terminal, corre:
   ```bash
   ngrok http 5173
   ```

3. ngrok te va a mostrar una URL del tipo
   `https://algo-al-azar.ngrok-free.app`. Esa URL apunta a tu frontend,
   pero por HTTPS real — no hace falta tocar nada mas: gracias al proxy
   configurado en `vite.config.js`, las llamadas a `/api` se siguen
   resolviendo solas contra tu backend local (correlacion
   servidor-a-servidor en tu PC, sin problemas de CORS ni de "contenido
   mixto").

4. Abrí esa URL desde el navegador del celular (funciona por WiFi o por
   datos moviles, no hace falta estar en la misma red). Iniciá sesion
   como el cliente/organizador, entra a **Control de acceso** y toca
   "Activar camara" — el navegador va a pedir el permiso de camara
   normalmente.

> La sesion gratuita de ngrok genera una URL nueva cada vez que la
> reiniciás; para el uso real del sistema (el dia del evento) segui la
> seccion de [despliegue en produccion](#despliegue-en-produccion-con-https),
> que te da un dominio y HTTPS permanentes.

**Alternativa sin depender de un servicio externo** (misma red WiFi,
sin internet): generar un certificado local de confianza con
[mkcert](https://github.com/FiloSottile/mkcert) para la IP de tu PC,
configurar `server.https` en `vite.config.js` con ese certificado, y
entrar desde el celular (conectado a la misma WiFi) a
`https://<IP-de-tu-PC>:5173`. Es mas para dejar preparado que para probar
una sola vez, asi que para un test rapido ngrok es mas directo.

---

## Despliegue en produccion con HTTPS

En tu computadora, corriendo en `localhost`, el sistema funciona por HTTP
plano porque tanto el navegador como el servidor estan en la misma
maquina. Para que quede accesible desde internet con HTTPS real (candado
verde, sin advertencias) hacen falta tres cosas que localhost no tiene:
un **servidor con IP publica**, un **dominio** apuntando a esa IP, y un
**certificado TLS** valido para ese dominio. No se puede "activar HTTPS"
sin eso: no es una opcion de configuracion del codigo, es infraestructura.

### Por que un VPS y no hosting compartido

El backend es un proceso de Node.js que tiene que quedar corriendo todo
el tiempo (no es un sitio "estatico") y escribe en un archivo SQLite en
disco. Para eso conviene un **VPS con acceso root** (podes instalar y
configurar lo que haga falta) en vez de un hosting compartido tradicional
(pensado para PHP/WordPress, con procesos de Node muy limitados o
inexistentes). **Hostinger** es una opcion valida para esto: sus planes
VPS (KVM 1 a KVM 8, desde aproximadamente USD 4.99/mes el mas chico, con
50 GB de disco NVMe) dan acceso root completo, soportan aplicaciones
Node.js sin restricciones, e incluyen certificados SSL gratis de Let's
Encrypt. El dominio se compra aparte (no viene incluido con el VPS,
ronda los USD 10-15/ano). Cualquier otro proveedor de VPS (DigitalOcean,
Linode, un VPS de otro hosting) sirve igual: los pasos de abajo son los
mismos en cualquiera.

> Si ya tenes una cuenta de Hostinger con hosting compartido (no VPS),
> revisa que el plan sea especificamente "VPS" — el hosting compartido
> comun no te va a dejar correr el backend de Node de forma persistente
> ni compilar el modulo nativo `better-sqlite3` que usa este proyecto.

> **¿No queres pagar un hosting todos los meses si no sabes si vas a
> tener eventos?** Oracle Cloud tiene un nivel "Always Free" con una VM
> (2 OCPU / 12 GB RAM) que no cobra nunca, uses o no uses el servidor.
> Los pasos de instalacion de abajo son los mismos; lo unico que cambia
> es de donde sale la maquina. Ver la guia dedicada:
> [`despliegue/oracle-cloud-gratis.md`](despliegue/oracle-cloud-gratis.md).

### Pasos para desplegar

1. **Comprar/apuntar el dominio.** En el panel del dominio, crear un
   registro DNS tipo `A` que apunte al IP publico del VPS.

2. **Conectarse al VPS por SSH** e instalar lo necesario:
   ```bash
   sudo apt update && sudo apt install -y nginx git
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   ```

3. **Subir el proyecto** al VPS (por `git clone` si lo subis a un
   repositorio propio, o con `scp`/`rsync` copiando la carpeta
   `sistema-control-acceso` completa) a `/var/www/sistema-control-acceso`.

4. **Configurar el backend para produccion:**
   ```bash
   cd /var/www/sistema-control-acceso/backend
   cp .env.ejemplo .env
   # Editar .env: NODE_ENV=produccion, JWT_SECRETO nuevo y unico,
   # ORIGEN_PERMITIDO=https://tudominio.com,
   # y las credenciales del administrador inicial.
   npm install --omit=dev
   npm run sembrar
   ```
   Con `NODE_ENV=produccion` la cookie de sesion pasa automaticamente a
   exigir HTTPS (`secure: true`, ver `autenticacionControlador.js`), asi
   que este paso es imprescindible antes de abrir el sistema al publico.

5. **Compilar el frontend** apuntando al dominio real:
   ```bash
   cd /var/www/sistema-control-acceso/frontend
   echo "VITE_URL_API=https://tudominio.com/api" > .env
   npm install
   npm run build
   ```
   Esto genera `frontend/dist/`, una carpeta de archivos estaticos que
   Nginx va a servir directamente (no hace falta "correr" el frontend en
   produccion, a diferencia de `npm run dev`).

6. **Configurar Nginx** como proxy reverso: copiar
   [`despliegue/nginx.conf.ejemplo`](despliegue/nginx.conf.ejemplo),
   reemplazar `tudominio.com` por tu dominio real, y activarlo:
   ```bash
   sudo cp despliegue/nginx.conf.ejemplo /etc/nginx/sites-available/sistema-control-acceso
   sudo ln -s /etc/nginx/sites-available/sistema-control-acceso /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

7. **Activar HTTPS real** con Certbot (genera y renueva solo el
   certificado gratuito de Let's Encrypt, y reescribe la config de Nginx
   para redirigir HTTP → HTTPS):
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d tudominio.com
   ```

8. **Dejar el backend corriendo permanentemente** con PM2 (ver
   [`despliegue/ecosystem.config.cjs`](despliegue/ecosystem.config.cjs)):
   ```bash
   cd /var/www/sistema-control-acceso/despliegue
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```

Con esto, `https://tudominio.com` sirve el frontend, y
`https://tudominio.com/api/...` llega al backend a traves de Nginx —
exactamente el mismo codigo que corriste en local, sin ningun cambio de
logica, solo de configuracion (variables de entorno + proxy).

Sources:
- [Hostinger VPS Pricing 2026: All Plans, Costs and What You Actually Pay](https://smarthostfinder.com/hostinger-vps-pricing/)
