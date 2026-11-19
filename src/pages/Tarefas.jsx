import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Carregando, Seg } from '../components/base';
import ListaEditavel from '../components/ListaEditavel';
import { atualizarEvento, salvarConfig, useColecao, useConfig } from '../lib/db';
import { fmtData, progressoTarefas } from '../lib/util';

export default function Tarefas() {
  const eventos = useColecao('eventos');
  const config = useConfig();
  const [modo, setModo] = useState('pendentes');
  const [extra, setExtra] = useState({});

  const lista = useMemo(() => {
    if (!eventos) return [];
    return eventos
      .filter((e) => (e.tarefas || []).length && !['cancelado', 'perdido'].includes(e.status))
      .filter((e) => modo === 'todas' || (e.tarefas || []).some((t) => !t.feita))
      .sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999'));
  }, [eventos, modo]);

  if (!eventos) return <div className="pagina"><Carregando /></div>;
  const pendentes = eventos.reduce((s, e) => s + (['cancelado', 'perdido'].includes(e.status) ? 0 : (e.tarefas || []).filter((t) => !t.feita).length), 0);

  const alternar = (e, i) => {
    const t = e.tarefas.map((x, j) => (j === i ? { ...x, feita: !x.feita } : x));
    atualizarEvento(e.id, { tarefas: t }, `${e.tarefas[i].feita ? 'Desmarcou' : 'Concluiu'}: ${e.tarefas[i].t}`);
  };
  const adicionar = (e) => {
    const texto = (extra[e.id] || '').trim();
    if (!texto) return;
    atualizarEvento(e.id, { tarefas: [...e.tarefas, { t: texto, feita: false }] });
    setExtra({ ...extra, [e.id]: '' });
  };

  return (
    <main className="pagina">
      <div className="cabeca">
        <div className="t"><span className="eyebrow">Checklist pós-contrato</span><h1 className="titulo">Tarefas</h1></div>
        <Seg rotulo="Mostrar" valor={modo} onChange={setModo} opcoes={[['pendentes', `Pendentes · ${pendentes}`], ['todas', 'Todas']]} />
      </div>
      <div className="linha">
        <div className="col-3">
          {lista.length === 0 && <div className="card vazio">{modo === 'pendentes' ? 'Nenhuma tarefa pendente.' : 'Nenhum evento com tarefas ainda. Elas aparecem quando o evento é fechado.'}</div>}
          {lista.map((e) => {
            const p = progressoTarefas(e);
            return (
              <section key={e.id} className="card">
                <div className="card-cab">
                  <div><Link to={`/eventos/${e.id}`} style={{ fontSize: 18, fontWeight: 700, color: 'var(--vinho-escuro)', textDecoration: 'none' }}>{e.nome}</Link><br /><span className="small muted">{e.data ? fmtData(e.data) : 'Data a definir'}{e.dataFechamento ? ` · fechado em ${fmtData(e.dataFechamento)}` : ''}</span></div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }} className="small">
                    <span className="barra verde" style={{ width: 100 }}><span style={{ width: `${(p.feitas / p.total) * 100}%` }} /></span>{p.feitas} de {p.total}
                  </span>
                </div>
                {e.tarefas.map((t, i) => ((modo === 'todas' || !t.feita) ? (
                  <label key={`${t.t}${i}`} className={`check${t.feita ? ' feita' : ''}`}>
                    <input type="checkbox" checked={!!t.feita} onChange={() => alternar(e, i)} /><span>{t.t}</span>
                  </label>
                ) : null))}
                <form style={{ display: 'flex', gap: 8 }} onSubmit={(ev) => { ev.preventDefault(); adicionar(e); }}>
                  <input className="input" placeholder="Tarefa só para este evento" value={extra[e.id] || ''} onChange={(ev) => setExtra({ ...extra, [e.id]: ev.target.value })} />
                  <button className="btn btn-texto btn-sm">Adicionar</button>
                </form>
              </section>
            );
          })}
        </div>
        <aside className="card col-2">
          <h2>Tarefas padrão</h2>
          <span className="small muted">Todo evento fechado começa com estas tarefas. Mudar aqui não altera eventos que já existem.</span>
          <ListaEditavel numerada itens={config.tarefasPadrao} placeholder="Nova tarefa padrão" onSalvar={(l) => salvarConfig('geral', { tarefasPadrao: l })} />
        </aside>
      </div>
    </main>
  );
}
