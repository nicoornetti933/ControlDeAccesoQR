import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';
import PantallaCarga from './PantallaCarga.jsx';

/**
 * Protege una seccion de la aplicacion segun sesion y rol.
 *
 * Esta es una proteccion de EXPERIENCIA DE USUARIO (evita que se vean
 * pantallas de otro rol). La proteccion real de los datos ocurre siempre
 * en el backend (middlewares autenticarPeticion/autorizarRoles): un
 * usuario nunca deberia poder ver datos ajenos aunque manipule el
 * frontend, porque la API los rechaza igual.
 */
function RutaProtegida({ rolesPermitidos, children }) {
  const { usuario, cargandoSesion } = useAutenticacion();

  if (cargandoSesion) {
    return <PantallaCarga />;
  }

  if (!usuario) {
    return <Navigate to="/iniciar-sesion" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RutaProtegida;
