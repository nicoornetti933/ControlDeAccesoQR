import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';
import PantallaCarga from '../../componentes/PantallaCarga.jsx';
import InsigniaEstado from '../../componentes/InsigniaEstado.jsx';
import TarjetaEstadistica from '../../componentes/TarjetaEstadistica.jsx';
import formatearMoneda from '../../utilidades/formatoMoneda.js';

function DetalleEvento() {
  const { eventoId } = useParams();
  const [datos, setDatos] = useState(null);
  const [invitados, setInvitados] = useState([]);
  const [accesos, setAccesos] = useState([]);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('invitados');

  const cargar = useCallback(async () => {
    try {
      const [detalle, listaInvitados, historialAccesos] = await Promise.all([
        clienteApi.obtener(`/administracion/eventos/${eventoId}`),
        clienteApi.obtener(`/administracion/eventos/${eventoId}/invitados`),
        clienteApi.obtener(`/administracion/eventos/${eventoId}/accesos`),
      ]);
      setDatos(detalle);
      setInvitados(listaInvitados.invitados);
      setAccesos(historialAccesos.historial);
    } catch (err) {
      setError(err.message);
    }
  }, [eventoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function finalizarEvento() {
    if (!window.confirm('¿Finalizar este evento?')) return;
    try {
      await clienteApi.actualizar(`/administracion/eventos/${eventoId}/finalizar`);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <AvisoError mensaje={error} />;
  if (!datos) return <PantallaCarga mensaje="Cargando evento..." />;

  const { evento, estadisticas } = datos;

  return (
    <div className="space-y-6">
      <div className="tarjeta flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{evento.nombre}</h2>
            <InsigniaEstado estado={evento.estado} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {evento.fecha} · {evento.hora} hs · {evento.lugar}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Organizador: {evento.nombre_cliente || '—'}
          </p>
        </div>
        {evento.estado === 'activo' && (
          <button type="button" className="boton-peligro" onClick={finalizarEvento}>
            Finalizar evento
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TarjetaEstadistica etiqueta="Total invitados" valor={estadisticas.totalInvitados} icono="🧾" />
        <TarjetaEstadistica
          etiqueta="Ingresaron"
          valor={estadisticas.ingresados}
          colorTexto="text-emerald-600"
          icono="✅"
        />
        <TarjetaEstadistica
          etiqueta="Pendientes"
          valor={estadisticas.pendientes}
          colorTexto="text-amber-600"
          icono="⏳"
        />
        <TarjetaEstadistica
          etiqueta="Cancelados"
          valor={estadisticas.cancelados}
          colorTexto="text-slate-500"
          icono="🚫"
        />
      </div>

      {estadisticas.recaudacion.porCategoria.length > 0 && (
        <TarjetaEstadistica
          etiqueta="Recaudacion"
          valor={formatearMoneda(estadisticas.recaudacion.total)}
          colorTexto="text-emerald-600"
          icono="💰"
        />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPestana('invitados')}
          className={pestana === 'invitados' ? 'boton-primario' : 'boton-secundario'}
        >
          Invitados
        </button>
        <button
          type="button"
          onClick={() => setPestana('accesos')}
          className={pestana === 'accesos' ? 'boton-primario' : 'boton-secundario'}
        >
          Registro de accesos
        </button>
      </div>

      {pestana === 'invitados' && (
        <div className="tarjeta overflow-x-auto p-0">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invitado</th>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Telefono</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invitados.map((invitado) => (
                <tr key={invitado.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {invitado.nombre} {invitado.apellido}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{invitado.dni}</td>
                  <td className="px-4 py-3 text-slate-500">{invitado.telefono}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {invitado.categoria_nombre
                      ? `${invitado.categoria_nombre} · ${formatearMoneda(invitado.categoria_precio)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <InsigniaEstado estado={invitado.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pestana === 'accesos' && (
        <div className="tarjeta overflow-x-auto p-0">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invitado</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Fecha y hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {accesos.map((registro) => (
                <tr key={registro.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {registro.nombre ? `${registro.nombre} ${registro.apellido}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <InsigniaEstado estado={registro.resultado} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{registro.motivo}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(registro.fecha_hora).toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DetalleEvento;
