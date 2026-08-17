const registrosServicio = require('./registrosServicio');

function listarAuditoria(req, res) {
  res.json({ auditoria: registrosServicio.listarAuditoria() });
}

module.exports = { listarAuditoria };
