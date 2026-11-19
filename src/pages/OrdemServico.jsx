import { Link, useParams } from 'react-router-dom';
import { Carregando } from '../components/base';
import { RespostasTecnica } from '../components/fichas';
import { useColecao, useDoc } from '../lib/db';
import { fmtData, fmtLonga } from '../lib/util';

const BASE = import.meta.env.BASE_URL;

export default function OrdemServico() {
  const { id } = useParams();
  const ev = useDoc(`eventos/${id}`);
  const fichas = useColecao('fichas', ['eventoId', '==', id]);
  const colaboradores = useColecao('colaboradores');
  const segurancas = useColecao('segurancas');
  const geradores = useColecao('geradores');
  if (ev === undefined || !fichas || !colaboradores || !segurancas || !geradores) return <div className="pagina"><Carregando /></div>;
  if (!ev) return <div className="pagina"><div className="card vazio">Evento não encontrado.</div></div>;
  const p = ev.planejamento || {};
  const nome = (l, i) => l.find((x) => x.id === i)?.nome;
  const ft = fichas.find((f) => f.id === ev.fichaTecnica?.token);

  return (
    <main className="pagina">
      <div className="acoes nao-imprimir">
        <Link to={`/planejamento/${ev.id}`} className="btn btn-claro">Voltar</Link>
        <button className="btn btn-primario" onClick={() => window.print()}>Imprimir ou salvar PDF</button>
      </div>
      <section className="card doc-impressao" style={{ background: '#fff', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 14, borderBottom: '2px solid var(--dourado)' }}>
          <img src={`${BASE}logo.png`} alt="Sítio Geranium" style={{ height: 64 }} />
          <div>
            <h1 style={{ fontSize: 26 }}>Ordem de Serviço</h1>
            <span className="muted">{ev.nome} · {ev.tipo} · {fmtLonga(ev.data)} ({fmtData(ev.data)})</span>
          </div>
        </div>
        <div className="dados">
          <div className="dado"><span className="k">Convidados</span><span className="v">{ev.convidados || '—'}</span></div>
          <div className="dado"><span className="k">Início</span><span className="v">{ev.horaInicio || '—'}</span></div>
          <div className="dado"><span className="k">Convite</span><span className="v">{ev.horaConvite || '—'}</span></div>
          <div className="dado"><span className="k">No local</span><span className="v" style={{ fontSize: 15 }}>{ev.cerimoniaRecepcao || '—'}</span></div>
        </div>
        <div className="bloco">
          <span className="eyebrow">Equipes escaladas</span>
          <div className="kv"><span className="k">Sítio</span><span className="v">{(p.sitio || []).map((i) => nome(colaboradores, i)).filter(Boolean).join(', ') || '—'}</span></div>
          <div className="kv"><span className="k">Segurança</span><span className="v">{nome(segurancas, p.segurancaId) ? `${nome(segurancas, p.segurancaId)}${p.segurancaQtd ? ` · ${p.segurancaQtd} profissionais` : ''}` : '—'}</span></div>
          <div className="kv"><span className="k">Gerador</span><span className="v">{nome(geradores, p.geradorId) || '—'}</span></div>
          <div className="kv"><span className="k">Mobiliário</span><span className="v">{p.mobiliario || '—'}</span></div>
        </div>
        {p.obs && <div className="bloco"><span className="eyebrow">Observações para a equipe</span><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{p.obs}</p></div>}
        {ft?.respostas ? <RespostasTecnica r={ft.respostas} /> : <div className="bloco"><span className="eyebrow">Ficha técnica</span><span className="muted">Ainda não preenchida pelos noivos.</span></div>}
        <span className="small muted">Gerado pelo sistema de Gestão de Eventos do Sítio Geranium.</span>
      </section>
    </main>
  );
}
