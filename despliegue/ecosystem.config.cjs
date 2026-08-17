/**
 * Configuracion de PM2 para mantener el backend corriendo en segundo
 * plano en el servidor, reiniciandolo solo si se cae y al reiniciar la
 * maquina.
 *
 * Instalacion en el VPS (una sola vez):
 *   npm install -g pm2
 *
 * Uso (parado en la carpeta "despliegue/"):
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup   (sigue las instrucciones que imprime para que arranque
 *                  solo con el servidor)
 *
 * Para ver logs:   pm2 logs sistema-control-acceso-api
 * Para reiniciar:  pm2 restart sistema-control-acceso-api
 */

module.exports = {
  apps: [
    {
      name: 'sistema-control-acceso-api',
      cwd: '/var/www/sistema-control-acceso/backend',
      script: 'servidor.js',
      env: {
        NODE_ENV: 'produccion',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
