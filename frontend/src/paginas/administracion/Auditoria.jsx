import React, { useCallback, useEffect, useState } from 'react';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';
import PantallaCarga from '../../componentes/PantallaCarga.jsx';

function Auditoria() {
  const [registros, setRegistros] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const { auditoria } = await clienteApi.obtener('/registros/auditoria');
      setRegistros(auditoria);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (registros === null) return <PantallaCarga mensaje="Cargando auditoria..." />;

  return (
    <div className="space-y-5">
      <AvisoError mensaje={error} />
      <div>
        <h2 className="text-lg font-bold text-slate-900">Bitacora de auditoria</h2>
        <p className="text-sm text-slate-500">
          Operaciones sensibles registradas por el sistema (inicios de sesion, altas, cambios de
          estado, generacion de QR, etc.).
        </p>
      </div>

      <div className="tarjeta overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Accion</th>
              <th className="px-4 py-3">Detalle</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {registros.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Todavia no hay registros.
                </td>
              </tr>
            )}
            {registros.map((registro) => (
              <tr key={registro.id}>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(registro.creado_en).toLocaleString('es-AR')}
                </td>
                <td className="px-4 py-3 text-slate-500">{registro.usuario_email || 'Sistema'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{registro.accion}</td>
                <td className="px-4 py-3 text-slate-500">
                  <code className="text-xs">{registro.detalle}</code>
                </td>
                <td className="px-4 py-3 text-slate-500">{registro.direccion_ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Auditoria;
