import React from 'react';

function AvisoError({ mensaje }) {
  if (!mensaje) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
      {mensaje}
    </div>
  );
}

export default AvisoError;
