import React, { useState } from 'react';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';
import AvisoExito from '../../componentes/AvisoExito.jsx';

// El input "date" nativo del navegador acepta anios de mas de 4 cifras
// (es valido segun el estandar HTML). Se limita con "max" para que sea
// dificil escribir por error un anio como "20260" en vez de "2026"; el
// backend igual vuelve a validar esto de forma estricta (ver
// eventosEsquemas.js), asi que este limite es solo una ayuda de UX.
const ANIOS_A_FUTURO_PERMITIDOS = 15;
const FECHA_MAXIMA = `${new Date().getFullYear() + ANIOS_A_FUTURO_PERMITIDOS}-12-31`;

// Formulario reutilizable para crear el evento activo o editar sus
// datos. Si recibe "evento" por props, actualiza; si no, crea uno nuevo.
function FormularioEvento({ evento, alGuardar }) {
  const [nombre, setNombre] = useState(evento?.nombre || '');
  const [fecha, setFecha] = useState(evento?.fecha || '');
  const [hora, setHora] = useState(evento?.hora || '');
  const [lugar, setLugar] = useState(evento?.lugar || '');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(eventoFormulario) {
    eventoFormulario.preventDefault();
    setError('');
    setExito('');
    setEnviando(true);
    try {
      const datos = { nombre, fecha, hora, lugar };
      if (evento) {
        await clienteApi.actualizar(`/eventos/${evento.id}`, datos);
        setExito('Evento actualizado.');
      } else {
        await clienteApi.publicar('/eventos', datos);
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
      <AvisoExito mensaje={exito} />

      <div>
        <label className="etiqueta-formulario" htmlFor="nombreEvento">
          Nombre del evento
        </label>
        <input
          id="nombreEvento"
          required
          className="campo-formulario"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Boda de Ana y Luis"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="etiqueta-formulario" htmlFor="fechaEvento">
            Fecha
          </label>
          <input
            id="fechaEvento"
            type="date"
            required
            max={FECHA_MAXIMA}
            className="campo-formulario"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
        <div>
          <label className="etiqueta-formulario" htmlFor="horaEvento">
            Hora
          </label>
          <input
            id="horaEvento"
            type="time"
            required
            className="campo-formulario"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="etiqueta-formulario" htmlFor="lugarEvento">
          Lugar
        </label>
        <input
          id="lugarEvento"
          required
          className="campo-formulario"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          placeholder="Ej: Salon Jardin, Av. Siempre Viva 123"
        />
      </div>

      <button type="submit" disabled={enviando} className="boton-primario">
        {enviando ? 'Guardando...' : evento ? 'Guardar cambios' : 'Crear evento'}
      </button>
    </form>
  );
}

export default FormularioEvento;
