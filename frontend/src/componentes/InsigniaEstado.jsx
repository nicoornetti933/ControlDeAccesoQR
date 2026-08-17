import React from 'react';

// Mapa centralizado de colores por estado para que todo el sistema use
// la misma paleta semantica (verde = bien, amarillo = pendiente, etc.).
const ESTILOS_POR_ESTADO = {
  pendiente: 'bg-amber-100 text-amber-800',
  ingresado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-slate-200 text-slate-700',
  deshabilitado: 'bg-rose-100 text-rose-800',
  activo: 'bg-emerald-100 text-emerald-800',
  usado: 'bg-slate-200 text-slate-700',
  invalidado: 'bg-rose-100 text-rose-800',
  finalizado: 'bg-slate-200 text-slate-700',
  autorizado: 'bg-emerald-100 text-emerald-800',
  rechazado: 'bg-rose-100 text-rose-800',
};

const ETIQUETAS_POR_ESTADO = {
  pendiente: 'Pendiente',
  ingresado: 'Ingreso',
  cancelado: 'Cancelado',
  deshabilitado: 'Deshabilitado',
  activo: 'Activo',
  usado: 'Usado',
  invalidado: 'Invalidado',
  finalizado: 'Finalizado',
  autorizado: 'Autorizado',
  rechazado: 'Rechazado',
};

function InsigniaEstado({ estado }) {
  const estilos = ESTILOS_POR_ESTADO[estado] || 'bg-slate-100 text-slate-700';
  const etiqueta = ETIQUETAS_POR_ESTADO[estado] || estado;
  return <span className={`insignia ${estilos}`}>{etiqueta}</span>;
}

export default InsigniaEstado;
