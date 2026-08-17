import React, { useState } from 'react';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';

function FormularioCliente({ alGuardar }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [nombreOrganizacion, setNombreOrganizacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await clienteApi.publicar('/administracion/clientes', {
        email,
        password,
        nombreCompleto,
        nombreOrganizacion: nombreOrganizacion || undefined,
        telefono: telefono || undefined,
      });
      await alGuardar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <AvisoError mensaje={error} />

      <div>
        <label className="etiqueta-formulario" htmlFor="nombreCompletoCliente">
          Nombre completo
        </label>
        <input
          id="nombreCompletoCliente"
          required
          className="campo-formulario"
          value={nombreCompleto}
          onChange={(e) => setNombreCompleto(e.target.value)}
        />
      </div>

      <div>
        <label className="etiqueta-formulario" htmlFor="organizacionCliente">
          Organizacion (opcional)
        </label>
        <input
          id="organizacionCliente"
          className="campo-formulario"
          value={nombreOrganizacion}
          onChange={(e) => setNombreOrganizacion(e.target.value)}
        />
      </div>

      <div>
        <label className="etiqueta-formulario" htmlFor="telefonoCliente">
          Telefono (opcional)
        </label>
        <input
          id="telefonoCliente"
          className="campo-formulario"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
      </div>

      <div>
        <label className="etiqueta-formulario" htmlFor="emailCliente">
          Email de acceso
        </label>
        <input
          id="emailCliente"
          type="email"
          required
          className="campo-formulario"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="etiqueta-formulario" htmlFor="passwordCliente">
          Contrasena inicial
        </label>
        <input
          id="passwordCliente"
          type="text"
          required
          minLength={8}
          className="campo-formulario"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Se la vas a compartir al cliente de forma segura"
        />
      </div>

      <button type="submit" disabled={enviando} className="boton-primario w-full">
        {enviando ? 'Creando...' : 'Crear cliente'}
      </button>
    </form>
  );
}

export default FormularioCliente;
