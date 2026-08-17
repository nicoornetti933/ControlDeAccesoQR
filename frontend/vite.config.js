import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuracion de Vite: servidor de desarrollo en el puerto 5173
// (coincide con ORIGEN_PERMITIDO del backend por defecto).
//
// "server.proxy" reenvia toda peticion a "/api" hacia el backend
// (puerto 4000) desde el propio servidor de Vite (Node, en la misma PC).
// Gracias a esto el navegador SIEMPRE ve un unico origen (el del
// frontend), sin importar si se accede por "localhost", por la IP de la
// red local (para probar desde el celular) o por una URL de tunel como
// ngrok: no hay problemas de CORS ni de "contenido mixto" (HTTPS
// llamando a HTTP), porque el reenvio al backend ocurre servidor-a-servidor,
// no navegador-a-servidor.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // escucha en 0.0.0.0: accesible desde otros dispositivos de la red local
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
