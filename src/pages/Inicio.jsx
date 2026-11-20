import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Carregando, Pill, useUsuario } from '../components/base';
import { EventoForm, VisitaForm } from '../components/forms';
import { EnvioFichaTecnica, envioFichaPendente, resumoEnvios } from '../components/EnvioFichaTecnica';
import { criarEventoDaVisita, useColecao, useConfig } from '../lib/db';
import {
  ATIVOS, CONFIRMADOS, diasAte, estiloVisita, fimDeSemanaDoMes, fmtData, fmtLonga, fotoDoEvento, hojeISO,
  mesDe, moeda, nomeMes, progressoTarefas,
} from '../lib/util';

const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

export default function Inicio() {
  const usuario = useUsuario();
  const navegar = useNavigate();
  const config = useConfig();
  const eventos = useColecao('eventos');
  const visitas = useColecao('visitas');
  const fichas = useColecao('fichas');
  const [novaVisita, setNovaVisita] = useState(false);
  const [novoEvento, setNovoEvento] = useState(false);
  const [visitaAberta, setVisitaAberta] = useState(null);
  const [envioFicha, setEnvioFicha] = useState(null); // id do evento
  const hoje = hojeISO();

  const dados = useMemo(() => {
    if (!eventos || !visitas || !fichas) return null;
    const mesAtual = mesDe(hoje);
    const agora = new Date();
    const prox = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

    const futuros = eventos.filter((e) => e.data && e.data >= hoje && ATIVOS.includes(e.status)).sort((a, b) => a.data.localeCompare(b.data));
    const proximo = futuros.find((e) => CONFIRMADOS.includes(e.status)) || futuros[0];

    const deHoje = visitas.filter((v) => v.data === hoje && v.categoria !== 'bloqueio').sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

    const fechadosMes = eventos.filter((e) => CONFIRMADOS.includes(e.status) && mesDe(e.dataFechamento) === mesAtual);
    const valorMes = fechadosMes.reduce((s, e) => s + (Number(e.valorContrato) || 0), 0);

    const visitasMes = visitas.filter((v) => v.categoria === 'visita' && mesDe(v.data) === mesAtual && v.status !== 'cancelada');
    const perdidas = visitasMes.filter((v) => v.status === 'perdida');
    const motivos = {};
    perdidas.forEach((v) => { motivos[v.motivo || 'Sem motivo'] = (motivos[v.motivo || 'Sem motivo'] || 0) + 1; });
    const topMotivo = Object.entries(motivos).sort((a, b) => b[1] - a[1])[0];

    const fds = fimDeSemanaDoMes(prox.getFullYear(), prox.getMonth());
    const reservadas = new Set(eventos.filter((e) => CONFIRMADOS.includes(e.status) && fds.includes(e.data)).map((e) => e.data));

    const fichaPorToken = Object.fromEntries(fichas.map((f) => [f.id, f]));
    const atencao = [];
    eventos.forEach((e) => {
      const dias = diasAte(e.data);
      const rot = `${e.nome}${e.data ? ` (${fmtData(e.data).slice(0, 5)})` : ''}`;
      const fc = e.fichaCadastral?.token && fichaPorToken[e.fichaCadastral.token];
      if (fc && fc.aberta && !fc.enviadaEm) {
        const espera = Math.round((Date.now() - new Date(fc.criadaEm).getTime()) / 86400000);
        if (espera >= 3) atencao.push({ id: `fc${e.id}`, nome: rot, motivo: `Ficha cadastral aguardando há ${espera} dias`, acao: 'Abrir evento', to: `/eventos/${e.id}` });
      }
      if (CONFIRMADOS.includes(e.status) && e.status !== 'realizado' && dias !== null) {
        if (dias < 0) atencao.push({ id: `r${e.id}`, nome: rot, motivo: 'A data já passou: marcar como realizado', acao: 'Abrir evento', to: `/eventos/${e.id}` });
        else {
          const ftRecebida = !!(e.fichaTecnica?.token && fichaPorToken[e.fichaTecnica.token]?.enviadaEm);
          if (dias <= 30 && !ftRecebida && envioFichaPendente(e)) {
            const feito = resumoEnvios(e);
            atencao.push({ id: `ftw${e.id}`, nome: rot, motivo: `${dias === 0 ? 'É hoje' : dias === 1 ? 'Falta 1 dia' : `Faltam ${dias} dias`}: enviar a ficha técnica ${e.tipo === 'Casamento' ? 'aos noivos' : 'ao contratante'}${e.planejamento?.cerimonialTelefone ? ' e ao cerimonial' : ''}${feito ? ` · ${feito}` : ''}`, acao: 'Enviar pelo WhatsApp', envio: e.id });
          } else if (dias > 30 && dias <= 60 && !e.fichaTecnica?.token) atencao.push({ id: `ft${e.id}`, nome: rot, motivo: 'Ficha técnica ainda não foi enviada aos clientes', acao: 'Abrir evento', to: `/eventos/${e.id}` });
          const p = e.planejamento || {};
          if (dias <= 30 && (!(p.sitio || []).filter(Boolean).length || !p.segurancaId)) atencao.push({ id: `p${e.id}`, nome: rot, motivo: 'Equipe do sítio ou segurança não definida', acao: 'Planejar', to: `/planejamento/${e.id}` });
        }
      }
    });
    visitas.filter((v) => v.status === 'feita' && v.categoria === 'visita').forEach((v) => {
      atencao.push({ id: `v${v.id}`, nome: v.nome, motivo: `Visita feita em ${fmtData(v.data)}: criar evento ou marcar que não fechou`, acao: 'Decidir', visita: v });
    });

    return { proximo, deHoje, valorMes, visitasMes, perdidas, topMotivo, fds, reservadas, prox, atencao };
  }, [eventos, visitas, fichas, hoje]);

  if (!dados) return <div className="pagina"><Carregando /></div>;
  const { proximo, deHoje, valorMes, visitasMes, perdidas, topMotivo, fds, reservadas, prox, atencao } = dados;
  const meta = Number(config.meta) || 0;
  const pct = meta ? Math.min(100, Math.round((valorMes / meta) * 100)) : 0;
  const nomeUsuario = (usuario.displayName || '').split(' ')[0];
  const mapaFichas = Object.fromEntries(fichas.map((f) => [f.id, f]));
  const tecnicaRecebida = (ev) => !!(ev.fichaTecnica?.token && mapaFichas[ev.fichaTecnica.token]?.enviadaEm);

  const criarEventoDe = async (v) => {
    const id = await criarEventoDaVisita(v);
    navegar(`/eventos/${id}`);
  };

  return (
    <main className="pagina">
      <div className="cabeca">
        <div className="t">
          <span className="eyebrow">{fmtLonga(hoje)}</span>
          <h1 className="titulo">{saudacao()}{nomeUsuario ? `, ${nomeUsuario}` : ''}</h1>
        </div>
        <div className="acoes">
          <button className="btn btn-contorno" onClick={() => setNovaVisita(true)}>Nova visita</button>
          <button className="btn btn-primario" onClick={() => setNovoEvento(true)}>Novo evento</button>
        </div>
      </div>

      <div className="linha" style={{ alignItems: 'stretch' }}>
        {proximo ? (
          <Link to={`/eventos/${proximo.id}`} className="hero" style={{ flex: '3 1 520px' }}>
            <img src={fotoDoEvento(proximo)} alt="" />
            <div className="hero-in">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="selo">Próximo evento · {diasAte(proximo.data) === 0 ? 'hoje' : `em ${diasAte(proximo.data)} dias`}</span>
                <span className="grande">{proximo.nome}</span>
                <span className="sub">{fmtLonga(proximo.data)}{proximo.convidados ? ` · ${proximo.convidados} convidados` : ''}{proximo.horaInicio ? ` · ${proximo.horaInicio}` : ''}</span>
                <div className="chips">
                  {(() => { const t = progressoTarefas(proximo); return t.total ? <span className={`chip-claro${t.feitas < t.total ? ' alerta' : ''}`}>Tarefas {t.feitas} de {t.total}</span> : null; })()}
                  <span className={`chip-claro${tecnicaRecebida(proximo) ? '' : ' alerta'}`}>{tecnicaRecebida(proximo) ? 'Ficha técnica recebida' : 'Ficha técnica pendente'}</span>
                  <span className={`chip-claro${proximo.quitado ? '' : ' alerta'}`}>{proximo.quitado ? 'Quitado' : 'Não quitado'}</span>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="card" style={{ flex: '3 1 520px', justifyContent: 'center' }}>
            <h2>Nenhum evento à frente</h2>
            <p className="muted">Quando houver eventos com data, o próximo aparece aqui.</p>
          </div>
        )}
        <section className="card" style={{ flex: '2 1 320px' }}>
          <div className="card-cab"><h2>Visitas de hoje</h2><Link to="/agenda" className="small" style={{ fontWeight: 600 }}>Ver agenda</Link></div>
          {deHoje.length === 0 && <p className="muted">Nenhuma visita hoje.</p>}
          {deHoje.map((v) => (
            <button key={v.id} onClick={() => setVisitaAberta(v)} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '10px 0', border: 'none', borderTop: '1px solid var(--creme-2)', background: 'none', textAlign: 'left', cursor: 'pointer' }}>
              <b style={{ width: 54, color: 'var(--vinho)', fontSize: 16 }}>{v.hora}</b>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><b>{v.nome}</b><span className="small muted">{v.categoria === 'visita' ? v.tipoEvento : v.observacoes}</span></span>
              <Pill info={estiloVisita(v)} />
            </button>
          ))}
        </section>
      </div>

      <div className="grade">
        <section className="card stat">
          <span className="eyebrow">Fechado em {nomeMes(new Date().getFullYear(), new Date().getMonth()).split(' ')[0].toLowerCase()}</span>
          <span className="num">{moeda(valorMes)}</span>
          {meta > 0 && (<><div className="barra"><span style={{ width: `${pct}%` }} /></div><span className="small muted">Meta de {moeda(meta)} · {pct}%</span></>)}
        </section>
        <section className="card stat">
          <span className="eyebrow">Visitas no mês</span>
          <span className="num">{visitasMes.length}</span>
          <span className="small muted">{(() => { const n = visitasMes.filter((v) => v.status === 'evento').length; return `${n} ${n === 1 ? 'virou' : 'viraram'} evento`; })()} · {perdidas.length} não {perdidas.length === 1 ? 'fechou' : 'fecharam'}{topMotivo ? ` (mais comum: ${topMotivo[0].toLowerCase()})` : ''}</span>
        </section>
        <section className="card stat">
          <span className="eyebrow">{nomeMes(prox.getFullYear(), prox.getMonth()).split(' ')[0]} reservado</span>
          <span className="num">{reservadas.size} de {fds.length}</span>
          <span className="small muted">sextas, sábados e domingos · {fds.length - reservadas.size} datas livres</span>
        </section>
      </div>

      <section className="card">
        <h2>Precisa de atenção</h2>
        {atencao.length === 0 && <p className="muted">Tudo em dia.</p>}
        {atencao.map((p) => (
          <div key={p.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1px solid var(--creme-2)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: 'var(--terracota)' }} />
            <span style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}><b>{p.nome}</b><span className="small muted">{p.motivo}</span></span>
            {p.to ? <Link to={p.to} className="btn btn-contorno btn-sm">{p.acao}</Link> : p.envio ? <button className="btn btn-primario btn-sm" onClick={() => setEnvioFicha(p.envio)}>{p.acao}</button> : <button className="btn btn-contorno btn-sm" onClick={() => setVisitaAberta(p.visita)}>{p.acao}</button>}
          </div>
        ))}
      </section>

      {novaVisita && <VisitaForm onFechar={() => setNovaVisita(false)} />}
      {novoEvento && <EventoForm onFechar={() => setNovoEvento(false)} onCriado={(id) => navegar(`/eventos/${id}`)} />}
      {envioFicha && eventos.find((e) => e.id === envioFicha) && <EnvioFichaTecnica ev={eventos.find((e) => e.id === envioFicha)} onFechar={() => setEnvioFicha(null)} />}
      {visitaAberta && <VisitaForm visita={visitaAberta} onFechar={() => setVisitaAberta(null)} onCriarEvento={criarEventoDe} />}
    </main>
  );
}
