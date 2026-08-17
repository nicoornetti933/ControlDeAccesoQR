// Helper compartido para mostrar montos consistentemente en toda la
// aplicacion (categorias, estadisticas de recaudacion, etc.). Se usa
// Intl.NumberFormat en vez de concatenar el simbolo "a mano" para que
// los separadores de miles/decimales queden correctos.
const formateador = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatearMoneda(valor) {
  return formateador.format(Number(valor) || 0);
}

export default formatearMoneda;
