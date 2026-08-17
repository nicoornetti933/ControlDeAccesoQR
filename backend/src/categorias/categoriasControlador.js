const categoriasServicio = require('./categoriasServicio');
const registrarAuditoria = require('../seguridad/registrarAuditoria');

function listarCategorias(req, res) {
  const eventoId = Number(req.params.eventoId);
  const categorias = categoriasServicio.listarCategoriasDeEventoDeUsuario(eventoId, req.usuario.id);
  res.json({ categorias });
}

function crearCategoria(req, res) {
  const eventoId = Number(req.params.eventoId);
  const categoria = categoriasServicio.crearCategoria(eventoId, req.usuario.id, req.body);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'categoria_creada',
    detalle: { categoriaId: categoria.id, eventoId, nombre: categoria.nombre, precio: categoria.precio },
    direccionIp: req.ip,
  });
  res.status(201).json({ categoria });
}

function actualizarCategoria(req, res) {
  const categoriaId = Number(req.params.id);
  const categoria = categoriasServicio.actualizarCategoria(categoriaId, req.usuario.id, req.body);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'categoria_actualizada',
    detalle: { categoriaId },
    direccionIp: req.ip,
  });
  res.json({ categoria });
}

function eliminarCategoria(req, res) {
  const categoriaId = Number(req.params.id);
  categoriasServicio.eliminarCategoria(categoriaId, req.usuario.id);
  registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'categoria_eliminada',
    detalle: { categoriaId },
    direccionIp: req.ip,
  });
  res.status(204).send();
}

module.exports = { listarCategorias, crearCategoria, actualizarCategoria, eliminarCategoria };
