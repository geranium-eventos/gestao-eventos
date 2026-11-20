import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { Carregando, Seg, copiar, useAviso } from '../components/base';
import { Campo } from '../components/forms';
import { RespostasTecnica } from '../components/fichas';
import {
  atualizarEvento, criarFicha, linkFicha, reabrirFicha, useColecao, useDoc,
} from '../lib/db';
import { fmtLonga, nomeMes } from '../lib/util';

export function qtdSeguranca(empresa, convidados) {
  if (!empresa || !convidados) return null;
  const n = Number(convidados);
  const faixa = (empresa.faixas || []).find((f) => n >= Number(f.min) && n <= Number(f.max));
  return faixa ? Number(faixa.qtd) : null;
}

function doEvento(ev) {
  const base = ev.planejamento || {};
  return { sitio: [...(base.sitio || []), '', '', ''].slice(0, 3), segurancaId: base.segurancaId || '', geradorId: base.geradorId || '', mobiliario: base.mobiliario || '', obs: base.obs || '', quitado: !!ev.quitado };
}

export default function PlanejamentoEvento() {
  const { id } = useParams();
  const aviso = useAviso();
  const ev = useDoc(`eventos/${id}`);
  const fichas = useColecao('fichas', ['eventoId', '==', id]);
  const colaboradores = useColecao('colaboradores');
  const segurancas = useColecao('segurancas');
  const geradores = useColecao('geradores');
  const [p, setP] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const original = useRef(null); // como estava da última vez que foi carregado ou salvo
  const idCarregado = useRef(null);
  const alterado = !!p && JSON.stringify(p) !== original.current;

  // Carrega do evento; ao trocar de evento recomeça; se ninguém mexeu aqui, acompanha o que outra pessoa salvou.
  useEffect(() => {
    if (!ev) return;
    if (idCarregado.current !== id || !alterado) {
      const novo = doEvento(ev);
      original.current = JSON.stringify(novo);
      idCarregado.current = id;
      setP(novo);
    }
  }, [ev, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Avisa antes de sair da tela (menu, links, voltar) com alterações não salvas.
  const bloqueio = useBlocker(({ currentLocation, nextLocation }) => alterado && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (bloqueio.state !== 'blocked') return;
    if (window.confirm('Você tem alterações não salvas no planejamento. Sair mesmo assim?')) bloqueio.proceed();
    else bloqueio.reset();
  }, [bloqueio]);
  // Avisa ao fechar ou recarregar a aba.
  useEffect(() => {
    if (!alterado) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [alterado]);

  const empresa = useMemo(() => (segurancas || []).find((s) => s.id === p?.segurancaId), [segurancas, p]);
  const qtd = qtdSeguranca(empresa, ev?.convidados);
  const ft = (fichas || []).find((f) => f.id === ev?.fichaTecnica?.token);

  if (ev === undefined || (ev && (!p || idCarregado.current !== id)) || !colaboradores || !segurancas || !geradores || !fichas) return <div className="pagina"><Carregando /></div>;
  if (ev === null) return <div className="pagina"><div className="card vazio">Evento não encontrado.</div></div>;

  const mes = ev.data ? nomeMes(Number(ev.data.slice(0, 4)), Number(ev.data.slice(5, 7)) - 1).split(' ')[0].toLowerCase() : '';
  const salvar = async () => {
    setSalvando(true);
    const dados = {
      planejamento: { sitio: p.sitio.filter(Boolean), segurancaId: p.segurancaId, segurancaQtd: qtd || '', geradorId: p.geradorId, mobiliario: p.mobiliario, obs: p.obs },
      quitado: p.quitado,
    };
    if (ev.status === 'fechado') dados.status = 'planejamento';
    try {
      await atualizarEvento(ev.id, dados, 'Planejamento atualizado');
      original.current = JSON.stringify(p);
      aviso('Planejamento salvo');
    } catch (e) {
      aviso('Não foi possível salvar. Verifique a internet e tente de novo.');
    }
    setSalvando(false);
  };
  const setSitio = (i, v) => setP({ ...p, sitio: p.sitio.map((x, j) => (j === i ? v : x)) });

  return (
    <main className="pagina">
      <Link to="/planejamento" style={{ fontWeight: 600, textDecoration: 'none', alignSelf: 'flex-start' }}>← Planejamento{mes ? ` de ${mes}` : ''}</Link>
      <div className="cabeca">
        <div className="t">
          <span className="eyebrow">Planejamento do evento</span>
          <h1 className="titulo"><Link to={`/eventos/${ev.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{ev.nome}</Link></h1>
          <span className="sub">{fmtLonga(ev.data)} · {ev.tipo}{ev.convidados ? ` · ${ev.convidados} convidados` : ''}{ev.horaInicio ? ` · ${ev.horaInicio}` : ''}</span>
        </div>
        <div className="acoes">
          <Link to={`/os/${ev.id}`} className="btn btn-contorno">Imprimir O.S.</Link>
          {alterado && !salvando && <span className="small" style={{ color: 'var(--terracota-texto)', fontWeight: 600, alignSelf: 'center' }}>Alterações não salvas</span>}
          <button className="btn btn-primario" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar planejamento'}</button>
        </div>
      </div>

      <div className="linha">
        <div className="col-3" style={{ flex: '1 1 460px' }}>
          <section className="card">
            <h2>Equipes</h2>
            <span className="campo">Equipe do sítio</span>
            <div className="campos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              {[0, 1, 2].map((i) => (
                <select key={i} className="input" aria-label={`Colaborador ${i + 1}`} value={p.sitio[i]} onChange={(e) => setSitio(i, e.target.value)}>
                  <option value="">{i + 1}º colaborador</option>
                  {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              ))}
            </div>
            <Campo rotulo="Segurança">
              <select value={p.segurancaId} onChange={(e) => setP({ ...p, segurancaId: e.target.value })}>
                <option value="">Escolha a empresa…</option>
                {segurancas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </Campo>
            {p.segurancaId && (qtd
              ? <div className="ok-box">{ev.convidados} convidados → <b>{qtd} profissionais</b>, pela tabela da empresa</div>
              : <div className="alerta-box">{ev.convidados ? `Nenhuma faixa da tabela atende ${ev.convidados} convidados.` : 'Informe o número de convidados no evento para calcular.'}</div>)}
            <Campo rotulo="Gerador">
              <select value={p.geradorId} onChange={(e) => setP({ ...p, geradorId: e.target.value })}>
                <option value="">Escolha a empresa…</option>
                {geradores.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
              </select>
            </Campo>
            {colaboradores.length + segurancas.length + geradores.length === 0 && (
              <div className="alerta-box">Cadastre as equipes em <Link to="/equipes">Equipes</Link> para escolher aqui.</div>
            )}
          </section>
          <section className="card">
            <h2>Detalhes internos</h2>
            <Campo rotulo="Mobiliário"><input value={p.mobiliario} onChange={(e) => setP({ ...p, mobiliario: e.target.value })} placeholder="Locação, quantidades…" /></Campo>
            <Campo rotulo="Observações para a equipe"><textarea value={p.obs} onChange={(e) => setP({ ...p, obs: e.target.value })} placeholder="Acessibilidade, restrições, horários extras…" /></Campo>
            <div className="card-cab">
              <span className="campo">Quitação</span>
              <Seg rotulo="Quitação" valor={p.quitado ? 'sim' : 'nao'} onChange={(v) => setP({ ...p, quitado: v === 'sim' })} opcoes={[['nao', 'Não quitado'], ['sim', 'Quitado']]} />
            </div>
          </section>
        </div>

        <section className="card col-3" style={{ flex: '1 1 420px' }}>
          <div className="card-cab">
            <div><h2>Ficha técnica</h2><span className="small muted">{ft?.enviadaEm ? 'Respondida pelos noivos' : ft ? 'Aguardando os noivos' : 'Ainda não enviada'}</span></div>
            {ft?.enviadaEm && !ft.aberta && <button className="btn btn-claro btn-sm" onClick={async () => { await reabrirFicha(ft.id); await copiar(linkFicha(ft.id), aviso, 'Ficha reaberta e link copiado'); }}>Reabrir para os noivos</button>}
            {ft && (!ft.enviadaEm || ft.aberta) && <button className="btn btn-claro btn-sm" onClick={() => copiar(linkFicha(ft.id), aviso)}>Copiar link</button>}
            {!ft && <button className="btn btn-contorno btn-sm" onClick={async () => { const t = await criarFicha(ev, 'tecnica'); await copiar(linkFicha(t), aviso, 'Link criado e copiado'); }}>Gerar link para os noivos</button>}
          </div>
          {ft?.enviadaEm ? <RespostasTecnica r={ft.respostas} /> : <p className="muted">As respostas aparecem aqui assim que os noivos enviarem.</p>}
        </section>
      </div>
    </main>
  );
}
