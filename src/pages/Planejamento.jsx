import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Carregando } from '../components/base';
import { useColecao } from '../lib/db';
import { CONFIRMADOS, fmtDia, nomeMes, pad, semanaCurta } from '../lib/util';

export default function Planejamento() {
  const eventos = useColecao('eventos');
  const fichas = useColecao('fichas');
  const colaboradores = useColecao('colaboradores');
  const segurancas = useColecao('segurancas');
  const geradores = useColecao('geradores');
  const [ref, setRef] = useState(() => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() }; });
  const mudar = (d) => { const n = new Date(ref.ano, ref.mes + d, 1); setRef({ ano: n.getFullYear(), mes: n.getMonth() }); };

  const semanas = useMemo(() => {
    if (!eventos) return [];
    const prefixo = `${ref.ano}-${pad(ref.mes + 1)}`;
    const doMes = eventos.filter((e) => CONFIRMADOS.includes(e.status) && e.data?.startsWith(prefixo)).sort((a, b) => a.data.localeCompare(b.data));
    const primeiro = new Date(ref.ano, ref.mes, 1).getDay();
    const total = new Date(ref.ano, ref.mes + 1, 0).getDate();
    const mapa = new Map();
    doMes.forEach((e) => {
      const n = Math.ceil((Number(e.data.slice(8)) + primeiro) / 7);
      if (!mapa.has(n)) mapa.set(n, []);
      mapa.get(n).push(e);
    });
    return [...mapa.entries()].map(([n, lista]) => {
      const ini = Math.max(1, (n - 1) * 7 - primeiro + 1);
      const fim = Math.min(total, n * 7 - primeiro);
      return { n, faixa: `${ini} a ${fim}`, lista };
    });
  }, [eventos, ref]);

  if (!eventos || !fichas || !colaboradores || !segurancas || !geradores) return <div className="pagina"><Carregando /></div>;
  const fichaMap = Object.fromEntries(fichas.map((f) => [f.id, f]));
  const nome = (lista, id) => lista.find((x) => x.id === id)?.nome;

  const itens = (e) => {
    const p = e.planejamento || {};
    const sitio = (p.sitio || []).filter(Boolean);
    const ft = e.fichaTecnica?.token && fichaMap[e.fichaTecnica.token];
    return [
      ['Sítio', sitio.length ? `${sitio.length} pessoa${sitio.length > 1 ? 's' : ''}` : 'Definir', sitio.length > 0],
      ['Segurança', nome(segurancas, p.segurancaId) ? `${nome(segurancas, p.segurancaId)}${p.segurancaQtd ? ` · ${p.segurancaQtd}` : ''}` : 'Definir', !!p.segurancaId],
      ['Gerador', nome(geradores, p.geradorId) || 'Definir', !!p.geradorId],
      ['Ficha técnica', ft?.enviadaEm ? 'Recebida' : ft ? 'Aguardando' : 'Não enviada', !!ft?.enviadaEm],
    ];
  };
  const todos = semanas.flatMap((s) => s.lista);
  const prontos = todos.filter((e) => itens(e).every((i) => i[2])).length;

  return (
    <main className="pagina">
      <div className="cabeca">
        <div className="t">
          <span className="eyebrow">Planejamento</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-icone" aria-label="Mês anterior" onClick={() => mudar(-1)}>‹</button>
            <h1 className="titulo" style={{ minWidth: 250, textAlign: 'center' }}>{nomeMes(ref.ano, ref.mes)}</h1>
            <button className="btn-icone" aria-label="Próximo mês" onClick={() => mudar(1)}>›</button>
          </div>
        </div>
        <Link to={`/equipes?aba=escala&mes=${ref.ano}-${pad(ref.mes + 1)}`} className="btn btn-primario">Gerar escala de trabalho</Link>
      </div>

      <div className="chips">
        <span className="pill s-marrom" style={{ fontSize: 14, padding: '8px 16px' }}>{todos.length} evento{todos.length === 1 ? '' : 's'} no mês</span>
        <span className="pill s-verde" style={{ fontSize: 14, padding: '8px 16px' }}>{prontos} pronto{prontos === 1 ? '' : 's'}</span>
        {todos.length - prontos > 0 && <span className="pill s-laranja" style={{ fontSize: 14, padding: '8px 16px' }}>{todos.length - prontos} com pendências</span>}
      </div>

      {semanas.length === 0 && <div className="card vazio">Nenhum evento fechado neste mês.</div>}
      {semanas.map((s) => (
        <section key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="mes-cab"><h2 style={{ fontSize: 18 }}>Semana {s.n}</h2><span className="small muted">{s.faixa} de {nomeMes(ref.ano, ref.mes).split(' ')[0].toLowerCase()}</span></div>
          {s.lista.map((e) => (
            <Link key={e.id} to={`/planejamento/${e.id}`} className="item">
              <span className="data-circ"><b>{fmtDia(e.data)}</b><span>{semanaCurta(e.data)}</span></span>
              <span className="info" style={{ flex: '1 1 200px' }}>
                <span className="nome">{e.nome}</span>
                <span className="small muted">{[e.tipo, e.convidados ? `${e.convidados} convidados` : '', e.horaInicio].filter(Boolean).join(' · ')}</span>
              </span>
              <span style={{ flex: '2 1 380px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                {itens(e).map(([k, v, ok]) => (
                  <span key={k} className={ok ? 's-verde' : 's-laranja'} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px', borderRadius: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>{k}</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{v}</span>
                  </span>
                ))}
              </span>
            </Link>
          ))}
        </section>
      ))}
    </main>
  );
}
