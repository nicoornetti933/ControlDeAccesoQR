import React, { useState } from 'react';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';
import clienteApi from '../servicios/clienteApi.js';
import AvisoError from '../componentes/AvisoError.jsx';
import AvisoExito from '../componentes/AvisoExito.jsx';

function ConfiguracionCuenta() {
  const { usuario } = useAutenticacion();
  const esAdministrador = usuario?.rol === 'administrador';

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="tarjeta">
        <h2 className="text-base font-bold text-slate-900">Datos de la cuenta</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Nombre</dt>
            <dd className="font-medium text-slate-800">{usuario?.nombreCompleto}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Email</dt>
            <dd className="font-medium text-slate-800">{usuario?.email}</dd>
          </div>
          {usuario?.nombreOrganizacion && (
            <div>
              <dt className="text-slate-400">Organizacion</dt>
              <dd className="font-medium text-slate-800">{usuario.nombreOrganizacion}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-400">Rol</dt>
            <dd className="font-medium capitalize text-slate-800">{usuario?.rol}</dd>
          </div>
        </dl>
      </div>

      {esAdministrador ? (
        <>
          <FormularioCambiarEmail />
          <FormularioCambiarContrasena />
        </>
      ) : (
        // El cliente no puede modificar los datos de su cuenta: los
        // define el administrador al crearla (ver especificacion). Si
        // necesita cambiar el email o la contrasena, tiene que pedirselo
        // al administrador.
        <div className="tarjeta">
          <p className="text-sm text-slate-500">
            Estos datos fueron creados por el administrador del sistema. Si necesitas cambiar tu
            email o tu contrasena, pedile a el/ella que lo actualice.
          </p>
        </div>
      )}
    </div>
  );
}

function FormularioCambiarEmail() {
  const { consultarSesionActual } = useAutenticacion();
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError('');
    setExito('');
    setEnviando(true);
    try {
      await clienteApi.actualizar('/autenticacion/cambiar-email', {
        contrasenaActual,
        emailNuevo,
      });
      await consultarSesionActual(); // refresca el email mostrado en toda la app
      setExito('Email actualizado correctamente.');
      setContrasenaActual('');
      setEmailNuevo('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="tarjeta space-y-4">
      <h2 className="text-base font-bold text-slate-900">Cambiar email</h2>
      <AvisoError mensaje={error} />
      <AvisoExito mensaje={exito} />

      <div>
        <label className="etiqueta-formulario" htmlFor="emailNuevo">
          Nuevo email
        </label>
        <input
          id="emailNuevo"
          type="email"
          required
          className="campo-formulario"
          value={emailNuevo}
          onChange={(evento) => setEmailNuevo(evento.target.value)}
        />
      </div>

      <div>
        <label className="etiqueta-formulario" htmlFor="contrasenaActualEmail">
          Contrasena actual (para confirmar el cambio)
        </label>
        <input
          id="contrasenaActualEmail"
          type="password"
          required
          className="campo-formulario"
          value={contrasenaActual}
          onChange={(evento) => setContrasenaActual(evento.target.value)}
        />
      </div>

      <button type="submit" disabled={enviando} className="boton-primario">
        {enviando ? 'Guardando...' : 'Actualizar email'}
      </button>
    </form>
  );
}

function FormularioCambiarContrasena() {
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError('');
    setExito('');
    setEnviando(true);
    try {
      await clienteApi.actualizar('/autenticacion/cambiar-contrasena', {
        contrasenaActual,
        contrasenaNueva,
      });
      setExito('Contrasena actualizada correctamente.');
      setContrasenaActual('');
      setContrasenaNueva('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="tarjeta space-y-4">
      <h2 className="text-base font-bold text-slate-900">Cambiar contrasena</h2>
      <AvisoError mensaje={error} />
      <AvisoExito mensaje={exito} />

      <div>
        <label className="etiqueta-formulario" htmlFor="contrasenaActual">
          Contrasena actual
        </label>
        <input
          id="contrasenaActual"
          type="password"
          required
          className="campo-formulario"
          value={contrasenaActual}
          onChange={(evento) => setContrasenaActual(evento.target.value)}
        />
      </div>

      <div>
        <label className="etiqueta-formulario" htmlFor="contrasenaNueva">
          Nueva contrasena
        </label>
        <input
          id="contrasenaNueva"
          type="password"
          required
          minLength={8}
          className="campo-formulario"
          value={contrasenaNueva}
          onChange={(evento) => setContrasenaNueva(evento.target.value)}
        />
      </div>

      <button type="submit" disabled={enviando} className="boton-primario">
        {enviando ? 'Guardando...' : 'Actualizar contrasena'}
      </button>
    </form>
  );
}

export default ConfiguracionCuenta;
