import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Carregando, Modal, Pill, Seg, copiar, useAviso } from '../components/base';
import { Campo, EventoForm } from '../components/forms';
import { RespostasTecnica } from '../components/fichas';
import {
  atualizarEvento, criarFicha, excluirEvento, linkFicha, mudarStatusEvento, reabrirFicha, useColecao, useConfig, useDoc,
} from '../lib/db';
import {
  CONFIRMADOS, ETAPAS, FOTOS, STATUS_EVENTO, diasAte, fmtData, fmtLonga, fmtQuando, fotoDoEvento, moeda, progressoTarefas,
} from '../lib/util';

export default function Evento() {
  const { id } = useParams();
  const navegar = useNavigate();
  const aviso = useAviso();
  const config = useConfig();
  const ev = useDoc(`eventos/${id}`);
  const fichas = useColecao('fichas', ['eventoId', '==', id]);
  const colaboradores = useColecao('colaboradores');
  const segurancas = useColecao('segurancas');
  const geradores = useColecao('geradores');
  const [editar, setEditar] = useState(false);
  const [foto, setFoto] = useState(false);
  const [etapa, setEtapa] = useState(false);
  const [verFicha, setVerFicha] = useState(null);
  const [novaTarefa, setNovaTarefa] = useState('');

  const fc = useMemo(() => (fichas || []).find((f) => f.id === ev?.fichaCadastral?.token), [fichas, ev]);
  const ft = useMemo(() => (fichas || []).find((f) => f.id === ev?.fichaTecnica?.token), [fichas, ev]);

  // Quando o cliente envia a ficha, os dados entram no evento.
  useEffect(() => {
    if (!ev || !fc?.enviadaEm || ev.fichaCadastral?.aplicadaEm === fc.enviadaEm) return;
    const r = fc.respostas || {};
    const { forma, parcelas, diaVencimento, convidados, horaInicio, horaConvite, cerimoniaRecepcao, ...contratantes } = r;
    atualizarEvento(ev.id, {
      contratantes: { ...(ev.contratantes || {}), ...contratantes },
      pagamento: { ...(ev.pagamento || {}), forma: forma || '', parcelas: parcelas || '', diaVencimento: diaVencimento || '' },
      ...(convidados ? { convidados: Number(convidados) } : {}),
      ...(horaInicio ? { horaInicio } : {}),
      ...(horaConvite ? { horaConvite } : {}),
      ...(cerimoniaRecepcao ? { cerimoniaRecepcao } : {}),
      fichaCadastral: { ...ev.fichaCadastral, status: 'recebida', aplicadaEm: fc.enviadaEm },
    }, 'Ficha cadastral recebida do cliente');
  }, [ev, fc]);
  useEffect(() => {
    if (!ev || !ft?.enviadaEm || ev.fichaTecnica?.aplicadaEm === ft.enviadaEm) return;
    const r = ft.respostas || {};
    atualizarEvento(ev.id, {
      ...(r.cerimonia === 'Sim' && r.local ? { localCerimonia: r.local } : {}),
      fichaTecnica: { ...ev.fichaTecnica, status: 'recebida', aplicadaEm: ft.enviadaEm },
    }, 'Ficha técnica recebida dos noivos');
  }, [ev, ft]);

  if (ev === undefined || !fichas) return <div className="pagina"><Carregando /></div>;
  if (ev === null) return <div className="pagina"><div className="card vazio">Evento não encontrado. <Link to="/eventos">Voltar</Link></div></div>;

  const idx = ETAPAS.findIndex((x) => x.id === ev.status);
  const proxima = idx >= 0 && idx < ETAPAS.length - 1 ? ETAPAS[idx + 1] : null;
  const dias = diasAte(ev.data);
  const t = progressoTarefas(ev);
  const c = ev.contratantes || {};
  const p = ev.planejamento || {};
  const nomeDe = (lista, i) => (lista || []).find((x) => x.id === i)?.nome;
  const tarefas = ev.tarefas || [];

  const avancar = async () => {
    await mudarStatusEvento(ev, proxima.id, config);
    aviso(`Etapa: ${proxima.nome}`);
  };
  const gerarLink = async (tipo) => {
    const token = await criarFicha(ev, tipo);
    if (tipo === 'cadastral' && ev.status === 'negociacao') await mudarStatusEvento(ev, 'contrato_enviado', config);
    await copiar(linkFicha(token), aviso, 'Link criado e copiado');
  };
  const salvarTarefas = (lista, texto) => atualizarEvento(ev.id, { tarefas: lista }, texto);

  const FichaBox = ({ tipo, ficha, info }) => {
    const nome = tipo === 'cadastral' ? 'Ficha cadastral' : 'Ficha técnica';
    if (!info?.token) {
      return (
        <div className="visita">
          <b>{nome}</b>
          <span className="small muted">{tipo === 'cadastral' ? 'Dados dos contratantes para o contrato.' : 'Estrutura, cronograma e fornecedores, preenchida pelos noivos.'}</span>
          <button className="btn btn-contorno btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => gerarLink(tipo)}>Gerar link para o cliente</button>
        </div>
      );
    }
    const recebida = !!ficha?.enviadaEm && !ficha?.aberta;
    return (
      <div className="visita" style={recebida ? { background: '#e6ead9' } : undefined}>
        <div className="card-cab"><b>{nome}</b><span className="small">{recebida ? `recebida ${fmtQuando(ficha.enviadaEm)}` : 'aguardando o cliente'}</span></div>
        <div className="acoes">
          {recebida && <button className="btn btn-claro btn-sm" onClick={() => setVerFicha({ tipo, ficha })}>Ver respostas</button>}
          {recebida && <button className="btn btn-texto btn-sm" onClick={async () => { await reabrirFicha(ficha.id); await copiar(linkFicha(ficha.id), aviso, 'Ficha reaberta e link copiado'); }}>Reabrir para o cliente</button>}
          {!recebida && <button className="btn btn-claro btn-sm" onClick={() => copiar(linkFicha(info.token), aviso)}>Copiar link</button>}
        </div>
      </div>
    );
  };

  return (
    <main className="pagina">
      <Link to="/eventos" style={{ fontWeight: 600, textDecoration: 'none', alignSelf: 'flex-start' }}>← Todos os eventos</Link>

      <section className="hero" style={{ minHeight: 290 }}>
        <img src={fotoDoEvento(ev)} alt="" />
        <div className="hero-in">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ alignSelf: 'flex-start' }}><Pill info={STATUS_EVENTO[ev.status] || STATUS_EVENTO.negociacao} /></span>
            <h1>{ev.nome}</h1>
            <span className="sub">{ev.tipo} · {fmtLonga(ev.data)}{ev.data && dias !== null && dias >= 0 ? ` · ${dias === 0 ? 'hoje' : `em ${dias} dias`}` : ''}</span>
          </div>
          <div className="acoes">
            <button className="btn btn-sm" style={{ background: 'rgba(255,253,248,.14)', border: '1px solid rgba(255,253,248,.6)', color: '#fffdf8' }} onClick={() => setFoto(true)}>Trocar foto</button>
            <Link className="btn btn-sm btn-claro" to={`/os/${ev.id}`}>Imprimir O.S.</Link>
            <button className="btn btn-sm btn-claro" onClick={() => setEtapa(true)}>Mudar etapa</button>
            {proxima && <button className="btn btn-primario btn-sm" onClick={avancar}>Avançar para {proxima.nome.toLowerCase()}</button>}
          </div>
        </div>
      </section>

      {idx >= 0 ? (
        <ol className="etapas" aria-label="Etapas do evento">
          {ETAPAS.map((x, i) => <li key={x.id} className={i < idx ? 'feita' : i === idx ? 'atual' : ''}>{x.nome}</li>)}
        </ol>
      ) : (
        <div className="alerta-box">Este evento está como <b>{STATUS_EVENTO[ev.status]?.nome}</b>{ev.motivo ? ` · motivo: ${ev.motivo}` : ''}.</div>
      )}

      <div className="linha">
        <div className="col-3">
          <section className="card">
            <div className="card-cab"><h2>O evento</h2><button className="btn btn-contorno btn-sm" onClick={() => setEditar(true)}>Editar dados do contrato</button></div>
            <div className="dados">
              <div className="dado"><span className="k">Data</span><span className="v">{fmtData(ev.data)}</span></div>
              <div className="dado"><span className="k">Convidados</span><span className="v">{ev.convidados || '—'}</span></div>
              <div className="dado"><span className="k">Início</span><span className="v">{ev.horaInicio || '—'}</span></div>
              <div className="dado"><span className="k">Convite</span><span className="v">{ev.horaConvite || '—'}</span></div>
              <div className="dado"><span className="k">No local</span><span className="v" style={{ fontSize: 15 }}>{ev.cerimoniaRecepcao || '—'}</span></div>
              <div className="dado"><span className="k">Cerimônia</span><span className="v" style={{ fontSize: 15 }}>{ev.localCerimonia || '—'}</span></div>
            </div>
          </section>

          <section className="card">
            <h2>Contratantes</h2>
            <div className="dados" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {ev.tipo === 'Casamento' ? (
                <>
                  <div><b style={{ color: 'var(--vinho-escuro)' }}>{c.nomeEla || 'Noiva'}</b><br /><span className="muted">{c.telefone1 || ev.contatos?.telefone || '—'}</span></div>
                  <div><b style={{ color: 'var(--vinho-escuro)' }}>{c.nomeEle || 'Noivo'}</b><br /><span className="muted">{c.telefone2 || '—'}</span></div>
                </>
              ) : (
                <div><b style={{ color: 'var(--vinho-escuro)' }}>{c.nomeLocatario || ev.nome}</b><br /><span className="muted">{c.telefone1 || ev.contatos?.telefone || '—'}</span></div>
              )}
              <div><b style={{ color: 'var(--vinho-escuro)' }}>E-mail</b><br /><span className="muted">{c.email || ev.contatos?.email || '—'}</span></div>
              <div><b style={{ color: 'var(--vinho-escuro)' }}>Endereço</b><br /><span className="muted">{[c.endereco, c.bairro, c.cidade && `${c.cidade}${c.uf ? `/${c.uf}` : ''}`].filter(Boolean).join(', ') || '—'}</span></div>
              <div><b style={{ color: 'var(--vinho-escuro)' }}>CPF / CNPJ</b><br /><span className="muted">{c.cpf || '—'}</span></div>
              {ev.visitaId && <div><b style={{ color: 'var(--vinho-escuro)' }}>Origem</b><br /><Link to="/agenda">Veio de uma visita</Link></div>}
            </div>
          </section>

          <section className="card" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h2>Contrato e quitação</h2>
              <span className="small muted">{ev.valorContrato ? `Valor do contrato: ${moeda(ev.valorContrato)}` : 'Valor do contrato não informado'}{ev.pagamento?.forma ? ` · ${ev.pagamento.forma}` : ''} · pagamentos no Conta Azul</span>
            </div>
            <Seg rotulo="Quitação" valor={ev.quitado ? 'sim' : 'nao'} onChange={(v) => atualizarEvento(ev.id, { quitado: v === 'sim' }, v === 'sim' ? 'Marcado como quitado' : 'Marcado como não quitado')} opcoes={[['nao', 'Não quitado'], ['sim', 'Quitado']]} />
          </section>
        </div>

        <aside className="col-2">
          <section className="card">
            <h2>Fichas do cliente</h2>
            <FichaBox tipo="cadastral" ficha={fc} info={ev.fichaCadastral} />
            <FichaBox tipo="tecnica" ficha={ft} info={ev.fichaTecnica} />
          </section>

          {CONFIRMADOS.includes(ev.status) && (
            <section className="card">
              <div className="card-cab"><h2>Equipe do dia</h2><Link to={`/planejamento/${ev.id}`} className="small" style={{ fontWeight: 600 }}>Planejar</Link></div>
              <div className="kv"><span className="k">Sítio</span><span className="v">{(p.sitio || []).map((i) => nomeDe(colaboradores, i)).filter(Boolean).join(', ') || 'A definir'}</span></div>
              <div className="kv"><span className="k">Segurança</span><span className="v">{nomeDe(segurancas, p.segurancaId) ? `${nomeDe(segurancas, p.segurancaId)}${p.segurancaQtd ? ` · ${p.segurancaQtd} profissionais` : ''}` : 'A definir'}</span></div>
              <div className="kv"><span className="k">Gerador</span><span className="v">{nomeDe(geradores, p.geradorId) || 'A definir'}</span></div>
            </section>
          )}

          {(tarefas.length > 0 || CONFIRMADOS.includes(ev.status)) && (
            <section className="card">
              <h2>Tarefas · {t.feitas} de {t.total}</h2>
              {tarefas.map((x, i) => (
                <div key={`${x.t}${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label className={`check${x.feita ? ' feita' : ''}`} style={{ flex: 1 }}>
                    <input type="checkbox" checked={!!x.feita} onChange={() => salvarTarefas(tarefas.map((y, j) => (j === i ? { ...y, feita: !y.feita } : y)), `${x.feita ? 'Desmarcou' : 'Concluiu'}: ${x.t}`)} />
                    <span>{x.t}</span>
                  </label>
                  <button className="btn-icone" style={{ border: 'none' }} aria-label={`Remover ${x.t}`} onClick={() => window.confirm(`Remover "${x.t}"?`) && salvarTarefas(tarefas.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
              <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (!novaTarefa.trim()) return; salvarTarefas([...tarefas, { t: novaTarefa.trim(), feita: false }]); setNovaTarefa(''); }}>
                <input className="input" placeholder="Nova tarefa para este evento" value={novaTarefa} onChange={(e) => setNovaTarefa(e.target.value)} />
                <button className="btn btn-contorno btn-sm">Adicionar</button>
              </form>
            </section>
          )}

          <section className="card">
            <h2>Histórico</h2>
            {[...(ev.historico || [])].reverse().slice(0, 12).map((h, i) => (
              <div key={i} className="small"><b style={{ color: 'var(--vinho-escuro)' }}>{fmtQuando(h.em)}</b> · {h.texto}</div>
            ))}
          </section>
        </aside>
      </div>

      {editar && <EventoForm evento={ev} onFechar={() => setEditar(false)} />}

      {foto && (
        <Modal titulo="Foto do evento" onFechar={() => setFoto(false)}>
          <p className="muted" style={{ margin: 0 }}>Sem escolha, a foto segue o local da cerimônia.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
            {Object.entries(FOTOS).map(([k, url]) => (
              <button key={k} onClick={async () => { await atualizarEvento(ev.id, { foto: k, fotoUrl: '' }); setFoto(false); }} style={{ padding: 0, border: ev.foto === k ? '3px solid var(--vinho)' : '3px solid transparent', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', height: 90 }}>
                <img src={url} alt={k} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
          <FotoUrl atual={ev.fotoUrl} onSalvar={async (url) => { await atualizarEvento(ev.id, { fotoUrl: url }); setFoto(false); }} />
          <div className="modal-acoes">
            <button className="btn btn-texto" onClick={async () => { await atualizarEvento(ev.id, { foto: '', fotoUrl: '' }); setFoto(false); }}>Usar a foto automática</button>
            <button className="btn btn-claro" onClick={() => setFoto(false)}>Fechar</button>
          </div>
        </Modal>
      )}

      {etapa && <MudarEtapa ev={ev} config={config} onFechar={() => setEtapa(false)} onExcluido={() => navegar('/eventos')} />}

      {verFicha && (
        <Modal titulo={verFicha.tipo === 'cadastral' ? 'Ficha cadastral' : 'Ficha técnica'} onFechar={() => setVerFicha(null)} largura={640}>
          {verFicha.tipo === 'tecnica' ? <RespostasTecnica r={verFicha.ficha.respostas} /> : (
            <div>
              {Object.entries(verFicha.ficha.respostas || {}).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="kv"><span className="k">{ROTULOS_CADASTRAL[k] || k}</span><span className="v">{String(v)}</span></div>
              ))}
            </div>
          )}
          <div className="modal-acoes"><button className="btn btn-claro" onClick={() => setVerFicha(null)}>Fechar</button></div>
        </Modal>
      )}
    </main>
  );
}

export const ROTULOS_CADASTRAL = {
  nomeEla: 'Noiva', nomeEle: 'Noivo', nomeLocatario: 'Responsável', responsavel: 'Responsável pelo contrato', cpf: 'CPF', rg: 'RG',
  orgaoExp: 'Órgão expedidor', nacionalidade: 'Nacionalidade', profissao: 'Profissão', telefone1: 'Telefone 1', telefone2: 'Telefone 2',
  email: 'E-mail', cep: 'CEP', endereco: 'Endereço', bairro: 'Bairro', cidade: 'Cidade', uf: 'UF', forma: 'Forma de pagamento',
  parcelas: 'Parcelas', diaVencimento: 'Dia de vencimento', convidados: 'Convidados', horaInicio: 'Início', horaConvite: 'Horário no convite',
  cerimoniaRecepcao: 'No local',
};

function FotoUrl({ atual, onSalvar }) {
  const [url, setUrl] = useState(atual || '');
  return (
    <form style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); if (url.trim()) onSalvar(url.trim()); }}>
      <Campo rotulo="Ou cole o link de uma foto do casal"><input type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} /></Campo>
      <button className="btn btn-contorno btn-sm">Usar</button>
    </form>
  );
}

function MudarEtapa({ ev, config, onFechar, onExcluido }) {
  const aviso = useAviso();
  const [status, setStatus] = useState(ev.status);
  const [motivo, setMotivo] = useState(ev.motivo || '');
  const precisaMotivo = ['cancelado', 'perdido'].includes(status);
  const salvar = async () => {
    if (precisaMotivo && !motivo) return aviso('Informe o motivo', true);
    await mudarStatusEvento(ev, status, config, precisaMotivo ? motivo : '');
    aviso('Etapa atualizada');
    onFechar();
  };
  return (
    <Modal titulo="Mudar etapa" onFechar={onFechar}>
      <Campo rotulo="Etapa">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(STATUS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
        </select>
      </Campo>
      {precisaMotivo && (
        <Campo rotulo="Motivo">
          <input list="motivos" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <datalist id="motivos">{config.motivos.map((m) => <option key={m} value={m} />)}</datalist>
        </Campo>
      )}
      <div className="modal-acoes">
        <button className="btn btn-texto" onClick={async () => { if (window.confirm('Excluir este evento de vez? Não dá para desfazer.')) { await excluirEvento(ev.id); onExcluido(); } }}>Excluir evento</button>
        <button className="btn btn-claro" onClick={onFechar}>Cancelar</button>
        <button className="btn btn-primario" onClick={salvar}>Salvar</button>
      </div>
    </Modal>
  );
}
