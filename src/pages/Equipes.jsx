import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Carregando, Modal, Seg, useAviso } from '../components/base';
import { Campo } from '../components/forms';
import { excluirItem, salvarItem, useColecao } from '../lib/db';
import { CONFIRMADOS, fmtData, iniciais, nomeMes, semanaLonga } from '../lib/util';

const BASE = import.meta.env.BASE_URL;

export default function Equipes() {
  const [params, setParams] = useSearchParams();
  const aba = params.get('aba') || 'cadastro';
  return (
    <main className="pagina">
      <div className="cabeca nao-imprimir">
        <div className="t"><span className="eyebrow">Equipes</span><h1 className="titulo">{aba === 'escala' ? 'Escala de trabalho' : 'Cadastro de equipes'}</h1></div>
        <Seg rotulo="Equipes" valor={aba} onChange={(v) => setParams({ aba: v })} opcoes={[['cadastro', 'Cadastro de equipes'], ['escala', 'Escala de trabalho']]} />
      </div>
      {aba === 'escala' ? <Escala mesInicial={params.get('mes')} /> : <Cadastro />}
    </main>
  );
}

// ---------- Cadastro ----------
function Cadastro() {
  const colaboradores = useColecao('colaboradores');
  const segurancas = useColecao('segurancas');
  const geradores = useColecao('geradores');
  const [form, setForm] = useState(null);
  if (!colaboradores || !segurancas || !geradores) return <Carregando />;
  const ordenar = (l) => [...l].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  const Bloco = ({ titulo, colecao, lista, descricao, detalhe }) => (
    <section className="card">
      <div className="card-cab"><h2>{titulo}</h2><button className="btn btn-contorno btn-sm" onClick={() => setForm({ colecao, item: { nome: '' } })}>Adicionar</button></div>
      <span className="small muted">{descricao}</span>
      {lista.length === 0 && <span className="muted">Ninguém cadastrado.</span>}
      {ordenar(lista).map((x) => (
        <button key={x.id} className="check" style={{ border: 'none', textAlign: 'left' }} onClick={() => setForm({ colecao, item: x })}>
          <span className="avatar" style={{ width: 34, height: 34 }}>{iniciais(x.nome)}</span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><b>{x.nome}</b><span className="small muted">{detalhe(x)}</span></span>
          <span className="small" style={{ color: 'var(--vinho)', fontWeight: 600 }}>Editar</span>
        </button>
      ))}
    </section>
  );
  return (
    <>
      <div className="grade" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Bloco titulo="Equipe do sítio" colecao="colaboradores" lista={colaboradores} descricao="Pessoas que trabalham nos eventos." detalhe={(x) => [x.telefone, x.email].filter(Boolean).join(' · ') || 'Sem contato'} />
        <Bloco titulo="Segurança" colecao="segurancas" lista={segurancas} descricao="Empresas, com a quantidade de profissionais por faixa de convidados." detalhe={(x) => `${(x.faixas || []).length} faixa(s)${x.contato ? ` · ${x.contato}` : ''}`} />
        <Bloco titulo="Gerador" colecao="geradores" lista={geradores} descricao="Empresas de gerador." detalhe={(x) => x.contato || 'Sem contato'} />
      </div>
      {form && <ItemForm {...form} onFechar={() => setForm(null)} />}
    </>
  );
}

