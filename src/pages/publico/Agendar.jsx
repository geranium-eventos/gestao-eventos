import { useMemo, useState } from 'react';
import { criarVisita, useColecao, useConfig } from '../../lib/db';
import { Campo } from '../../components/forms';
import { FOTOS, TIPOS, fmtLonga, horariosDoDia, hojeISO, semanaCurta, somarDias } from '../../lib/util';

const BASE = import.meta.env.BASE_URL;

export default function Agendar() {
  const config = useConfig(true);
  const especiais = useColecao('diasEspeciais');
  const ocupacao = useColecao('ocupacao');
  const [dia, setDia] = useState('');
  const [hora, setHora] = useState('');
  const [d, setD] = useState({ nome: '', telefone: '', email: '', tipoEvento: 'Casamento', dataPrevista: '', observacoes: '' });
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState('');

  const dias = useMemo(() => {
    if (!config.carregado || !especiais || !ocupacao) return [];
    const esp = Object.fromEntries(especiais.map((x) => [x.id, x]));
    const ocp = Object.fromEntries(ocupacao.map((x) => [x.id, x.horas || []]));
    const lista = [];
    for (let i = 1; i <= 30 && lista.length < 14; i++) {
      const iso = somarDias(hojeISO(), i);
      const livres = horariosDoDia(iso, config, esp[iso] || null).filter((h) => !(ocp[iso] || []).includes(h));
      if (livres.length) lista.push({ iso, livres });
    }
    return lista;
  }, [config, especiais, ocupacao]);

  const escolhido = dias.find((x) => x.iso === dia);
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    if (!dia || !hora) return setErro('Escolha o dia e o horário.');
    setErro('');
    setEnviando(true);
    try {
      await criarVisita({ ...d, data: dia, hora, origem: 'site', categoria: 'visita', status: 'agendada' });
      setFeito(true);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível agendar. Tente outro horário ou fale com a gente pelo WhatsApp.');
      setEnviando(false);
    }
  };

  return (
    <div className="pub">
      <div className="pub-topo">
        <img src={FOTOS.arco} alt="" />
        <div><span>SÍTIO GERANIUM · EVENTOS</span><b>Agende sua visita</b></div>
      </div>
      {feito ? (
        <div className="fim-pub">
          <img src={`${BASE}logo.png`} alt="Sítio Geranium" style={{ height: 80 }} />
          <h1 style={{ fontSize: 26 }}>Visita agendada!</h1>
          <p className="muted" style={{ margin: 0 }}>Esperamos você em <b>{fmtLonga(dia)}</b>, às <b>{hora}</b>.</p>
          <p className="small muted" style={{ margin: 0 }}>Se precisar mudar, é só falar com a gente pelo WhatsApp.</p>
        </div>
      ) : (
        <form className="pub-corpo" onSubmit={enviar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="passo">1. Escolha o dia</span>
            {!config.carregado || !especiais || !ocupacao ? <span className="muted">Carregando agenda…</span> : dias.length === 0 ? <span className="muted">Sem horários livres nos próximos dias. Fale com a gente pelo WhatsApp.</span> : (
              <div className="dias-pub">
                {dias.map((x) => (
                  <button type="button" key={x.iso} className={`dia-pub${dia === x.iso ? ' on' : ''}`} aria-pressed={dia === x.iso} onClick={() => { setDia(x.iso); setHora(''); }}>
                    <small>{semanaCurta(x.iso)}</small><b>{Number(x.iso.slice(8))}</b><small>{x.iso.slice(5, 7)}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          {escolhido && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="passo">2. Escolha o horário</span>
              <div className="horas-pub">
                {escolhido.livres.map((h) => <button type="button" key={h} className={`opcao${hora === h ? ' on' : ''}`} aria-pressed={hora === h} onClick={() => setHora(h)}>{h}</button>)}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="passo">3. Seus dados</span>
            <Campo rotulo="Nome"><input required value={d.nome} onChange={set('nome')} placeholder="Ex.: Maria e João" /></Campo>
            <Campo rotulo="WhatsApp"><input required type="tel" value={d.telefone} onChange={set('telefone')} placeholder="(61) 9 0000-0000" /></Campo>
            <Campo rotulo="E-mail"><input type="email" value={d.email} onChange={set('email')} placeholder="seu@email.com" /></Campo>
            <span className="campo">Tipo de evento</span>
            <div className="opcoes">
              {TIPOS.map((t) => <button type="button" key={t} className={`opcao${d.tipoEvento === t ? ' on' : ''}`} aria-pressed={d.tipoEvento === t} onClick={() => setD({ ...d, tipoEvento: t })}>{t}</button>)}
            </div>
            <Campo rotulo="Data pretendida do evento (se já tiver)"><input type="date" value={d.dataPrevista} onChange={set('dataPrevista')} /></Campo>
            <Campo rotulo="Alguma observação?"><textarea value={d.observacoes} onChange={set('observacoes')} /></Campo>
          </div>
          {erro && <div className="alerta-box">{erro}</div>}
          <button className="btn btn-primario btn-grande" disabled={enviando}>
            {enviando ? 'Agendando…' : dia && hora ? `Confirmar visita · ${semanaCurta(dia).toLowerCase()}, ${dia.slice(8)}/${dia.slice(5, 7)} às ${hora}` : 'Confirmar visita'}
          </button>
        </form>
      )}
    </div>
  );
}
