import React, { useEffect, useState } from 'react';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';

function FormularioInvitado({ eventoId, invitado, alGuardar }) {
  const [nombre, setNombre] = useState(invitado?.nombre || '');
  const [apellido, setApellido] = useState(invitado?.apellido || '');
  const [dni, setDni] = useState(invitado?.dni || '');
  const [telefono, setTelefono] = useState(invitado?.telefono || '');
  const [categoriaId, setCategoriaId] = useState(invitado?.categoria_id ?? '');
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Las categorias son propias del evento (ver GestionCategorias.jsx); se
  // cargan aca para poblar el selector, en vez de recibirlas por props,
  // asi el formulario sigue funcionando igual sin importar desde donde
  // se abra.
  useEffect(() => {
    (async () => {
      try {
        const { categorias: lista } = await clienteApi.obtener(`/eventos/${eventoId}/categorias`);
        setCategorias(lista);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [eventoId]);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const datos = {
        nombre,
        apellido,
        dni,
        telefono,
        categoriaId: categoriaId === '' ? null : Number(categoriaId),
      };
      if (invitado) {
        await clienteApi.actualizar(`/invitados/${invitado.id}`, datos);
      } else {
        await clienteApi.publicar(`/eventos/${eventoId}/invitados`, datos);
      }
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="etiqueta-formulario" htmlFor="nombreInvitado">
            Nombre
          </label>
          <input
            id="nombreInvitado"
            required
            className="campo-formulario"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div>
          <label className="etiqueta-formulario" htmlFor="apellidoInvitado">
            Apellido
          </label>
          <input
            id="apellidoInvitado"
            required
            className="campo-formulario"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="etiqueta-formulario" htmlFor="dniInvitado">
          DNI
        </label>
        <input
          id="dniInvitado"
          required
          inputMode="numeric"
          className="campo-formulario"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          placeholder="Solo numeros"
        />
      </div>

      <div>
        <label className="etiqueta-formulario" htmlFor="telefonoInvitado">
          Telefono
        </label>
        <input
          id="telefonoInvitado"
          required
          className="campo-formulario"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="+54 9 11 1234-5678"
        />
      </div>

      <div>
        <label className="etiqueta-formulario" htmlFor="categoriaInvitado">
          Categoria (opcional)
        </label>
        <select
          id="categoriaInvitado"
          className="campo-formulario"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
        >
          <option value="">Sin categoria</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </select>
        {categorias.length === 0 && (
          <p className="mt-1 text-xs text-slate-400">
            Todavia no creaste categorias. Podes crearlas desde "Categorias" en el menu.
          </p>
        )}
      </div>

      <button type="submit" disabled={enviando} className="boton-primario w-full">
        {enviando ? 'Guardando...' : invitado ? 'Guardar cambios' : 'Agregar invitado'}
      </button>
    </form>
  );
}

export default FormularioInvitado;
