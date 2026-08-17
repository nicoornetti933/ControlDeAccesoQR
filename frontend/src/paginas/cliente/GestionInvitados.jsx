import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';
import PantallaCarga from '../../componentes/PantallaCarga.jsx';
import InsigniaEstado from '../../componentes/InsigniaEstado.jsx';
import VentanaModal from '../../componentes/VentanaModal.jsx';
import FormularioInvitado from './FormularioInvitado.jsx';
import ModalCodigoQr from './ModalCodigoQr.jsx';
import formatearMoneda from '../../utilidades/formatoMoneda.js';

function GestionInvitados() {
  const [eventoId, setEventoId] = useState(undefined);
  const [invitados, setInvitados] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [invitadoEnEdicion, setInvitadoEnEdicion] = useState(null);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [invitadoParaQr, setInvitadoParaQr] = useState(null);

  const cargarInvitados = useCallback(async (idEvento) => {
    const { invitados: lista } = await clienteApi.obtener(`/eventos/${idEvento}/invitados`);
    setInvitados(lista);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { evento } = await clienteApi.obtener('/eventos/actual');
        if (!evento) {
          setError('Primero tenes que crear tu evento desde el Panel.');
          setCargando(false);
          return;
        }
        setEventoId(evento.id);
        await cargarInvitados(evento.id);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    })();
  }, [cargarInvitados]);

  async function manejarCambioEstado(invitado, nuevoEstado) {
    try {
      await clienteApi.parchear(`/invitados/${invitado.id}/estado`, { estado: nuevoEstado });
      await cargarInvitados(eventoId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function manejarEliminar(invitado) {
    if (!window.confirm(`¿Eliminar a ${invitado.nombre} ${invitado.apellido}? Esta accion no se puede deshacer.`)) {
      return;
    }
    try {
      await clienteApi.eliminar(`/invitados/${invitado.id}`);
      await cargarInvitados(eventoId);
    } catch (err) {
      setError(err.message);
    }
  }

  function abrirFormularioNuevo() {
    setInvitadoEnEdicion(null);
    setFormularioAbierto(true);
  }

  function abrirFormularioEdicion(invitado) {
    setInvitadoEnEdicion(invitado);
    setFormularioAbierto(true);
  }

  const invitadosFiltrados = invitados.filter((invitado) => {
    const texto = `${invitado.nombre} ${invitado.apellido} ${invitado.dni}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  if (cargando) return <PantallaCarga mensaje="Cargando invitados..." />;

  if (!eventoId) {
    return <AvisoError mensaje={error} />;
  }

  return (
    <div className="space-y-5">
      <AvisoError mensaje={error} />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <input
          className="campo-formulario sm:max-w-xs"
          placeholder="Buscar por nombre, apellido o DNI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="flex gap-2">
          <Link to="/cliente/categorias" className="boton-secundario">
            Categorias
          </Link>
          <button type="button" className="boton-primario" onClick={abrirFormularioNuevo}>
            + Agregar invitado
          </button>
        </div>
      </div>

      <div className="tarjeta overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Invitado</th>
              <th className="px-4 py-3">DNI</th>
              <th className="px-4 py-3">Telefono</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {invitadosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No hay invitados que coincidan con la busqueda.
                </td>
              </tr>
            )}
            {invitadosFiltrados.map((invitado) => (
              <tr key={invitado.id} className="hover:bg-marca-50/40">
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
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-marca-600 hover:underline"
                      onClick={() => setInvitadoParaQr(invitado)}
                    >
                      QR
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-500 hover:underline"
                      onClick={() => abrirFormularioEdicion(invitado)}
                    >
                      Editar
                    </button>
                    {invitado.estado !== 'cancelado' && invitado.estado !== 'ingresado' && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-amber-600 hover:underline"
                        onClick={() => manejarCambioEstado(invitado, 'cancelado')}
                      >
                        Cancelar
                      </button>
                    )}
                    {invitado.estado === 'deshabilitado' ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-emerald-600 hover:underline"
                        onClick={() => manejarCambioEstado(invitado, 'pendiente')}
                      >
                        Habilitar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600 hover:underline"
                        onClick={() => manejarCambioEstado(invitado, 'deshabilitado')}
                      >
                        Deshabilitar
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-xs font-semibold text-rose-600 hover:underline"
                      onClick={() => manejarEliminar(invitado)}
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
        titulo={invitadoEnEdicion ? 'Editar invitado' : 'Nuevo invitado'}
        abierta={formularioAbierto}
        alCerrar={() => setFormularioAbierto(false)}
      >
        <FormularioInvitado
          eventoId={eventoId}
          invitado={invitadoEnEdicion}
          alGuardar={async () => {
            setFormularioAbierto(false);
            await cargarInvitados(eventoId);
          }}
        />
      </VentanaModal>

      {invitadoParaQr && (
        <ModalCodigoQr invitado={invitadoParaQr} alCerrar={() => setInvitadoParaQr(null)} />
      )}
    </div>
  );
}

export default GestionInvitados;
