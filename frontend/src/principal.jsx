import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Aplicacion from './Aplicacion.jsx';
import { ProveedorAutenticacion } from './contexto/ContextoAutenticacion.jsx';
import './estilos/indice.css';

ReactDOM.createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProveedorAutenticacion>
        <Aplicacion />
      </ProveedorAutenticacion>
    </BrowserRouter>
  </React.StrictMode>
);
