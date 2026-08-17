/**
 * Cliente HTTP centralizado para hablar con el backend.
 *
 * Toda peticion incluye "credentials: include" para que el navegador
 * envie la cookie httpOnly de sesion. Ningun otro modulo del frontend
 * debe usar "fetch" directamente: pasar siempre por aca mantiene un
 * unico lugar donde se maneja la URL base y el formato de errores.
 *
 * Por defecto se usa la ruta RELATIVA "/api": tanto en desarrollo (via el
 * proxy configurado en vite.config.js) como en produccion (via el proxy
 * de Nginx, ver despliegue/nginx.conf.ejemplo) el frontend y el backend
 * quedan detras de un unico origen. Esto evita problemas de CORS y de
 * "contenido mixto", y hace que el sistema funcione igual sin importar
 * si se accede por localhost, por la IP de la red local (para probar con
 * el celular) o por una URL de tunel (ngrok, etc.). Solo hace falta
 * definir VITE_URL_API si el frontend y el backend NO estan detras del
 * mismo proxy.
 */

const URL_BASE = import.meta.env.VITE_URL_API || '/api';

class ErrorApi extends Error {
  constructor(mensaje, codigoEstado, detalles) {
    super(mensaje);
    this.codigoEstado = codigoEstado;
    this.detalles = detalles;
  }
}

async function peticion(ruta, opciones = {}) {
  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    credentials: 'include',
    headers: {
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
      ...opciones.headers,
    },
    ...opciones,
  });

  const esJson = respuesta.headers.get('content-type')?.includes('application/json');
  const cuerpo = esJson ? await respuesta.json().catch(() => null) : null;

  if (!respuesta.ok) {
    // Cuando el error viene de una validacion (ver validarEsquema.js en
    // el backend), "cuerpo.detalles" trae el mensaje especifico de cada
    // campo (ej: "La fecha debe tener el formato AAAA-MM-DD."). Antes
    // ese detalle se recibia pero nunca se mostraba: todos los
    // formularios de la app terminaban mostrando el mismo mensaje
    // generico ("Los datos enviados no son validos.") sin decir cual
    // era el problema real. Se arma aca, en un unico lugar, para que
    // todos los formularios lo hereden automaticamente.
    const detalles = Array.isArray(cuerpo?.detalles) ? cuerpo.detalles : null;
    const mensaje =
      detalles && detalles.length > 0
        ? detalles.map((detalle) => detalle.mensaje).join(' ')
        : cuerpo?.error || 'Ocurrio un error inesperado. Intenta nuevamente.';

    throw new ErrorApi(mensaje, respuesta.status, detalles);
  }

  return cuerpo;
}

const clienteApi = {
  obtener: (ruta) => peticion(ruta, { method: 'GET' }),
  publicar: (ruta, datos) => peticion(ruta, { method: 'POST', body: JSON.stringify(datos) }),
  actualizar: (ruta, datos) => peticion(ruta, { method: 'PUT', body: JSON.stringify(datos) }),
  parchear: (ruta, datos) => peticion(ruta, { method: 'PATCH', body: JSON.stringify(datos) }),
  eliminar: (ruta) => peticion(ruta, { method: 'DELETE' }),
};

export { ErrorApi };
export default clienteApi;
