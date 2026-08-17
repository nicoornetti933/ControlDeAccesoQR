import React from 'react';

function PantallaCarga({ mensaje = 'Cargando...' }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-marca-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-marca-200 border-t-marca-600" />
        <p className="text-sm font-medium text-marca-700">{mensaje}</p>
      </div>
    </div>
  );
}

export default PantallaCarga;