function ItemForm({ colecao, item, onFechar }) {
  const aviso = useAviso();
  const [x, setX] = useState({ faixas: [], ...item });
  const titulos = { colaboradores: 'Pessoa da equipe do sítio', segurancas: 'Empresa de segurança', geradores: 'Empresa de gerador' };
  const salvar = async (e) => {
    e.preventDefault();
    const dados = { ...x, nome: x.nome.trim() };
    if (colecao !== 'segurancas') delete dados.faixas;
    else dados.faixas = (x.faixas || []).filter((f) => f.min !== '' && f.max !== '' && f.qtd !== '').map((f) => ({ min: Number(f.min), max: Number(f.max), qtd: Number(f.qtd) }));
    await salvarItem(colecao, dados);
    aviso('Salvo');
    onFechar();
  };
  const setF = (i, k, v) => setX({ ...x, faixas: x.faixas.map((f, j) => (j === i ? { ...f, [k]: v } : f)) });
  return (
    <Modal titulo={titulos[colecao]} onFechar={onFechar}>
      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Campo rotulo="Nome"><input required value={x.nome} onChange={(e) => setX({ ...x, nome: e.target.value })} /></Campo>
        {colecao === 'colaboradores' ? (
          <div className="campos">
            <Campo rotulo="Telefone"><input value={x.telefone || ''} onChange={(e) => setX({ ...x, telefone: e.target.value })} /></Campo>
            <Campo rotulo="E-mail"><input type="email" value={x.email || ''} onChange={(e) => setX({ ...x, email: e.target.value })} /></Campo>
          </div>
        ) : (
          <Campo rotulo="Contato"><input value={x.contato || ''} onChange={(e) => setX({ ...x, contato: e.target.value })} placeholder="Nome e telefone" /></Campo>
        )}
        {colecao === 'segurancas' && (
          <>
            <span className="eyebrow">Profissionais por faixa de convidados</span>
            {(x.faixas || []).map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 40px', gap: 8, alignItems: 'end' }}>
                <Campo rotulo="De"><input type="number" min="0" value={f.min} onChange={(e) => setF(i, 'min', e.target.value)} /></Campo>
                <Campo rotulo="Até"><input type="number" min="0" value={f.max} onChange={(e) => setF(i, 'max', e.target.value)} /></Campo>
                <Campo rotulo="Profissionais"><input type="number" min="0" value={f.qtd} onChange={(e) => setF(i, 'qtd', e.target.value)} /></Campo>
                <button type="button" className="btn-icone" style={{ border: 'none' }} aria-label="Remover faixa" onClick={() => setX({ ...x, faixas: x.faixas.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <button type="button" className="btn btn-texto btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setX({ ...x, faixas: [...(x.faixas || []), { min: '', max: '', qtd: '' }] })}>+ Adicionar faixa</button>
          </>
        )}
        <div className="modal-acoes">
          {item.id && <button type="button" className="btn btn-texto" onClick={async () => { if (window.confirm('Excluir?')) { await excluirItem(colecao, item.id); onFechar(); } }}>Excluir</button>}
          <button type="button" className="btn btn-claro" onClick={onFechar}>Cancelar</button>
          <button className="btn btn-primario">Salvar</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Escala ----------
function Escala({ mesInicial }) {
  const eventos = useColecao('eventos');
  const colaboradores = useColecao('colaboradores');
  const segurancas = useColecao('segurancas');
  const geradores = useColecao('geradores');
  const hoje = new Date();
  const [mes, setMes] = useState(mesInicial || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
  const [tipo, setTipo] = useState('todos');
  const [pessoa, setPessoa] = useState('');

  const doMes = useMemo(() => (eventos || []).filter((e) => CONFIRMADOS.includes(e.status) && e.data?.startsWith(mes)).sort((a, b) => a.data.localeCompare(b.data)), [eventos, mes]);
  if (!eventos || !colaboradores || !segurancas || !geradores) return <Carregando />;

  const nome = (l, i) => l.find((x) => x.id === i)?.nome;
  const opcoesPessoa = tipo === 'sitio' ? colaboradores : tipo === 'seguranca' ? segurancas : tipo === 'gerador' ? geradores : [];
  const linhas = doMes.filter((e) => {
    const p = e.planejamento || {};
    if (tipo === 'sitio') return pessoa ? (p.sitio || []).includes(pessoa) : (p.sitio || []).length > 0;
    if (tipo === 'seguranca') return pessoa ? p.segurancaId === pessoa : !!p.segurancaId;
    if (tipo === 'gerador') return pessoa ? p.geradorId === pessoa : !!p.geradorId;
    return true;
  });
  const acion = colaboradores.map((c) => ({ ...c, qtd: doMes.filter((e) => (e.planejamento?.sitio || []).includes(c.id)).length })).sort((a, b) => b.qtd - a.qtd);
  const [a, m] = mes.split('-').map(Number);
  const rotulo = pessoa ? nome(opcoesPessoa, pessoa) : { todos: 'Todas as equipes', sitio: 'Equipe do sítio', seguranca: 'Segurança', gerador: 'Gerador' }[tipo];
  const cols = { todos: ['sitio', 'seguranca', 'gerador'], sitio: ['sitio'], seguranca: ['seguranca'], gerador: ['gerador'] }[tipo];
  const cel = (e, c) => {
    const p = e.planejamento || {};
    if (c === 'sitio') return (p.sitio || []).map((i) => nome(colaboradores, i)).filter(Boolean).join(', ') || 'A definir';
    if (c === 'seguranca') return nome(segurancas, p.segurancaId) ? `${nome(segurancas, p.segurancaId)}${p.segurancaQtd ? ` · ${p.segurancaQtd} profissionais` : ''}` : 'A definir';
    return nome(geradores, p.geradorId) || 'A definir';
  };

  return (
    <>
      <section className="card nao-imprimir" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>
        <Campo rotulo="Mês"><input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></Campo>
        <div className="campo">Escala de<Seg rotulo="Tipo de escala" valor={tipo} onChange={(v) => { setTipo(v); setPessoa(''); }} opcoes={[['todos', 'Todos'], ['sitio', 'Equipe do sítio'], ['seguranca', 'Segurança'], ['gerador', 'Gerador']]} /></div>
        {tipo !== 'todos' && (
          <Campo rotulo="Pessoa ou empresa">
            <select value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
              <option value="">Todos</option>
              {opcoesPessoa.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </Campo>
        )}
        <span style={{ flex: 1 }} />
        <button className="btn btn-primario" onClick={() => window.print()}>Imprimir ou salvar PDF</button>
      </section>
      <div className="linha">
        <section className="card col-3" style={{ background: '#fff', boxShadow: 'var(--sombra-leve)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottom: '2px solid var(--dourado)' }}>
            <img src={`${BASE}logo.png`} alt="Sítio Geranium" style={{ height: 52 }} />
            <div><h2 style={{ fontSize: 20 }}>Escala de trabalho · {nomeMes(a, m - 1)}</h2><span className="small muted">{rotulo}</span></div>
          </div>
          {linhas.length === 0 ? <p className="muted">Nenhum evento nesta escala.</p> : (
            <div className="rolagem">
              <table className="tabela" style={{ minWidth: 520 }}>
                <thead><tr><th>Data</th><th>Evento</th>{cols.map((c) => <th key={c}>{{ sitio: 'Sítio', seguranca: 'Segurança', gerador: 'Gerador' }[c]}</th>)}</tr></thead>
                <tbody>
                  {linhas.map((e) => (
                    <tr key={e.id}>
                      <td><b style={{ color: 'var(--vinho-escuro)' }}>{fmtData(e.data).slice(0, 5)}</b><br /><span className="muted">{semanaLonga(e.data)}{e.horaInicio ? ` · ${e.horaInicio}` : ''}</span></td>
                      <td><Link to={`/planejamento/${e.id}`} style={{ fontWeight: 700, color: 'var(--texto)', textDecoration: 'none' }}>{e.nome}</Link><br /><span className="muted">{e.tipo}{e.convidados ? ` · ${e.convidados} convidados` : ''}</span></td>
                      {cols.map((c) => <td key={c}>{cel(e, c)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <span className="small muted">Gerado pelo sistema de Gestão de Eventos do Sítio Geranium.</span>
        </section>
        <aside className="card col-2 nao-imprimir">
          <h2>Acionamentos do mês</h2>
          <span className="small muted">Quantos eventos cada pessoa da equipe do sítio vai trabalhar.</span>
          {acion.length === 0 && <span className="muted">Cadastre a equipe do sítio.</span>}
          {acion.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--creme-2)' }}>
              <span className="avatar">{iniciais(c.nome)}</span><b style={{ flex: 1 }}>{c.nome}</b><span>{c.qtd} evento{c.qtd === 1 ? '' : 's'}</span>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
