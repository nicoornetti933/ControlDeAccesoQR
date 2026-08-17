import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import clienteApi from '../servicios/clienteApi.js';

const ContextoAutenticacion = createContext(null);

function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  const consultarSesionActual = useCallback(async () => {
    try {
      const datos = await clienteApi.obtener('/autenticacion/perfil');
      setUsuario(datos.usuario);
    } catch (error) {
      setUsuario(null);
    } finally {
      setCargandoSesion(false);
    }
  }, []);

  useEffect(() => {
    consultarSesionActual();
  }, [consultarSesionActual]);

  const iniciarSesion = useCallback(async (email, password) => {
    const datos = await clienteApi.publicar('/autenticacion/iniciar-sesion', { email, password });
    setUsuario(datos.usuario);
    return datos.usuario;
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await clienteApi.publicar('/autenticacion/cerrar-sesion');
    } finally {
      setUsuario(null);
    }
  }, []);

  const valor = {
    usuario,
    cargandoSesion,
    iniciarSesion,
    cerrarSesion,
    consultarSesionActual,
  };

  return <ContextoAutenticacion.Provider value={valor}>{children}</ContextoAutenticacion.Provider>;
}

function useAutenticacion() {
  const contexto = useContext(ContextoAutenticacion);
  if (!contexto) {
    throw new Error('useAutenticacion debe usarse dentro de <ProveedorAutenticacion>.');
  }
  return contexto;
}

export { ProveedorAutenticacion, useAutenticacion };
