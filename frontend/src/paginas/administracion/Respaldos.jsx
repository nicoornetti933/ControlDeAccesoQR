import React, { useCallback, useEffect, useState } from 'react';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';
import AvisoExito from '../../componentes/AvisoExito.jsx';
import PantallaCarga from '../../componentes/PantallaCarga.jsx';

// El servidor crea una copia de la base de datos automaticamente cada
// pocas horas (ver backend/src/respaldos). Esta pantalla solo permite
// verlas y, si hace falta, disparar una copia manual antes de un cambio
// importante.
function Respaldos() {
  const [respaldos, setRespaldos] = useState(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { respaldos: lista } = await clienteApi.obtener('/administracion/respaldos');
      setRespaldos(lista);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crearRespaldoManual() {
    setError('');
    setExito('');
    setCreando(true);
    try {
      await clienteApi.publicar('/administracion/respaldos');
      setExito('Respaldo creado correctamente.');
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  if (respaldos === null) return <PantallaCarga mensaje="Cargando respaldos..." />;

  return (
    <div className="space-y-5">
      <AvisoError mensaje={error} />
      <AvisoExito mensaje={exito} />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Respaldos de la base de datos</h2>
          <p className="text-sm text-slate-500">
            El sistema guarda una copia automatica de forma periodica. Tambien podes crear una copia
            manual en este momento (por ejemplo, antes de hacer un cambio importante).
          </p>
        </div>
        <button type="button" disabled={creando} className="boton-primario shrink-0" onClick={crearRespaldoManual}>
          {creando ? 'Creando...' : '+ Crear respaldo ahora'}
        </button>
      </div>

      <div className="tarjeta overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Archivo</th>
              <th className="px-4 py-3">Fecha y hora</th>
              <th className="px-4 py-3">Tamano</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {respaldos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  Todavia no hay respaldos. El primero se crea automaticamente a los pocos minutos de
                  iniciar el servidor.
                </td>
              </tr>
            )}
            {respaldos.map((respaldo) => (
              <tr key={respaldo.archivo}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  <code className="text-xs">{respaldo.archivo}</code>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(respaldo.creadoEn).toLocaleString('es-AR')}
                </td>
                <td className="px-4 py-3 text-slate-500">{formatearTamanio(respaldo.tamanioBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Los archivos se guardan en la carpeta <code>backend/datos/respaldos</code> del servidor. Para
        restaurar uno, hay que detener el servidor, reemplazar <code>backend/datos/sistema.db</code> por
        el respaldo elegido (renombrandolo a "sistema.db") y volver a iniciar el servidor.
      </p>
    </div>
  );
}

function formatearTamanio(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default Respaldos;
