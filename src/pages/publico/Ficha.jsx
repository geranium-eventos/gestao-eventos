import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { enviarFicha, lerFicha, salvarRascunho } from '../../lib/db';
import { Campo } from '../../components/forms';
import { FORNECEDORES } from '../../components/fichas';
import { FOTOS, LOCAIS, fmtData } from '../../lib/util';

const BASE = import.meta.env.BASE_URL;

export default function Ficha() {
  const { token } = useParams();
  const [ficha, setFicha] = useState(undefined);
  const [feito, setFeito] = useState(false);
  useEffect(() => {
    setFicha(undefined);
    setFeito(false);
    lerFicha(token).then(setFicha).catch(() => setFicha(null));
  }, [token]);

  if (ficha === undefined) return <div className="pub"><div className="fim-pub">Carregando…</div></div>;
  const Final = ({ titulo, texto }) => (
    <div className="pub"><div className="fim-pub">
      <img src={`${BASE}logo.png`} alt="Sítio Geranium" style={{ height: 80 }} />
      <h1 style={{ fontSize: 26 }}>{titulo}</h1>
      <p className="muted" style={{ margin: 0 }}>{texto}</p>
    </div></div>
  );
  if (!ficha) return <Final titulo="Link inválido" texto="Confira o link com a equipe do Sítio Geranium." />;
  if (feito) return <Final titulo="Recebemos sua ficha!" texto="Obrigado. Nossa equipe já está com as informações." />;
  if (!ficha.aberta) return <Final titulo="Ficha já enviada" texto="Se precisar alterar algo, fale com a equipe do Sítio Geranium." />;
  return ficha.tipo === 'cadastral'
    ? <FichaCadastral ficha={ficha} onEnviada={() => setFeito(true)} />
    : <FichaTecnica ficha={ficha} onEnviada={() => setFeito(true)} />;
}

