# Desplegar en Render

Esta guia complementa la seccion ["Despliegue en produccion con
HTTPS"](../README.md#despliegue-en-produccion-con-https) del README
principal. Render es mas simple que armar un servidor propio (no hay que
tocar Nginx, Certbot ni PM2: Render se encarga de todo eso), a cambio de
un costo mensual fijo. Si preferis no pagar nada, mira la alternativa
["Desplegar gratis en Oracle Cloud"](./oracle-cloud-gratis.md).

## Antes que nada: por que no sirve el plan Free de Render para este sistema

Render ofrece un plan **Free** ($0/mes), pero **no es compatible con este
sistema** y no lo recomiendo, por dos motivos:

1. **Disco efimero.** En el plan Free no se puede agregar un "persistent
   disk". Eso significa que el archivo de la base de datos
   (`backend/datos/sistema.db`, con todos tus clientes, eventos e
   invitados) se **borra por completo** cada vez que el servicio se
   reinicia o se vuelve a desplegar.
2. **Se "duerme" solo.** Un servicio Free se apaga automaticamente
   despues de 15 minutos sin trafico, y cada vez que se "despierta" es,
   en los hechos, un reinicio — es decir, otra oportunidad de perder todo
   lo cargado.

Juntar "se borra la base de datos" con "se reinicia solo cada 15
minutos de inactividad" es exactamente el tipo de perdida de datos que
ya tuvimos que solucionar una vez en este proyecto. Por eso la unica
opcion razonable en Render es un plan pago con disco persistente (ver
costos mas abajo).

## Arquitectura: un unico servicio

A diferencia de lo que se podria pensar, **no** conviene desplegar el
backend y el frontend como dos servicios separados de Render (un "Web
Service" + un "Static Site"). El motivo es tecnico: cada servicio de
Render queda en un subdominio distinto de `onrender.com`, y no hay
garantia de que la cookie de sesion viaje correctamente entre dos
subdominios distintos de un dominio compartido con terceros.

Para evitar ese problema de raiz, el backend ahora puede servir el
frontend ya compilado directamente (ver `backend/src/aplicacion.js`):
con un solo comando de build que compila el frontend y deja el backend
sirviendo tanto la interfaz como la API, todo en el mismo origen — igual
que ya pasa en desarrollo (con el proxy de Vite) y en el despliegue con
Nginx. Esto es mas simple y evita cualquier problema de cookies o CORS
entre subdominios.

## 1. Subir el proyecto a GitHub

Render despliega leyendo un repositorio de GitHub (o GitLab/Bitbucket).
Si todavia no lo subiste, segui los pasos que ya vimos: `git init`,
`git add .`, `git commit`, crear el repo en GitHub y `git push`. El
`.gitignore` del proyecto ya excluye `node_modules`, `.env`, la base de
datos y los respaldos — no hace falta limpiar nada a mano.

## 2. Crear el servicio en Render

1. Entra a [render.com](https://render.com) y crea una cuenta (podes
   registrarte con tu cuenta de GitHub directamente).
2. **New → Web Service**.
3. Conecta el repositorio `sistema-control-acceso` de GitHub.
4. Configuralo asi:
   - **Root Directory**: dejalo vacio (raiz del repositorio).
   - **Runtime**: `Node`.
   - **Build Command**:
     ```
     npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend
     ```
   - **Start Command**:
     ```
     npm start --prefix backend
     ```
   - **Instance Type**: **Starter** (u$s 7/mes). Es el plan pago mas
     barato y el minimo necesario para poder agregar un disco
     persistente (el plan Free no lo permite, ver arriba).
   - **Health Check Path**: `/api/salud`

## 3. Agregar el disco persistente

Sin este paso, el sistema funciona pero pierde todos los datos en cada
reinicio — es el paso mas importante de toda la guia.

1. Dentro del servicio recien creado, ir a la pestana **Disks → Add
   Disk**.
2. Nombre: `datos` (o el que quieras).
3. **Mount Path**: `/var/data`
4. Tamano: **1 GB** alcanza de sobra para este sistema (la base de datos
   y los respaldos automaticos pesan poco). Cuesta u$s 0.25/mes por GB.

## 4. Variables de entorno

En la pestana **Environment**, agregar:

| Variable | Valor | Para que sirve |
|---|---|---|
| `NODE_ENV` | `produccion` | Activa cookies seguras (HTTPS) y oculta detalles de errores internos. |
| `JWT_SECRETO` | *(generar una nueva, ver abajo)* | Firma las sesiones. Nunca reutilices la de tu PC. |
| `JWT_DURACION` | `8h` | Duracion de la sesion. |
| `RUTA_BASE_DATOS` | `/var/data/sistema.db` | Guarda la base de datos en el disco persistente, no en el disco efimero del servicio. |
| `RUTA_CARPETA_RESPALDOS` | `/var/data/respaldos` | Idem, para los respaldos automaticos. |
| `ADMIN_EMAIL_INICIAL` | *(el que quieras)* | Solo se usa la primera vez, para crear el administrador. |
| `ADMIN_PASSWORD_INICIAL` | *(una contrasena fuerte)* | Idem. Cambiala desde "Mi cuenta" apenas entres. |

No hace falta configurar `PUERTO` ni `ORIGEN_PERMITIDO`: Render define
automaticamente la variable `PORT` (el sistema ya la reconoce) y, al ser
todo un unico origen, no hace falta permitir ningun otro dominio por
CORS.

Para generar un `JWT_SECRETO` nuevo y aleatorio, corré este comando en tu
PC:
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 5. Primer despliegue y creacion del administrador

1. Guardar la configuracion: Render va a construir y desplegar el
   servicio automaticamente (tarda unos minutos la primera vez).
2. Una vez que este "Live", ir a la pestana **Shell** (disponible en
   planes pagos) y correr:
   ```
   npm run sembrar --prefix backend
   ```
   Esto crea el usuario administrador inicial con el email/contrasena
   que configuraste en el paso anterior.
3. Entrar a la URL que te asigno Render (algo como
   `https://sistema-control-acceso.onrender.com`) e iniciar sesion.

## 6. Actualizaciones futuras

Cada `git push` a la rama principal dispara un nuevo despliegue
automatico en Render (se puede desactivar el auto-deploy si preferis
aprobarlo a mano desde el dashboard). El disco persistente (`/var/data`)
no se toca entre despliegues: tu base de datos y tus respaldos quedan
intactos.

## Costo mensual aproximado

- Web Service (Starter): u$s 7.00
- Disco persistente (1 GB): u$s 0.25
- **Total: ~u$s 7.25/mes**

Si el costo es un problema y el sistema se usa con poca frecuencia (unos
pocos eventos por año), la alternativa gratuita de [Oracle
Cloud](./oracle-cloud-gratis.md) sigue siendo la opcion mas economica,
aunque requiere mas trabajo manual de configuracion inicial.
