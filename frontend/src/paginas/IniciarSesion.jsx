import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';
import AvisoError from '../componentes/AvisoError.jsx';

function IniciarSesion() {
  const { iniciarSesion } = useAutenticacion();
  const navegar = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const usuario = await iniciarSesion(email, password);
      navegar(usuario.rol === 'administrador' ? '/administracion' : '/cliente');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-marca-600 via-marca-700 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-black text-marca-600 shadow-lg">
            Q
          </div>
          <h1 className="text-2xl font-bold text-white">Control de Acceso a Eventos</h1>
          <p className="mt-1 text-sm text-marca-100">Ingresa con tu cuenta para continuar</p>
        </div>

        <form onSubmit={manejarEnvio} className="tarjeta space-y-4">
          <AvisoError mensaje={error} />

          <div>
            <label className="etiqueta-formulario" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              className="campo-formulario"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="nombre@ejemplo.com"
            />
          </div>

          <div>
            <label className="etiqueta-formulario" htmlFor="password">
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="campo-formulario"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={enviando} className="boton-primario w-full">
            {enviando ? 'Ingresando...' : 'Iniciar sesion'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-marca-100">
          Las credenciales de cliente son creadas por el administrador del sistema.
        </p>
      </div>
    </div>
  );
}

export default IniciarSesion;