// ---------- Ficha cadastral ----------
function FichaCadastral({ ficha, onEnviada }) {
  const casamento = ficha.tipoEvento === 'Casamento';
  const [r, setR] = useState(() => ({ nacionalidade: 'Brasileira', cidade: 'Brasília', uf: 'DF', ...(ficha.prefill || {}), ...(ficha.rascunho || {}) }));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const set = (k) => (e) => setR({ ...r, [k]: e.target.value });
  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try { await enviarFicha(ficha.id, r); onEnviada(); } catch (err) { console.error(err); setErro('Não foi possível enviar. Tente de novo.'); setEnviando(false); }
  };
  return (
    <div className="pub">
      <div style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
        <img src={`${BASE}logo.png`} alt="Sítio Geranium" style={{ height: 70 }} />
        <span className="eyebrow">Ficha cadastral do contrato</span>
        <h1 style={{ fontSize: 24 }}>Olá, {ficha.nome}!</h1>
        <span className="muted">Preencha seus dados para prepararmos o contrato.</span>
      </div>
      <form className="pub-corpo" onSubmit={enviar}>
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7F1C1C" strokeWidth="2" strokeLinecap="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <span><b style={{ color: 'var(--vinho-escuro)' }}>{ficha.tipoEvento} · {ficha.data ? fmtData(ficha.data) : 'data a confirmar'}</b><br /><span className="small muted">Data definida com a equipe</span></span>
        </div>
        <span className="passo">{casamento ? 'Dados do casal' : 'Dados do responsável'}</span>
        {casamento ? (
          <>
            <Campo rotulo="Nome completo da noiva"><input required value={r.nomeEla || ''} onChange={set('nomeEla')} /></Campo>
            <Campo rotulo="Nome completo do noivo"><input required value={r.nomeEle || ''} onChange={set('nomeEle')} /></Campo>
            <Campo rotulo="Quem assina o contrato"><input required value={r.responsavel || ''} onChange={set('responsavel')} placeholder="Nome completo" /></Campo>
          </>
        ) : (
          <Campo rotulo="Nome completo do responsável"><input required value={r.nomeLocatario || ''} onChange={set('nomeLocatario')} /></Campo>
        )}
        <Campo rotulo="CPF / CNPJ de quem assina"><input required value={r.cpf || ''} onChange={set('cpf')} /></Campo>
        <div className="campos">
          <Campo rotulo="RG"><input value={r.rg || ''} onChange={set('rg')} /></Campo>
          <Campo rotulo="Órgão expedidor"><input value={r.orgaoExp || ''} onChange={set('orgaoExp')} /></Campo>
          <Campo rotulo="Nacionalidade"><input value={r.nacionalidade || ''} onChange={set('nacionalidade')} /></Campo>
          <Campo rotulo="Profissão"><input value={r.profissao || ''} onChange={set('profissao')} /></Campo>
        </div>
        <div className="campos">
          <Campo rotulo={casamento ? 'WhatsApp da noiva' : 'WhatsApp'}><input required type="tel" value={r.telefone1 || r.telefone || ''} onChange={set('telefone1')} /></Campo>
          {casamento && <Campo rotulo="WhatsApp do noivo"><input type="tel" value={r.telefone2 || ''} onChange={set('telefone2')} /></Campo>}
        </div>
        <Campo rotulo="E-mail"><input type="email" required value={r.email || ''} onChange={set('email')} /></Campo>

        <span className="passo">Endereço</span>
        <div className="campos">
          <Campo rotulo="CEP"><input value={r.cep || ''} onChange={set('cep')} /></Campo>
          <Campo rotulo="Bairro"><input required value={r.bairro || ''} onChange={set('bairro')} /></Campo>
        </div>
        <Campo rotulo="Rua, número e complemento"><input required value={r.endereco || ''} onChange={set('endereco')} /></Campo>
        <div className="campos">
          <Campo rotulo="Cidade"><input required value={r.cidade || ''} onChange={set('cidade')} /></Campo>
          <Campo rotulo="UF"><input required maxLength={2} value={r.uf || ''} onChange={set('uf')} /></Campo>
        </div>

        <span className="passo">Sobre o evento</span>
        <div className="campos">
          <Campo rotulo="Convidados (estimativa)"><input type="number" min="0" value={r.convidados || ficha.convidados || ''} onChange={set('convidados')} /></Campo>
          <Campo rotulo="Horário de início"><input type="time" value={r.horaInicio || ''} onChange={set('horaInicio')} /></Campo>
          <Campo rotulo="Horário no convite"><input type="time" value={r.horaConvite || ''} onChange={set('horaConvite')} /></Campo>
        </div>
        <span className="campo">O que será feito no local?</span>
        <div className="opcoes">
          {['Cerimônia e recepção', 'Apenas recepção', 'Apenas cerimônia'].map((o) => <button type="button" key={o} className={`opcao${r.cerimoniaRecepcao === o ? ' on' : ''}`} onClick={() => setR({ ...r, cerimoniaRecepcao: o })}>{o}</button>)}
        </div>

        <span className="passo">Forma de pagamento preferida</span>
        <div className="opcoes">
          {['PIX à vista', 'Entrada + parcelas', 'Cartão'].map((o) => <button type="button" key={o} className={`opcao${r.forma === o ? ' on' : ''}`} onClick={() => setR({ ...r, forma: o })}>{o}</button>)}
        </div>
        {r.forma && r.forma !== 'PIX à vista' && (
          <div className="campos">
            <Campo rotulo="Quantas parcelas?"><input type="number" min="1" value={r.parcelas || ''} onChange={set('parcelas')} /></Campo>
            <Campo rotulo="Melhor dia de vencimento"><input type="number" min="1" max="31" value={r.diaVencimento || ''} onChange={set('diaVencimento')} /></Campo>
          </div>
        )}
        {erro && <div className="alerta-box">{erro}</div>}
        <button className="btn btn-primario btn-grande" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar ficha'}</button>
      </form>
    </div>
  );
}

