import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Carregando, Pill, copiar, useAviso } from '../components/base';
import { BloqueioForm, VisitaForm, useHorariosLivres } from '../components/forms';
import { atualizarVisita, criarEventoDaVisita, linkAgendar, useColecao } from '../lib/db';
import { estiloVisita, fmtLonga, hojeISO, nomeMes, pad } from '../lib/util';

const CORES = {
  's-laranja': 'background:#f7e6d6;color:#8a3a12',
  's-verde': 'background:#e6ead9;color:#303e26',
  's-dourado': 'background:#f1e3c4;color:#6b5114',
  's-vinho': 'background:#f3dcdc;color:#591313',
  's-cinza': 'background:#ece6dc;color:#5b4a3d',
};
const estilo = (cls) => Object.fromEntries((CORES[cls] || '').split(';').filter(Boolean).map((p) => p.split(':')));

export default function Agenda() {
  const aviso = useAviso();
  const navegar = useNavigate();
  const visitas = useColecao('visitas');
  const hoje = hojeISO();
  const [ref, setRef] = useState(() => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() }; });
  const [sel, setSel] = useState(hoje);
  const [form, setForm] = useState(null);
  const [bloqueio, setBloqueio] = useState(false);
  const livres = useHorariosLivres(sel);

  const mudarMes = (d) => {
    const n = new Date(ref.ano, ref.mes + d, 1);
    setRef({ ano: n.getFullYear(), mes: n.getMonth() });
  };

  const porDia = useMemo(() => {
    const m = {};
    (visitas || []).forEach((v) => { (m[v.data] = m[v.data] || []).push(v); });
    Object.values(m).forEach((l) => l.sort((a, b) => (a.hora || '').localeCompare(b.hora || '')));
    return m;
  }, [visitas]);

  const celulas = useMemo(() => {
    const primeiro = new Date(ref.ano, ref.mes, 1).getDay();
    const total = new Date(ref.ano, ref.mes + 1, 0).getDate();
    const lista = [];
    for (let i = 0; i < primeiro; i++) lista.push(null);
    for (let d = 1; d <= total; d++) lista.push(`${ref.ano}-${pad(ref.mes + 1)}-${pad(d)}`);
    while (lista.length % 7) lista.push(null);
    return lista;
  }, [ref]);

  const resumo = useMemo(() => {
    const prefixo = `${ref.ano}-${pad(ref.mes + 1)}`;
    const doMes = (visitas || []).filter((v) => v.data?.startsWith(prefixo));
    const vis = doMes.filter((v) => v.categoria === 'visita' && v.status !== 'cancelada');
    return {
      total: vis.length,
      evento: vis.filter((v) => v.status === 'evento').length,
      perdidas: vis.filter((v) => v.status === 'perdida').length,
      tecnicas: doMes.filter((v) => v.categoria === 'tecnica' || v.categoria === 'previa').length,
    };
  }, [visitas, ref]);

  if (!visitas) return <div className="pagina"><Carregando /></div>;
  const doDia = porDia[sel] || [];

  const criarEvento = async (v) => {
    const id = await criarEventoDaVisita(v);
    aviso('Evento criado');
    navegar(`/eventos/${id}`);
  };

  return (
    <main className="pagina">
      <div className="cabeca">
        <div className="t">
          <span className="eyebrow">Agenda de visitas</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-icone" aria-label="Mês anterior" onClick={() => mudarMes(-1)}>‹</button>
            <h1 className="titulo" style={{ minWidth: 250, textAlign: 'center' }}>{nomeMes(ref.ano, ref.mes)}</h1>
            <button className="btn-icone" aria-label="Próximo mês" onClick={() => mudarMes(1)}>›</button>
          </div>
        </div>
        <div className="acoes">
          <button className="btn btn-contorno btn-sm" onClick={() => copiar(linkAgendar(), aviso, 'Link de agendamento copiado')}>Copiar link de agendamento</button>
          <button className="btn btn-contorno btn-sm" onClick={() => setBloqueio(true)}>Bloquear horários</button>
          <button className="btn btn-primario" onClick={() => setForm({ dataInicial: sel })}>Nova visita</button>
        </div>
      </div>

      <div className="linha">
        <section className="card col-3" aria-label="Calendário">
          <div className="cal-sem"><span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span></div>
          <div className="cal">
            {celulas.map((iso, i) => {
              if (!iso) return <div key={`x${i}`} className="dia fora" />;
              const lista = porDia[iso] || [];
              const cls = ['dia', iso === hoje ? 'hoje' : '', iso === sel ? 'sel' : '', new Date(iso + 'T12:00').getDay() === 0 ? 'dom' : ''].join(' ');
              return (
                <button key={iso} className={cls} onClick={() => setSel(iso)} aria-label={fmtLonga(iso)}>
                  <span className="n" style={{ color: iso === hoje ? 'var(--vinho)' : undefined }}>{Number(iso.slice(8))}</span>
                  {lista.slice(0, 3).map((v) => (
                    <span key={v.id} className="mini" style={estilo(estiloVisita(v).cls)}>{v.hora} {v.categoria === 'bloqueio' ? 'Bloqueado' : (v.nome || '').split(' ')[0]}</span>
                  ))}
                  {lista.length > 3 && <span className="small muted">+{lista.length - 3}</span>}
                </button>
              );
            })}
          </div>
          <div className="chips small muted" style={{ marginTop: 6 }}>
            <span>{resumo.total} visitas no mês</span>·<span>{resumo.evento} {resumo.evento === 1 ? 'virou' : 'viraram'} evento</span>·<span>{resumo.perdidas} não {resumo.perdidas === 1 ? 'fechou' : 'fecharam'}</span>·<span>{resumo.tecnicas} técnicas/prévias</span>
          </div>
        </section>

        <aside className="card col-2" aria-label="Visitas do dia">
          <div>
            <h2>{fmtLonga(sel).charAt(0).toUpperCase() + fmtLonga(sel).slice(1)}</h2>
            <span className="small muted">{livres.length ? `Livres: ${livres.join(', ')}` : 'Sem horários livres'}</span>
          </div>
          {doDia.length === 0 && <p className="muted">Nada marcado neste dia.</p>}
          {doDia.map((v) => (
            <article key={v.id} className="visita">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span className="hora">{v.hora}</span>
                <Pill info={estiloVisita(v)} />
              </div>
              <b style={{ fontSize: 16, color: 'var(--vinho-escuro)' }}>{v.categoria === 'bloqueio' ? 'Horário bloqueado' : v.nome}</b>
              <span className="small muted">
                {v.categoria === 'visita' ? `${v.tipoEvento || ''}${v.dataPrevista ? ` · pretende ${v.dataPrevista.split('-').reverse().join('/')}` : ''}${v.origem === 'site' ? ' · agendou pelo site' : ''}` : v.observacoes}
                {v.status === 'perdida' && v.motivo ? ` · ${v.motivo}` : ''}
              </span>
              <div className="acoes">
                {v.categoria === 'visita' && v.status === 'agendada' && (
                  <button className="btn btn-primario btn-sm" onClick={() => atualizarVisita(v, { status: 'feita' })}>Marcar como feita</button>
                )}
                {v.categoria === 'visita' && v.status === 'feita' && (
                  <>
                    <button className="btn btn-primario btn-sm" onClick={() => criarEvento(v)}>Criar evento</button>
                    <button className="btn btn-claro btn-sm" onClick={() => setForm({ visita: v, inicial: { status: 'perdida' } })}>Não fechou</button>
                  </>
                )}
                {v.status === 'evento' && v.eventoId && <button className="btn btn-claro btn-sm" onClick={() => navegar(`/eventos/${v.eventoId}`)}>Abrir evento</button>}
                <button className="btn btn-texto btn-sm" onClick={() => setForm({ visita: v })}>{v.categoria === 'bloqueio' ? 'Desbloquear / editar' : 'Editar'}</button>
              </div>
            </article>
          ))}
        </aside>
      </div>

      {form && <VisitaForm visita={form.visita} inicial={form.inicial} dataInicial={form.dataInicial} onFechar={() => setForm(null)} onCriarEvento={criarEvento} />}
      {bloqueio && <BloqueioForm onFechar={() => setBloqueio(false)} />}
    </main>
  );
}

