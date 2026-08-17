import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAutenticacion } from './contexto/ContextoAutenticacion.jsx';
import RutaProtegida from './componentes/RutaProtegida.jsx';
import PantallaCarga from './componentes/PantallaCarga.jsx';
import DisenoPrincipal from './componentes/DisenoPrincipal.jsx';

import IniciarSesion from './paginas/IniciarSesion.jsx';
import PanelCliente from './paginas/cliente/PanelCliente.jsx';
import GestionInvitados from './paginas/cliente/GestionInvitados.jsx';
import GestionCategorias from './paginas/cliente/GestionCategorias.jsx';
import EscanerAcceso from './paginas/cliente/EscanerAcceso.jsx';
import ConfiguracionCuenta from './paginas/ConfiguracionCuenta.jsx';

import GestionClientes from './paginas/administracion/GestionClientes.jsx';
import GestionEventos from './paginas/administracion/GestionEventos.jsx';
import DetalleEvento from './paginas/administracion/DetalleEvento.jsx';
import Auditoria from './paginas/administracion/Auditoria.jsx';
import Respaldos from './paginas/administracion/Respaldos.jsx';

const ITEMS_NAV_CLIENTE = [
  { a: '/cliente', etiqueta: 'Panel', icono: '📊', exacto: true },
  { a: '/cliente/invitados', etiqueta: 'Invitados', icono: '🧾' },
  { a: '/cliente/categorias', etiqueta: 'Categorias', icono: '🏷️' },
  { a: '/cliente/escaner', etiqueta: 'Control de acceso', icono: '📷' },
  { a: '/cliente/cuenta', etiqueta: 'Mi cuenta', icono: '⚙️' },
];

const ITEMS_NAV_ADMIN = [
  { a: '/administracion/clientes', etiqueta: 'Clientes', icono: '🏢', exacto: true },
  { a: '/administracion/eventos', etiqueta: 'Eventos', icono: '🎫' },
  { a: '/administracion/auditoria', etiqueta: 'Auditoria', icono: '🛡️' },
  { a: '/administracion/respaldos', etiqueta: 'Respaldos', icono: '💾' },
  { a: '/administracion/cuenta', etiqueta: 'Mi cuenta', icono: '⚙️' },
];

function Aplicacion() {
  const { usuario, cargandoSesion } = useAutenticacion();

  if (cargandoSesion) {
    return <PantallaCarga />;
  }

  return (
    <Routes>
      <Route
        path="/iniciar-sesion"
        element={usuario ? <Navigate to="/" replace /> : <IniciarSesion />}
      />

      <Route path="/" element={<PaginaInicio usuario={usuario} />} />

      <Route
        path="/cliente"
        element={
          <RutaProtegida rolesPermitidos={['cliente']}>
            <DisenoPrincipal itemsNavegacion={ITEMS_NAV_CLIENTE} tituloSeccion="Panel del organizador" />
          </RutaProtegida>
        }
      >
        <Route index element={<PanelCliente />} />
        <Route path="invitados" element={<GestionInvitados />} />
        <Route path="categorias" element={<GestionCategorias />} />
        <Route path="escaner" element={<EscanerAcceso />} />
        <Route path="cuenta" element={<ConfiguracionCuenta />} />
      </Route>

      <Route
        path="/administracion"
        element={
          <RutaProtegida rolesPermitidos={['administrador']}>
            <DisenoPrincipal itemsNavegacion={ITEMS_NAV_ADMIN} tituloSeccion="Administracion general" />
          </RutaProtegida>
        }
      >
        <Route index element={<Navigate to="clientes" replace />} />
        <Route path="clientes" element={<GestionClientes />} />
        <Route path="eventos" element={<GestionEventos />} />
        <Route path="eventos/:eventoId" element={<DetalleEvento />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="respaldos" element={<Respaldos />} />
        <Route path="cuenta" element={<ConfiguracionCuenta />} />
      </Route>

      <Route path="*" element={<PaginaNoEncontrada />} />
    </Routes>
  );
}

function PaginaInicio({ usuario }) {
  if (!usuario) return <Navigate to="/iniciar-sesion" replace />;
  if (usuario.rol === 'administrador') return <Navigate to="/administracion" replace />;
  return <Navigate to="/cliente" replace />;
}

function PaginaNoEncontrada() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 bg-marca-50 text-center">
      <p className="text-6xl font-black text-marca-600">404</p>
      <p className="text-slate-600">La pagina que buscas no existe.</p>
    </div>
  );
}

export default Aplicacion;