// ---------- Ficha técnica (4 etapas, salva sozinha) ----------
function FichaTecnica({ ficha, onEnviada }) {
  const [r, setR] = useState(() => ({ fornecedores: {}, ...(ficha.rascunho || {}) }));
  const [etapa, setEtapa] = useState(0);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const timer = useRef(null);
  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  const setForn = (id, k, v) => setR((x) => ({ ...x, fornecedores: { ...x.fornecedores, [id]: { ...(x.fornecedores[id] || {}), [k]: v } } }));

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { salvarRascunho(ficha.id, r).catch(() => {}); }, 1200);
    return () => clearTimeout(timer.current);
  }, [r, ficha.id]);

  const total = (Number(r.cadSalao) || 0) + (Number(r.cadCerimonia) || 0);
  const ETAPAS = ['Estrutura', 'Suíte e cronograma', 'Fornecedores', 'Observações'];

  const validar = () => {
    if (etapa === 0) {
      if (!r.cerimonia) return 'Responda se haverá cerimônia no Geranium.';
      if (r.cerimonia === 'Sim' && !r.local) return 'Escolha o local da cerimônia.';
      if (total > 200) return 'A soma das cadeiras passa de 200.';
    }
    if (etapa === 1) {
      if (!r.suite) return 'Responda sobre o uso da suíte.';
      if (!r.montagem || !r.inicioRecepcao) return 'Preencha os horários de montagem e recepção.';
      if (r.cerimonia === 'Sim' && !r.inicioCerimonia) return 'Preencha o horário da cerimônia.';
    }
    if (etapa === 2) {
      const falta = FORNECEDORES.find(([id]) => { const f = r.fornecedores[id] || {}; return !f.na && !f.nome; });
      if (falta) return `Preencha ${falta[1].toLowerCase()} ou marque "não se aplica".`;
    }
    return '';
  };
  const proxima = async () => {
    const msg = validar();
    setErro(msg);
    if (msg) return;
    if (etapa < 3) { setEtapa(etapa + 1); window.scrollTo(0, 0); return; }
    setEnviando(true);
    try { await enviarFicha(ficha.id, r); onEnviada(); } catch (err) { console.error(err); setErro('Não foi possível enviar. Tente de novo.'); setEnviando(false); }
  };
  const SimNao = ({ campo }) => (
    <div className="opcoes" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {['Sim', 'Não'].map((o) => <button type="button" key={o} className={`opcao${r[campo] === o ? ' on' : ''}`} aria-pressed={r[campo] === o} onClick={() => set(campo, o)}>{o}</button>)}
    </div>
  );

  return (
    <div className="pub">
      <div className="pub-topo">
        <img src={FOTOS.altar} alt="" style={{ objectPosition: 'center 35%' }} />
        <div><span>FICHA TÉCNICA DO EVENTO</span><b>{ficha.nome}{ficha.data ? ` · ${fmtData(ficha.data).slice(0, 5)}` : ''}</b></div>
      </div>
      <div className="pub-corpo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="small" style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ color: 'var(--vinho-escuro)' }}>Etapa {etapa + 1} de 4 · {ETAPAS[etapa]}</b><span className="muted">salvo automaticamente</span></div>
          <div className="progresso">{ETAPAS.map((x, i) => <span key={x} className={i <= etapa ? 'on' : ''} />)}</div>
        </div>

        {etapa === 0 && (
          <>
            <span className="passo">Haverá cerimônia no Geranium?</span>
            <SimNao campo="cerimonia" />
            {r.cerimonia === 'Sim' && (
              <>
                <span className="passo">Onde será a cerimônia?</span>
                {LOCAIS.map((l) => (
                  <label key={l} className="check" style={{ background: 'var(--branco)', border: r.local === l ? '2px solid var(--vinho)' : '2px solid transparent' }}>
                    <input type="radio" name="local" checked={r.local === l} onChange={() => set('local', l)} />{l}
                  </label>
                ))}
              </>
            )}
            <span className="passo">Cadeiras de madeira</span>
            <div className="campos">
              <Campo rotulo="No salão"><input type="number" min="0" max="200" value={r.cadSalao || ''} onChange={(e) => set('cadSalao', e.target.value)} /></Campo>
              <Campo rotulo="Na cerimônia"><input type="number" min="0" max="200" value={r.cadCerimonia || ''} onChange={(e) => set('cadCerimonia', e.target.value)} /></Campo>
            </div>
            <div className={total > 200 ? 'alerta-box' : 's-dourado'} style={{ padding: '12px 14px', borderRadius: 14, fontSize: 14 }}>
              {total > 200 ? `A soma (${total}) passa das 200 cadeiras disponíveis.` : `Restam ${200 - total} das 200 cadeiras. Em caso de chuva, as cadeiras não ficam na área da cerimônia.`}
            </div>
          </>
        )}

        {etapa === 1 && (
          <>
            <span className="passo">Vão usar a suíte?</span>
            <SimNao campo="suite" />
            {r.suite === 'Sim' && (
              <div className="campos">
                <Campo rotulo="Horário de chegada"><input type="time" value={r.suiteHora || ''} onChange={(e) => set('suiteHora', e.target.value)} /></Campo>
                <Campo rotulo="Vão usar a banheira?">
                  <select value={r.banheira || 'Não'} onChange={(e) => set('banheira', e.target.value)}><option>Não</option><option>Sim</option></select>
                </Campo>
              </div>
            )}
            <span className="passo">Cronograma</span>
            <div className="campos">
              <Campo rotulo="Início da montagem"><input type="time" value={r.montagem || ''} onChange={(e) => set('montagem', e.target.value)} /></Campo>
              {r.cerimonia === 'Sim' && <Campo rotulo="Início da cerimônia"><input type="time" value={r.inicioCerimonia || ''} onChange={(e) => set('inicioCerimonia', e.target.value)} /></Campo>}
              <Campo rotulo="Início da recepção"><input type="time" value={r.inicioRecepcao || ''} onChange={(e) => set('inicioRecepcao', e.target.value)} /></Campo>
            </div>
          </>
        )}

        {etapa === 2 && (
          <>
            <span className="muted">Informe a empresa, um contato e o horário de chegada. Se não contrataram, marque "não se aplica".</span>
            {FORNECEDORES.map(([id, nome]) => {
              const f = r.fornecedores[id] || {};
              return (
                <div key={id} className="card" style={{ padding: 16, gap: 10 }}>
                  <div className="card-cab">
                    <b style={{ color: 'var(--vinho-escuro)' }}>{nome}</b>
                    <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={!!f.na} onChange={(e) => setForn(id, 'na', e.target.checked)} style={{ accentColor: 'var(--vinho)', width: 18, height: 18 }} />Não se aplica</label>
                  </div>
                  {!f.na && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8 }}>
                      <input className="input" aria-label={`${nome}: empresa e contato`} placeholder="Empresa e contato" value={f.nome || ''} onChange={(e) => setForn(id, 'nome', e.target.value)} />
                      <input className="input" type="time" aria-label={`${nome}: horário de chegada`} value={f.hora || ''} onChange={(e) => setForn(id, 'hora', e.target.value)} />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {etapa === 3 && (
          <>
            <span className="passo">Algo mais que devemos saber?</span>
            <Campo rotulo="Observações (opcional)"><textarea value={r.obs || ''} onChange={(e) => set('obs', e.target.value)} placeholder="Restrições de montagem, energia, acessibilidade…" /></Campo>
            <div className="ok-box">Confira as etapas anteriores antes de enviar. Depois de enviada, só a equipe consegue reabrir a ficha.</div>
          </>
        )}

        {erro && <div className="alerta-box">{erro}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          {etapa > 0 && <button type="button" className="btn btn-claro" onClick={() => { setErro(''); setEtapa(etapa - 1); }}>Voltar</button>}
          <button type="button" className="btn btn-primario btn-grande" style={{ flex: 1 }} disabled={enviando} onClick={proxima}>{etapa < 3 ? 'Continuar' : enviando ? 'Enviando…' : 'Enviar ficha técnica'}</button>
        </div>
      </div>
    </div>
  );
}
