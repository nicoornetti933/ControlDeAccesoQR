import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';
import TarjetaEstadistica from '../../componentes/TarjetaEstadistica.jsx';
import PantallaCarga from '../../componentes/PantallaCarga.jsx';
import FormularioEvento from './FormularioEvento.jsx';
import formatearMoneda from '../../utilidades/formatoMoneda.js';

function PanelCliente() {
  const [evento, setEvento] = useState(undefined); // undefined = cargando, null = no hay evento
  const [estadisticas, setEstadisticas] = useState(null);
  const [error, setError] = useState('');

  const cargarDatos = useCallback(async () => {
    setError('');
    try {
      const { evento: eventoActual } = await clienteApi.obtener('/eventos/actual');
      setEvento(eventoActual);
      if (eventoActual) {
        const { estadisticas: datosEstadisticas } = await clienteApi.obtener(
          `/eventos/${eventoActual.id}/estadisticas`
        );
        setEstadisticas(datosEstadisticas);
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (evento === undefined) {
    return <PantallaCarga mensaje="Cargando tu evento..." />;
  }

  if (evento === null) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="tarjeta">
          <h2 className="text-lg font-bold text-slate-900">Crea tu evento</h2>
          <p className="mt-1 text-sm text-slate-500">
            Todavia no tenes un evento activo. Completá los datos para empezar a cargar invitados.
          </p>
          <div className="mt-5">
            <AvisoError mensaje={error} />
          </div>
          <FormularioEvento alGuardar={cargarDatos} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AvisoError mensaje={error} />

      <div className="tarjeta flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-marca-500">
            Evento activo
          </p>
          <h2 className="text-xl font-bold text-slate-900">{evento.nombre}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {evento.fecha} · {evento.hora} hs · {evento.lugar}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/cliente/invitados" className="boton-primario">
            Gestionar invitados
          </Link>
          <Link to="/cliente/escaner" className="boton-secundario">
            Control de acceso
          </Link>
        </div>
      </div>

      {estadisticas && (
        <>
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
            <div className="tarjeta">
              <div className="mb-4 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                <h3 className="text-base font-bold text-slate-900">Recaudacion</h3>
                <Link to="/cliente/categorias" className="text-xs font-semibold text-marca-600 hover:underline">
                  Gestionar categorias
                </Link>
              </div>
              <TarjetaEstadistica
                etiqueta="Total recaudado"
                valor={formatearMoneda(estadisticas.recaudacion.total)}
                colorTexto="text-emerald-600"
                icono="💰"
              />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2">Categoria</th>
                      <th className="py-2">Precio</th>
                      <th className="py-2">Invitados</th>
                      <th className="py-2">Ingresaron</th>
                      <th className="py-2">Recaudado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {estadisticas.recaudacion.porCategoria.map((categoria) => (
                      <tr key={categoria.categoriaId}>
                        <td className="py-2 font-medium text-slate-800">{categoria.nombre}</td>
                        <td className="py-2 text-slate-500">{formatearMoneda(categoria.precio)}</td>
                        <td className="py-2 text-slate-500">{categoria.cantidadInvitados}</td>
                        <td className="py-2 text-slate-500">{categoria.cantidadIngresados}</td>
                        <td className="py-2 text-slate-500">{formatearMoneda(categoria.recaudado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div className="tarjeta">
        <h3 className="mb-4 text-base font-bold text-slate-900">Datos del evento</h3>
        <FormularioEvento evento={evento} alGuardar={cargarDatos} />
      </div>
    </div>
  );
}

export default PanelCliente;
