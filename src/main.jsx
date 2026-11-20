import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Navigate, Route, RouterProvider, createHashRouter, createRoutesFromElements,
} from 'react-router-dom';
import './styles.css';
import { AreaEquipe, AvisoProvider } from './components/base';
import Inicio from './pages/Inicio';
import Agenda from './pages/Agenda';
import Eventos from './pages/Eventos';
import Evento from './pages/Evento';
import Planejamento from './pages/Planejamento';
import PlanejamentoEvento from './pages/PlanejamentoEvento';
import OrdemServico from './pages/OrdemServico';
import Tarefas from './pages/Tarefas';
import Equipes from './pages/Equipes';
import Configuracoes from './pages/Configuracoes';
import Agendar from './pages/publico/Agendar';
import Ficha from './pages/publico/Ficha';

// Roteador "de dados": permite avisar antes de sair de uma tela com alterações não salvas.
const router = createHashRouter(createRoutesFromElements(
  <>
    <Route path="/agendar" element={<Agendar />} />
    <Route path="/ficha/:token" element={<Ficha />} />
    <Route element={<AreaEquipe />}>
      <Route path="/" element={<Inicio />} />
      <Route path="/agenda" element={<Agenda />} />
      <Route path="/eventos" element={<Eventos />} />
      <Route path="/eventos/:id" element={<Evento />} />
      <Route path="/planejamento" element={<Planejamento />} />
      <Route path="/planejamento/:id" element={<PlanejamentoEvento />} />
      <Route path="/os/:id" element={<OrdemServico />} />
      <Route path="/tarefas" element={<Tarefas />} />
      <Route path="/equipes" element={<Equipes />} />
      <Route path="/configuracoes" element={<Configuracoes />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </>,
));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AvisoProvider>
      <RouterProvider router={router} />
    </AvisoProvider>
  </React.StrictMode>,
);
