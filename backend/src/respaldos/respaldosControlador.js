const respaldosServicio = require('./respaldosServicio');

function listarRespaldos(req, res) {
  res.json({ respaldos: respaldosServicio.listarRespaldos() });
}

async function crearRespaldoManual(req, res) {
  const respaldo = await respaldosServicio.crearRespaldo({
    origen: 'manual',
    usuarioId: req.usuario.id,
    direccionIp: req.ip,
  });
  res.status(201).json({ respaldo });
}

module.exports = { listarRespaldos, crearRespaldoManual };
