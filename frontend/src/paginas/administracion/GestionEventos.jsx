import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';
import PantallaCarga from '../../componentes/PantallaCarga.jsx';
import InsigniaEstado from '../../componentes/InsigniaEstado.jsx';

function GestionEventos() {
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState('');

  const cargarEventos = useCallback(async () => {
    try {
      const { eventos: lista } = await clienteApi.obtener('/administracion/eventos');
      setEventos(lista);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  async function finalizarEvento(evento) {
    if (
      !window.confirm(
        `¿Finalizar "${evento.nombre}"? Una vez finalizado no se podran agregar ni modificar invitados.`
      )
    ) {
      return;
    }
    setError('');
    try {
      await clienteApi.actualizar(`/administracion/eventos/${evento.id}/finalizar`);
      await cargarEventos();
    } catch (err) {
      setError(err.message);
    }
  }

  if (eventos === null) return <PantallaCarga mensaje="Cargando eventos..." />;

  return (
    <div className="space-y-5">
      <AvisoError mensaje={error} />

      <div>
        <h2 className="text-lg font-bold text-slate-900">Todos los eventos</h2>
        <p className="text-sm text-slate-500">Supervisa cualquier evento del sistema.</p>
      </div>

      <div className="tarjeta overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {eventos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Todavia no hay eventos creados.
                </td>
              </tr>
            )}
            {eventos.map((evento) => (
              <tr key={evento.id} className="hover:bg-marca-50/40">
                <td className="px-4 py-3 font-medium text-slate-800">{evento.nombre}</td>
                <td className="px-4 py-3 text-slate-500">
                  {evento.nombre_cliente}
                  {evento.nombre_organizacion ? ` · ${evento.nombre_organizacion}` : ''}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {evento.fecha} {evento.hora}
                </td>
                <td className="px-4 py-3">
                  <InsigniaEstado estado={evento.estado} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <Link
                      to={`/administracion/eventos/${evento.id}`}
                      className="text-xs font-semibold text-marca-600 hover:underline"
                    >
                      Ver detalle
                    </Link>
                    {evento.estado === 'activo' && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600 hover:underline"
                        onClick={() => finalizarEvento(evento)}
                      >
                        Finalizar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GestionEventos;
