import React from 'react';

function TarjetaEstadistica({ etiqueta, valor, colorTexto = 'text-marca-700', icono }) {
  return (
    <div className="tarjeta flex items-center gap-4">
      {icono && (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-marca-50 text-marca-600">
          {icono}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-slate-500">{etiqueta}</p>
        <p className={`text-2xl font-bold ${colorTexto}`}>{valor}</p>
      </div>
    </div>
  );
}

export default TarjetaEstadistica;
