import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';

/**
 * Layout compartido (barra lateral + barra superior) para las secciones
 * de cliente y de administracion. Recibe los items de navegacion propios
 * de cada rol para no duplicar el armazon visual.
 */
function DisenoPrincipal({ itemsNavegacion, tituloSeccion }) {
  const { usuario, cerrarSesion } = useAutenticacion();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex min-h-screen bg-marca-50/40">
      {/* Barra lateral (escritorio) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-100 bg-white px-4 py-6 md:flex">
        <EncabezadoMarca />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {itemsNavegacion.map((item) => (
            <NavLink
              key={item.a}
              to={item.a}
              end={item.exacto}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-marca-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-marca-50 hover:text-marca-700'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icono}</span>
              {item.etiqueta}
            </NavLink>
          ))}
        </nav>
        <PieUsuario usuario={usuario} cerrarSesion={cerrarSesion} />
      </aside>

      {/* Menu movil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-64 bg-white px-4 py-6 shadow-xl">
            <EncabezadoMarca />
            <nav className="mt-8 flex flex-1 flex-col gap-1">
              {itemsNavegacion.map((item) => (
                <NavLink
                  key={item.a}
                  to={item.a}
                  end={item.exacto}
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive ? 'bg-marca-600 text-white' : 'text-slate-600 hover:bg-marca-50'
                    }`
                  }
                >
                  <span className="text-lg leading-none">{item.icono}</span>
                  {item.etiqueta}
                </NavLink>
              ))}
            </nav>
            <PieUsuario usuario={usuario} cerrarSesion={cerrarSesion} />
          </div>
          <div className="flex-1 bg-slate-900/40" onClick={() => setMenuAbierto(false)} />
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menu"
            >
              ☰
            </button>
            <h1 className="text-lg font-bold text-slate-900">{tituloSeccion}</h1>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function EncabezadoMarca() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-marca-600 text-lg font-bold text-white">
        Q
      </div>
      <div>
        <p className="text-sm font-bold leading-tight text-slate-900">Control de Acceso</p>
        <p className="text-xs text-slate-400">Sistema de Eventos</p>
      </div>
    </div>
  );
}

function PieUsuario({ usuario, cerrarSesion }) {
  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <p className="truncate text-sm font-semibold text-slate-800">
        {usuario?.nombreCompleto}
      </p>
      <p className="truncate text-xs text-slate-400">{usuario?.email}</p>
      <button type="button" onClick={cerrarSesion} className="boton-secundario mt-3 w-full text-sm">
        Cerrar sesion
      </button>
    </div>
  );
}

export default DisenoPrincipal;
