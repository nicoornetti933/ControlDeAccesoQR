import React, { useCallback, useEffect, useState } from 'react';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';
import PantallaCarga from '../../componentes/PantallaCarga.jsx';
import formatearMoneda from '../../utilidades/formatoMoneda.js';

// Gestion de categorias personalizadas del evento activo (ej: "General",
// "VIP", "Palco"), cada una con su propio precio. Estas categorias se
// eligen despues al cargar cada invitado (ver FormularioInvitado.jsx) y
// se usan para estimar la recaudacion del evento (ver PanelCliente.jsx).
function GestionCategorias() {
  const [eventoId, setEventoId] = useState(undefined);
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargarCategorias = useCallback(async (idEvento) => {
    const { categorias: lista } = await clienteApi.obtener(`/eventos/${idEvento}/categorias`);
    setCategorias(lista);
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
        await cargarCategorias(evento.id);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    })();
  }, [cargarCategorias]);

  async function manejarEliminar(categoria) {
    if (
      !window.confirm(
        `¿Eliminar la categoria "${categoria.nombre}"? Los invitados que la tengan asignada quedaran sin categoria.`
      )
    ) {
      return;
    }
    try {
      await clienteApi.eliminar(`/categorias/${categoria.id}`);
      await cargarCategorias(eventoId);
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) return <PantallaCarga mensaje="Cargando categorias..." />;

  if (!eventoId) {
    return <AvisoError mensaje={error} />;
  }

  return (
    <div className="space-y-5">
      <AvisoError mensaje={error} />

      <div>
        <h2 className="text-lg font-bold text-slate-900">Categorias del evento</h2>
        <p className="text-sm text-slate-500">
          Crea las categorias de entrada de tu evento (ej: General, VIP, Palco) con su precio. Despues
          las podes asignar a cada invitado desde la seccion "Invitados".
        </p>
      </div>

      <FormularioNuevaCategoria
        eventoId={eventoId}
        alGuardar={() => cargarCategorias(eventoId)}
        alError={setError}
      />

      <div className="tarjeta overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {categorias.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  Todavia no creaste ninguna categoria.
                </td>
              </tr>
            )}
            {categorias.map((categoria) => (
              <FilaCategoria
                key={categoria.id}
                categoria={categoria}
                alGuardar={() => cargarCategorias(eventoId)}
                alEliminar={() => manejarEliminar(categoria)}
                alError={setError}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormularioNuevaCategoria({ eventoId, alGuardar, alError }) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    alError('');
    setEnviando(true);
    try {
      await clienteApi.publicar(`/eventos/${eventoId}/categorias`, {
        nombre,
        precio: Number(precio),
      });
      setNombre('');
      setPrecio('');
      await alGuardar();
    } catch (err) {
      alError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="tarjeta flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="etiqueta-formulario" htmlFor="nombreCategoria">
          Nombre de la categoria
        </label>
        <input
          id="nombreCategoria"
          required
          maxLength={60}
          className="campo-formulario"
          placeholder="Ej: VIP"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>
      <div className="sm:w-40">
        <label className="etiqueta-formulario" htmlFor="precioCategoria">
          Precio
        </label>
        <input
          id="precioCategoria"
          type="number"
          required
          min="0"
          step="0.01"
          className="campo-formulario"
          placeholder="0"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />
      </div>
      <button type="submit" disabled={enviando} className="boton-primario">
        {enviando ? 'Agregando...' : '+ Agregar categoria'}
      </button>
    </form>
  );
}

function FilaCategoria({ categoria, alGuardar, alEliminar, alError }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(categoria.nombre);
  const [precio, setPrecio] = useState(String(categoria.precio));
  const [enviando, setEnviando] = useState(false);

  async function guardarEdicion() {
    alError('');
    setEnviando(true);
    try {
      await clienteApi.actualizar(`/categorias/${categoria.id}`, { nombre, precio: Number(precio) });
      setEditando(false);
      await alGuardar();
    } catch (err) {
      alError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (editando) {
    return (
      <tr>
        <td className="px-4 py-2">
          <input
            className="campo-formulario"
            value={nombre}
            maxLength={60}
            onChange={(e) => setNombre(e.target.value)}
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            min="0"
            step="0.01"
            className="campo-formulario"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={enviando}
              className="text-xs font-semibold text-marca-600 hover:underline"
              onClick={guardarEdicion}
            >
              Guardar
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-slate-500 hover:underline"
              onClick={() => {
                setNombre(categoria.nombre);
                setPrecio(String(categoria.precio));
                setEditando(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-marca-50/40">
      <td className="px-4 py-3 font-medium text-slate-800">{categoria.nombre}</td>
      <td className="px-4 py-3 text-slate-500">{formatearMoneda(categoria.precio)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="text-xs font-semibold text-slate-500 hover:underline"
            onClick={() => setEditando(true)}
          >
            Editar
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-rose-600 hover:underline"
            onClick={alEliminar}
          >
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}

export default GestionCategorias;
