import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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

  useEffect(() => {
    if (ev && p === null) {
      const base = ev.planejamento || {};
      setP({ sitio: [...(base.sitio || []), '', '', ''].slice(0, 3), segurancaId: base.segurancaId || '', geradorId: base.geradorId || '', mobiliario: base.mobiliario || '', obs: base.obs || '', quitado: !!ev.quitado });
    }
  }, [ev, p]);

  const empresa = useMemo(() => (segurancas || []).find((s) => s.id === p?.segurancaId), [segurancas, p]);
  const qtd = qtdSeguranca(empresa, ev?.convidados);
  const ft = (fichas || []).find((f) => f.id === ev?.fichaTecnica?.token);

  if (ev === undefined || !p || !colaboradores || !segurancas || !geradores || !fichas) return <div className="pagina"><Carregando /></div>;
  if (ev === null) return <div className="pagina"><div className="card vazio">Evento não encontrado.</div></div>;

  const mes = ev.data ? nomeMes(Number(ev.data.slice(0, 4)), Number(ev.data.slice(5, 7)) - 1).split(' ')[0].toLowerCase() : '';
  const salvar = async () => {
    setSalvando(true);
    const dados = {
      planejamento: { sitio: p.sitio.filter(Boolean), segurancaId: p.segurancaId, segurancaQtd: qtd || '', geradorId: p.geradorId, mobiliario: p.mobiliario, obs: p.obs },
      quitado: p.quitado,
    };
    if (ev.status === 'fechado') dados.status = 'planejamento';
    await atualizarEvento(ev.id, dados, 'Planejamento atualizado');
    setSalvando(false);
    aviso('Planejamento salvo');
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
