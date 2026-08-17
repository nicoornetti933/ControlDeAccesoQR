import React, { useCallback, useEffect, useState } from 'react';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';
import PantallaCarga from '../../componentes/PantallaCarga.jsx';
import InsigniaEstado from '../../componentes/InsigniaEstado.jsx';
import VentanaModal from '../../componentes/VentanaModal.jsx';
import FormularioCliente from './FormularioCliente.jsx';

function GestionClientes() {
  const [clientes, setClientes] = useState(null);
  const [error, setError] = useState('');
  const [formularioAbierto, setFormularioAbierto] = useState(false);

  const cargarClientes = useCallback(async () => {
    try {
      const { clientes: lista } = await clienteApi.obtener('/administracion/clientes');
      setClientes(lista);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  async function alternarEstado(cliente) {
    setError('');
    try {
      await clienteApi.parchear(`/administracion/clientes/${cliente.id}/estado`, {
        activo: !cliente.activo,
      });
      await cargarClientes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminarCliente(cliente) {
    if (
      !window.confirm(
        `¿Eliminar la cuenta de ${cliente.nombre_completo}? Esto borra su evento e invitados. Solo es posible si no tiene un evento activo.`
      )
    ) {
      return;
    }
    setError('');
    try {
      await clienteApi.eliminar(`/administracion/clientes/${cliente.id}`);
      await cargarClientes();
    } catch (err) {
      setError(err.message);
    }
  }

  if (clientes === null) return <PantallaCarga mensaje="Cargando clientes..." />;

  return (
    <div className="space-y-5">
      <AvisoError mensaje={error} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Clientes / organizadores</h2>
          <p className="text-sm text-slate-500">Crea cuentas y controla el acceso al sistema.</p>
        </div>
        <button type="button" className="boton-primario" onClick={() => setFormularioAbierto(true)}>
          + Nuevo cliente
        </button>
      </div>

      <div className="tarjeta overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Organizacion</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {clientes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Todavia no creaste ningun cliente.
                </td>
              </tr>
            )}
            {clientes.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-marca-50/40">
                <td className="px-4 py-3 font-medium text-slate-800">{cliente.nombre_completo}</td>
                <td className="px-4 py-3 text-slate-500">{cliente.email}</td>
                <td className="px-4 py-3 text-slate-500">{cliente.nombre_organizacion || '—'}</td>
                <td className="px-4 py-3">
                  <InsigniaEstado estado={cliente.activo ? 'activo' : 'deshabilitado'} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-marca-600 hover:underline"
                      onClick={() => alternarEstado(cliente)}
                    >
                      {cliente.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-rose-600 hover:underline"
                      onClick={() => eliminarCliente(cliente)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <VentanaModal
        titulo="Nuevo cliente"
        abierta={formularioAbierto}
        alCerrar={() => setFormularioAbierto(false)}
      >
        <FormularioCliente
          alGuardar={async () => {
            setFormularioAbierto(false);
            await cargarClientes();
          }}
        />
      </VentanaModal>
    </div>
  );
}

export default GestionClientes;
