import React, { useCallback, useEffect, useState } from 'react';
import clienteApi from '../../servicios/clienteApi.js';
import VentanaModal from '../../componentes/VentanaModal.jsx';
import AvisoError from '../../componentes/AvisoError.jsx';
import InsigniaEstado from '../../componentes/InsigniaEstado.jsx';

function ModalCodigoQr({ invitado, alCerrar }) {
  const [qr, setQr] = useState(undefined); // undefined = cargando, null = no existe
  const [imagen, setImagen] = useState(null);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const { qr: qrActivo } = await clienteApi.obtener(`/codigos-qr/invitados/${invitado.id}/activo`);
      setQr(qrActivo);
      const { imagen: imagenBase64 } = await clienteApi.obtener(
        `/codigos-qr/invitados/${invitado.id}/imagen`
      );
      setImagen(imagenBase64);
    } catch (err) {
      if (err.codigoEstado === 404) {
        setQr(null);
      } else {
        setError(err.message);
      }
    }
  }, [invitado.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function generar() {
    setProcesando(true);
    setError('');
    try {
      await clienteApi.publicar(`/codigos-qr/invitados/${invitado.id}/generar`);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function regenerar() {
    if (
      !window.confirm(
        'Esto invalida el codigo QR actual de forma permanente y genera uno nuevo. ¿Continuar?'
      )
    ) {
      return;
    }
    setProcesando(true);
    setError('');
    try {
      await clienteApi.publicar(`/codigos-qr/invitados/${invitado.id}/regenerar`);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <VentanaModal
      titulo={`Codigo QR — ${invitado.nombre} ${invitado.apellido}`}
      abierta
      alCerrar={alCerrar}
    >
      <div className="space-y-4">
        <AvisoError mensaje={error} />

        {qr === undefined && <p className="text-sm text-slate-500">Cargando...</p>}

        {qr === null && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="text-sm text-slate-500">Este invitado todavia no tiene un codigo QR.</p>
            <button type="button" className="boton-primario" onClick={generar} disabled={procesando}>
              {procesando ? 'Generando...' : 'Generar codigo QR'}
            </button>
          </div>
        )}

        {qr && (
          <div className="flex flex-col items-center gap-4">
            <InsigniaEstado estado={qr.estado} />
            {imagen && (
              <img
                src={imagen}
                alt={`Codigo QR de ${invitado.nombre} ${invitado.apellido}`}
                className="h-56 w-56 rounded-xl border border-slate-100 p-2"
              />
            )}
            <div className="flex w-full gap-2">
              {imagen && (
                <a
                  href={imagen}
                  download={`qr-${invitado.apellido}-${invitado.nombre}.png`}
                  className="boton-secundario flex-1 text-center"
                >
                  Descargar
                </a>
              )}
              <button
                type="button"
                className="boton-primario flex-1"
                onClick={regenerar}
                disabled={procesando}
              >
                {procesando ? 'Regenerando...' : 'Regenerar'}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Regenerar invalida este QR de forma permanente y crea uno nuevo. El anterior deja de
              funcionar para siempre.
            </p>
          </div>
        )}
      </div>
    </VentanaModal>
  );
}

export default ModalCodigoQr;
