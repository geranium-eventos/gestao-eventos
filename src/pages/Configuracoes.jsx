import { useEffect, useState } from 'react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db, EMAILS_EQUIPE } from '../firebase';
import { Carregando, copiar, useAviso } from '../components/base';
import { Campo } from '../components/forms';
import ListaEditavel from '../components/ListaEditavel';
import { linkAgendar, salvarConfig, useColecao, useConfig } from '../lib/db';
import { fmtData, numero } from '../lib/util';

export default function Configuracoes() {
  const aviso = useAviso();
  const config = useConfig();
  const especiais = useColecao('diasEspeciais');
  const [h, setH] = useState(null);
  const [meta, setMeta] = useState('');
  const [dia, setDia] = useState({ data: '', inicio: '08:00', fim: '17:00', duracao: 60 });

  useEffect(() => {
    if (config.carregado && h === null) {
      setH({ inicio: config.inicio, fim: config.fim, duracao: config.duracao, sabadoAte: config.sabadoAte, pausas: config.pausas || [] });
      setMeta(config.meta || '');
    }
  }, [config, h]);

  if (!h || !especiais) return <div className="pagina"><Carregando /></div>;

  const salvarHorarios = async () => {
    await salvarConfig('agenda', { ...h, duracao: Number(h.duracao) || 60 });
    aviso('Horários salvos');
  };
  const salvarDia = async (e) => {
    e.preventDefault();
    if (!dia.data) return;
    await setDoc(doc(db, 'diasEspeciais', dia.data), { inicio: dia.inicio, fim: dia.fim, duracao: Number(dia.duracao) || 60 });
    aviso('Dia especial salvo');
    setDia({ ...dia, data: '' });
  };
  const setPausa = (i, k, v) => setH({ ...h, pausas: h.pausas.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });

  return (
    <main className="pagina">
      <div className="cabeca"><div className="t"><span className="eyebrow">Sistema</span><h1 className="titulo">Configurações</h1></div></div>
      <div className="linha">
        <div className="col-3">
          <section className="card">
            <h2>Horários de visita</h2>
            <span className="small muted">Valem para a agenda e para o link de agendamento do site. Domingo fica fechado.</span>
            <div className="campos">
              <Campo rotulo="Abre às"><input type="time" value={h.inicio} onChange={(e) => setH({ ...h, inicio: e.target.value })} /></Campo>
              <Campo rotulo="Fecha às"><input type="time" value={h.fim} onChange={(e) => setH({ ...h, fim: e.target.value })} /></Campo>
              <Campo rotulo="Sábado até"><input type="time" value={h.sabadoAte} onChange={(e) => setH({ ...h, sabadoAte: e.target.value })} /></Campo>
              <Campo rotulo="Duração da visita (min)"><input type="number" min="15" step="15" value={h.duracao} onChange={(e) => setH({ ...h, duracao: e.target.value })} /></Campo>
            </div>
            <span className="campo">Pausas (sem visitas)</span>
            {h.pausas.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: 8 }}>
                <input className="input" type="time" aria-label="Início da pausa" value={p.ini} onChange={(e) => setPausa(i, 'ini', e.target.value)} />
                <input className="input" type="time" aria-label="Fim da pausa" value={p.fim} onChange={(e) => setPausa(i, 'fim', e.target.value)} />
                <button className="btn-icone" style={{ border: 'none' }} aria-label="Remover pausa" onClick={() => setH({ ...h, pausas: h.pausas.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <div className="acoes">
              <button className="btn btn-texto btn-sm" onClick={() => setH({ ...h, pausas: [...h.pausas, { ini: '12:00', fim: '13:00' }] })}>+ Adicionar pausa</button>
              <span style={{ flex: 1 }} />
              <button className="btn btn-primario btn-sm" onClick={salvarHorarios}>Salvar horários</button>
            </div>
          </section>

          <section className="card">
            <h2>Dias com horário diferente</h2>
            <span className="small muted">Para abrir um domingo, estender um sábado ou mudar o horário de um dia específico.</span>
            <form onSubmit={salvarDia} className="campos" style={{ alignItems: 'end' }}>
              <Campo rotulo="Dia"><input type="date" required value={dia.data} onChange={(e) => setDia({ ...dia, data: e.target.value })} /></Campo>
              <Campo rotulo="Abre"><input type="time" value={dia.inicio} onChange={(e) => setDia({ ...dia, inicio: e.target.value })} /></Campo>
              <Campo rotulo="Fecha"><input type="time" value={dia.fim} onChange={(e) => setDia({ ...dia, fim: e.target.value })} /></Campo>
              <Campo rotulo="Duração (min)"><input type="number" value={dia.duracao} onChange={(e) => setDia({ ...dia, duracao: e.target.value })} /></Campo>
              <button className="btn btn-contorno btn-sm">Salvar dia</button>
            </form>
            {[...especiais].sort((a, b) => a.id.localeCompare(b.id)).map((d) => (
              <div key={d.id} className="check" style={{ cursor: 'default' }}>
                <span style={{ flex: 1 }}><b>{fmtData(d.id)}</b> · {d.inicio} às {d.fim} · visitas de {d.duracao} min</span>
                <button className="btn-icone" style={{ border: 'none' }} aria-label="Remover" onClick={() => deleteDoc(doc(db, 'diasEspeciais', d.id))}>×</button>
              </div>
            ))}
          </section>
        </div>

        <aside className="col-2">
          <section className="card">
            <h2>Link de agendamento</h2>
            <span className="small muted">Para colocar no site e no WhatsApp.</span>
            <button className="btn btn-contorno btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => copiar(linkAgendar(), aviso)}>Copiar link</button>
          </section>
          <section className="card">
            <h2>Meta mensal de contratos</h2>
            <form style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }} onSubmit={async (e) => { e.preventDefault(); await salvarConfig('geral', { meta: numero(meta) }); aviso('Meta salva'); }}>
              <Campo rotulo="Valor (R$)"><input inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} /></Campo>
              <button className="btn btn-contorno btn-sm">Salvar</button>
            </form>
          </section>
          <section className="card">
            <h2>Motivos de perda</h2>
            <ListaEditavel itens={config.motivos} placeholder="Novo motivo" onSalvar={(l) => salvarConfig('geral', { motivos: l })} />
          </section>
          <section className="card">
            <h2>Tarefas padrão</h2>
            <ListaEditavel numerada itens={config.tarefasPadrao} placeholder="Nova tarefa padrão" onSalvar={(l) => salvarConfig('geral', { tarefasPadrao: l })} />
          </section>
          <section className="card">
            <h2>Quem tem acesso</h2>
            {EMAILS_EQUIPE.map((e) => <span key={e}>{e}</span>)}
            <span className="small muted">Para incluir alguém, peça a alteração no código e nas regras do Firebase.</span>
          </section>
        </aside>
      </div>
    </main>
  );
}
