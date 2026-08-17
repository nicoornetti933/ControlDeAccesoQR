import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import clienteApi from '../../servicios/clienteApi.js';
import AvisoError from '../../componentes/AvisoError.jsx';
import InsigniaEstado from '../../componentes/InsigniaEstado.jsx';

const ID_CONTENEDOR_LECTOR = 'lector-qr';
const MENSAJES_POR_MOTIVO = {
  acceso_autorizado: 'Ingreso autorizado.',
  codigo_qr_inexistente: 'El codigo escaneado no corresponde a ningun invitado del sistema.',
  codigo_qr_invalidado: 'Este codigo fue invalidado (probablemente por una regeneracion).',
  codigo_qr_ya_utilizado: 'Este codigo ya fue utilizado anteriormente.',
  codigo_qr_no_corresponde_al_evento_actual: 'Este codigo no corresponde al evento actual.',
  invitado_deshabilitado_o_cancelado: 'El invitado esta deshabilitado o cancelado.',
};

function EscanerAcceso() {
  const referenciaLector = useRef(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [historial, setHistorial] = useState([]);

  const cargarHistorial = useCallback(async () => {
    try {
      const { historial: lista } = await clienteApi.obtener('/control-acceso/historial');
      setHistorial(lista);
    } catch (err) {
      // El historial es informativo; un fallo aca no debe tapar el escaner.
      console.error(err);
    }
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const procesarCodigo = useCallback(
    async (identificadorQr) => {
      setProcesando(true);
      setError('');
      try {
        const datos = await clienteApi.publicar('/control-acceso/escanear', { identificadorQr });
        setResultado(datos);
        cargarHistorial();
      } catch (err) {
        setError(err.message);
      } finally {
        setProcesando(false);
      }
    },
    [cargarHistorial]
  );

  const iniciarCamara = useCallback(async () => {
    setError('');
    try {
      const lector = new Html5Qrcode(ID_CONTENEDOR_LECTOR);
      referenciaLector.current = lector;

      await lector.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (textoDecodificado) => {
          // Evita procesar el mismo cuadro varias veces mientras se
          // resuelve la peticion anterior.
          if (referenciaLector.current?.__procesando) return;
          referenciaLector.current.__procesando = true;
          await procesarCodigo(textoDecodificado);
          setTimeout(() => {
            if (referenciaLector.current) referenciaLector.current.__procesando = false;
          }, 1500);
        },
        () => {
          // Callback de "no se detecto QR en este frame": se ignora a
          // proposito, ocurre constantemente durante el escaneo normal.
        }
      );
      setCamaraActiva(true);
    } catch (err) {
      setError(
        'No se pudo acceder a la camara. Verifica los permisos del navegador o usa la carga manual.'
      );
    }
  }, [procesarCodigo]);

  const detenerCamara = useCallback(async () => {
    if (referenciaLector.current) {
      try {
        await referenciaLector.current.stop();
        await referenciaLector.current.clear();
      } catch (err) {
        // La camara puede ya estar detenida; no es un error relevante para el usuario.
      }
      referenciaLector.current = null;
    }
    setCamaraActiva(false);
  }, []);

  useEffect(() => {
    return () => {
      if (referenciaLector.current) {
        referenciaLector.current.stop().catch(() => {});
      }
    };
  }, []);

  async function manejarEnvioManual(evento) {
    evento.preventDefault();
    if (!codigoManual.trim()) return;
    await procesarCodigo(codigoManual.trim());
    setCodigoManual('');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="tarjeta">
        <h2 className="text-lg font-bold text-slate-900">Escanear codigo QR</h2>
        <p className="mt-1 text-sm text-slate-500">
          Usa la camara del dispositivo para escanear el QR de cada invitado en la entrada.
        </p>

        <div className="mt-5">
          <AvisoError mensaje={error} />
        </div>

        <div className="mt-4">
          <div
            id={ID_CONTENEDOR_LECTOR}
            className={`mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-slate-900 ${
              camaraActiva ? 'block' : 'hidden'
            }`}
          />

          {!camaraActiva ? (
            <button type="button" className="boton-primario w-full" onClick={iniciarCamara}>
              📷 Activar camara
            </button>
          ) : (
            <button type="button" className="boton-secundario mt-3 w-full" onClick={detenerCamara}>
              Detener camara
            </button>
          )}
        </div>

        <form onSubmit={manejarEnvioManual} className="mt-5 flex gap-2 border-t border-slate-100 pt-5">
          <input
            className="campo-formulario"
            placeholder="O pega/escribe el codigo manualmente"
            value={codigoManual}
            onChange={(e) => setCodigoManual(e.target.value)}
          />
          <button type="submit" className="boton-secundario" disabled={procesando}>
            Validar
          </button>
        </form>
      </div>

      {resultado && (
        <div
          className={`tarjeta border-2 ${
            resultado.autorizado ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'
          }`}
        >
          <p className={`text-2xl font-black ${resultado.autorizado ? 'text-emerald-700' : 'text-rose-700'}`}>
            {resultado.autorizado ? '✅ ACCESO AUTORIZADO' : '⛔ ACCESO RECHAZADO'}
          </p>
          {resultado.invitado && (
            <p className="mt-1 text-lg font-semibold text-slate-800">
              {resultado.invitado.nombre} {resultado.invitado.apellido}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-600">
            {MENSAJES_POR_MOTIVO[resultado.motivo] || resultado.motivo}
          </p>
        </div>
      )}

      <div className="tarjeta">
        <h3 className="mb-3 text-base font-bold text-slate-900">Ultimos escaneos</h3>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {historial.length === 0 && <p className="text-sm text-slate-400">Todavia no hay escaneos.</p>}
          {historial.map((registro) => (
            <div
              key={registro.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-slate-800">
                  {registro.nombre ? `${registro.nombre} ${registro.apellido}` : 'Codigo desconocido'}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(registro.fecha_hora).toLocaleString('es-AR')}
                </p>
              </div>
              <InsigniaEstado estado={registro.resultado} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EscanerAcceso;
