import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Carregando, Pill, Seg } from '../components/base';
import { EventoForm } from '../components/forms';
import { useColecao, useConfig } from '../lib/db';
import {
  ATIVOS, CONFIRMADOS, STATUS_EVENTO, fimDeSemanaDoMes, fmtDia, moeda, nomeMes, progressoTarefas, semanaCurta,
} from '../lib/util';

const FILTROS = [
  ['ativos', 'Em andamento'],
  ['negociacao', 'Negociando'],
  ['contrato_enviado', 'Contrato enviado'],
  ['fechado', 'Fechados'],
  ['planejamento', 'Em planejamento'],
  ['encerrados', 'Realizados e cancelados'],
];

export default function Eventos() {
  const navegar = useNavigate();
  const config = useConfig();
  const eventos = useColecao('eventos');
  const fichas = useColecao('fichas');
  const [filtro, setFiltro] = useState('ativos');
  const [agrupar, setAgrupar] = useState('data');
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState(false);

  const contagem = useMemo(() => {
    const c = {};
    (eventos || []).forEach((e) => { c[e.status] = (c[e.status] || 0) + 1; });
    c.ativos = ATIVOS.reduce((s, k) => s + (c[k] || 0), 0);
    return c;
  }, [eventos]);

  const grupos = useMemo(() => {
    if (!eventos) return [];
    const termo = busca.trim().toLowerCase();
    const lista = eventos.filter((e) => {
      if (filtro === 'ativos' && !ATIVOS.includes(e.status)) return false;
      if (filtro === 'encerrados' && !['realizado', 'cancelado', 'perdido'].includes(e.status)) return false;
      if (!['ativos', 'encerrados'].includes(filtro) && e.status !== filtro) return false;
      if (termo && !`${e.nome} ${e.tipo} ${e.data} ${(e.data || '').split('-').reverse().join('/')}`.toLowerCase().includes(termo)) return false;
      return true;
    });
    const campo = agrupar === 'data' ? 'data' : 'dataFechamento';
    lista.sort((a, b) => (a[campo] || '9999').localeCompare(b[campo] || '9999') * (filtro === 'encerrados' ? -1 : 1));
    const mapa = new Map();
    lista.forEach((e) => {
      const chave = e[campo] ? e[campo].slice(0, 7) : 'sem';
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(e);
    });
    return [...mapa.entries()].map(([chave, itens]) => {
      if (chave === 'sem') return { chave, titulo: agrupar === 'data' ? 'Sem data definida' : 'Ainda não fechados', itens };
      const [a, m] = chave.split('-').map(Number);
      const g = { chave, titulo: nomeMes(a, m - 1), itens };
      if (agrupar === 'data') {
        const fds = fimDeSemanaDoMes(a, m - 1);
        const ocupadas = new Set(eventos.filter((e) => CONFIRMADOS.includes(e.status) && fds.includes(e.data)).map((e) => e.data));
        g.barra = Math.round((ocupadas.size / fds.length) * 100);
        g.info = `${ocupadas.size} de ${fds.length} fins de semana reservados`;
      } else {
        const total = itens.filter((e) => CONFIRMADOS.includes(e.status)).reduce((s, e) => s + (Number(e.valorContrato) || 0), 0);
        const meta = Number(config.meta) || 0;
        g.barra = meta ? Math.min(100, Math.round((total / meta) * 100)) : 0;
        g.info = `${moeda(total)} fechados${meta ? ` · meta ${moeda(meta)}` : ''}`;
      }
      return g;
    });
  }, [eventos, filtro, agrupar, busca, config.meta]);

  if (!eventos || !fichas) return <div className="pagina"><Carregando /></div>;
  const fichaMap = Object.fromEntries(fichas.map((f) => [f.id, f]));
  const situacaoFichas = (e) => {
    const partes = [];
    const fc = e.fichaCadastral?.token && fichaMap[e.fichaCadastral.token];
    const ft = e.fichaTecnica?.token && fichaMap[e.fichaTecnica.token];
    if (fc) partes.push(fc.enviadaEm ? 'Ficha cadastral ok' : 'Aguardando ficha cadastral');
    if (ft) partes.push(ft.enviadaEm ? 'Ficha técnica ok' : 'Aguardando ficha técnica');
    return partes.join(' · ');
  };

  return (
    <main className="pagina">
      <div className="cabeca">
        <div className="t">
          <span className="eyebrow">{contagem.ativos || 0} em andamento</span>
          <h1 className="titulo">Eventos</h1>
        </div>
        <div className="acoes">
          <label className="busca">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6F5E50" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            <input type="search" aria-label="Buscar evento" placeholder="Buscar por nome ou data" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          <button className="btn btn-primario" onClick={() => setNovo(true)}>Novo evento</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
        <div className="filtros" role="group" aria-label="Filtrar por etapa">
          {FILTROS.map(([k, nome]) => (
            <button key={k} className={`filtro${filtro === k ? ' on' : ''}`} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
              {nome}{k !== 'encerrados' && contagem[k] ? ` · ${contagem[k]}` : ''}
            </button>
          ))}
        </div>
        <Seg rotulo="Agrupar por" valor={agrupar} onChange={setAgrupar} opcoes={[['data', 'Data do evento'], ['fechamento', 'Data de fechamento']]} />
      </div>

      {grupos.length === 0 && <div className="card vazio">Nenhum evento aqui.</div>}
      {grupos.map((g) => (
        <section key={g.chave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="mes-cab">
            <h2>{g.titulo}</h2>
            {g.info && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="small muted">
                <span className="barra" style={{ width: 120 }}><span style={{ width: `${g.barra}%` }} /></span>{g.info}
              </span>
            )}
          </div>
          {g.itens.map((e) => {
            const t = progressoTarefas(e);
            return (
              <Link key={e.id} to={`/eventos/${e.id}`} className="item">
                <span className="data-circ">
                  {e.data ? (<><b>{fmtDia(e.data)}</b><span>{semanaCurta(e.data)}</span></>) : <span>A DEFINIR</span>}
                </span>
                <span className="info">
                  <span className="nome">{e.nome}</span>
                  <span className="small muted">{[e.tipo, e.convidados ? `${e.convidados} convidados` : '', e.horaInicio].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="extra">
                  <span>{e.valorContrato ? moeda(e.valorContrato) : 'Valor a definir'}{CONFIRMADOS.includes(e.status) ? (e.quitado ? ' · quitado' : ' · não quitado') : ''}</span>
                  <span>{[t.total ? `Tarefas ${t.feitas}/${t.total}` : '', situacaoFichas(e)].filter(Boolean).join(' · ')}</span>
                </span>
                <Pill info={STATUS_EVENTO[e.status] || STATUS_EVENTO.negociacao} />
              </Link>
            );
          })}
        </section>
      ))}

      {novo && <EventoForm onFechar={() => setNovo(false)} onCriado={(id) => navegar(`/eventos/${id}`)} />}
    </main>
  );
}
