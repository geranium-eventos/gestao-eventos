import { useMemo, useState } from 'react';
import { Modal, useAviso } from './base';
import {
  atualizarEvento, atualizarVisita, criarEvento, criarVisita, excluirVisita, useConfig, useDoc,
} from '../lib/db';
import { CATEGORIAS, LOCAIS, TIPOS, hojeISO, horariosDoDia, numero } from '../lib/util';

export function Campo({ rotulo, children, largo }) {
  return <label className="campo" style={largo ? { gridColumn: '1 / -1' } : undefined}>{rotulo}{children}</label>;
}

// Horários livres de um dia (considera ocupação e dia especial)
export function useHorariosLivres(data, manter) {
  const config = useConfig();
  const ocupacao = useDoc(data ? `ocupacao/${data}` : null);
  const especial = useDoc(data ? `diasEspeciais/${data}` : null);
  return useMemo(() => {
    if (!data) return [];
    const todos = horariosDoDia(data, config, especial || null);
    const ocupadas = (ocupacao?.horas || []).filter((h) => h !== manter);
    return todos.filter((h) => !ocupadas.includes(h));
  }, [data, config, ocupacao, especial, manter]);
}

// ---------- Visita (nova ou edição) ----------
export function VisitaForm({ visita, inicial, dataInicial, onFechar, onCriarEvento }) {
  const aviso = useAviso();
  const config = useConfig();
  const editando = !!visita;
  const [v, setV] = useState(() => (visita ? { ...visita, ...(inicial || {}) } : null) || {
    categoria: 'visita', data: dataInicial || hojeISO(), hora: '', nome: '', telefone: '', email: '',
    tipoEvento: 'Casamento', dataPrevista: '', observacoes: '', status: 'agendada',
  });
  const [salvando, setSalvando] = useState(false);
  const livres = useHorariosLivres(v.categoria === 'visita' ? v.data : null, editando ? visita.hora : null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const salvar = async (e) => {
    e.preventDefault();
    if (v.categoria === 'visita' && !v.hora) return aviso('Escolha um horário', true);
    if (v.status === 'perdida' && !v.motivo) return aviso('Informe o motivo', true);
    setSalvando(true);
    try {
      if (editando) await atualizarVisita(visita, v);
      else await criarVisita(v);
      aviso(editando ? 'Visita atualizada' : 'Visita agendada');
      onFechar();
    } catch (err) {
      console.error(err);
      aviso('Não foi possível salvar', true);
      setSalvando(false);
    }
  };

  const apagar = async () => {
    if (!window.confirm('Excluir esta visita?')) return;
    await excluirVisita(visita);
    aviso('Visita excluída');
    onFechar();
  };

  return (
    <Modal titulo={editando ? (v.categoria === 'bloqueio' ? 'Bloqueio' : 'Visita') : 'Nova visita'} onFechar={onFechar}>
      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!editando && (
          <div className="opcoes">
            {['visita', 'tecnica', 'previa'].map((c) => (
              <button type="button" key={c} className={`opcao${v.categoria === c ? ' on' : ''}`} onClick={() => setV({ ...v, categoria: c, hora: '' })}>{CATEGORIAS[c]}</button>
            ))}
          </div>
        )}
        <div className="campos">
          <Campo rotulo="Dia"><input type="date" required value={v.data} onChange={(e) => setV({ ...v, data: e.target.value, hora: editando && e.target.value === visita.data ? visita.hora : '' })} /></Campo>
          {v.categoria === 'visita' ? (
            <Campo rotulo="Horário">
              <select required value={v.hora} onChange={set('hora')}>
                <option value="">{livres.length ? 'Escolha…' : 'Sem horários livres'}</option>
                {livres.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Campo>
          ) : (
            <Campo rotulo="Horário"><input type="time" required value={v.hora} onChange={set('hora')} /></Campo>
          )}
        </div>
        {v.categoria !== 'bloqueio' && (
          <>
            <Campo rotulo={v.categoria === 'visita' ? 'Nome' : 'Quem vem / assunto'}><input required value={v.nome} onChange={set('nome')} /></Campo>
            <div className="campos">
              <Campo rotulo="Telefone / WhatsApp"><input value={v.telefone || ''} onChange={set('telefone')} /></Campo>
              <Campo rotulo="E-mail"><input type="email" value={v.email || ''} onChange={set('email')} /></Campo>
            </div>
            {v.categoria === 'visita' && (
              <div className="campos">
                <Campo rotulo="Tipo de evento">
                  <select value={v.tipoEvento} onChange={set('tipoEvento')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
                </Campo>
                <Campo rotulo="Data pretendida do evento"><input type="date" value={v.dataPrevista || ''} onChange={set('dataPrevista')} /></Campo>
              </div>
            )}
          </>
        )}
        <Campo rotulo="Observações"><textarea value={v.observacoes || ''} onChange={set('observacoes')} /></Campo>
        {editando && v.categoria === 'visita' && v.status !== 'evento' && (
          <>
            <Campo rotulo="Situação">
              <select value={v.status} onChange={set('status')}>
                <option value="agendada">Agendada</option>
                <option value="feita">Feita</option>
                <option value="perdida">Não fechou</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </Campo>
            {v.status === 'perdida' && (
              <Campo rotulo="Motivo">
                <select required value={v.motivo || ''} onChange={set('motivo')}>
                  <option value="">Escolha…</option>
                  {config.motivos.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Campo>
            )}
          </>
        )}
        <div className="modal-acoes">
          {editando && <button type="button" className="btn btn-texto" onClick={apagar}>Excluir</button>}
          {editando && v.categoria === 'visita' && !visita.eventoId && onCriarEvento && (
            <button type="button" className="btn btn-contorno" onClick={() => onCriarEvento(visita)}>Criar evento</button>
          )}
          <button type="button" className="btn btn-claro" onClick={onFechar}>Cancelar</button>
          <button className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Bloqueio de horários ----------
export function BloqueioForm({ onFechar }) {
  const aviso = useAviso();
  const [data, setData] = useState(hojeISO());
  const [motivo, setMotivo] = useState('');
  const [marcados, setMarcados] = useState([]);
  const livres = useHorariosLivres(data);
  const alternar = (h) => setMarcados(marcados.includes(h) ? marcados.filter((x) => x !== h) : [...marcados, h]);
  const salvar = async () => {
    if (!marcados.length) return aviso('Escolha pelo menos um horário', true);
    for (const h of marcados) {
      await criarVisita({ categoria: 'bloqueio', status: 'bloqueio', data, hora: h, nome: 'Bloqueio', observacoes: motivo });
    }
    aviso(`${marcados.length} horário(s) bloqueado(s)`);
    onFechar();
  };
  return (
    <Modal titulo="Bloquear horários" onFechar={onFechar}>
      <Campo rotulo="Dia"><input type="date" value={data} onChange={(e) => { setData(e.target.value); setMarcados([]); }} /></Campo>
      <Campo rotulo="Motivo (opcional)"><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Feriado, manutenção…" /></Campo>
      <div className="opcoes">
        {livres.length === 0 && <span className="muted">Nenhum horário livre neste dia.</span>}
        {livres.map((h) => <button key={h} type="button" className={`opcao${marcados.includes(h) ? ' on' : ''}`} onClick={() => alternar(h)}>{h}</button>)}
        {livres.length > 0 && <button type="button" className="btn btn-texto btn-sm" onClick={() => setMarcados(livres)}>Marcar todos</button>}
      </div>
      <div className="modal-acoes">
        <button className="btn btn-claro" onClick={onFechar}>Cancelar</button>
        <button className="btn btn-primario" onClick={salvar}>Bloquear</button>
      </div>
    </Modal>
  );
}

// ---------- Evento: novo ou dados do contrato ----------
export function EventoForm({ evento, onFechar, onCriado }) {
  const aviso = useAviso();
  const editando = !!evento;
  const [e, setE] = useState(() => ({
    nome: '', tipo: 'Casamento', data: '', horaInicio: '', horaConvite: '', convidados: '', cerimoniaRecepcao: 'Cerimônia e recepção',
    valorContrato: '', localCerimonia: '', contratantes: {}, pagamento: {}, contatos: {},
    ...(evento || {}),
  }));
  const [salvando, setSalvando] = useState(false);
  const set = (k) => (ev) => setE({ ...e, [k]: ev.target.value });
  const setC = (k) => (ev) => setE({ ...e, contratantes: { ...(e.contratantes || {}), [k]: ev.target.value } });
  const setP = (k) => (ev) => setE({ ...e, pagamento: { ...(e.pagamento || {}), [k]: ev.target.value } });
  const setT = (k) => (ev) => setE({ ...e, contatos: { ...(e.contatos || {}), [k]: ev.target.value } });
  const c = e.contratantes || {};

  const salvar = async (ev) => {
    ev.preventDefault();
    setSalvando(true);
    const dados = {
      nome: e.nome.trim(), tipo: e.tipo, data: e.data || '', horaInicio: e.horaInicio || '', horaConvite: e.horaConvite || '',
      convidados: e.convidados ? Number(e.convidados) : '', cerimoniaRecepcao: e.cerimoniaRecepcao || '',
      valorContrato: e.valorContrato === '' ? '' : numero(e.valorContrato), localCerimonia: e.localCerimonia || '',
      contratantes: e.contratantes || {}, pagamento: e.pagamento || {}, contatos: e.contatos || {},
    };
    try {
      if (editando) {
        await atualizarEvento(evento.id, dados, 'Dados do contrato atualizados');
        aviso('Dados salvos');
        onFechar();
      } else {
        const id = await criarEvento(dados);
        aviso('Evento criado');
        onCriado ? onCriado(id) : onFechar();
      }
    } catch (err) {
      console.error(err);
      aviso('Não foi possível salvar', true);
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={editando ? 'Dados do contrato' : 'Novo evento'} onFechar={onFechar} largura={editando ? 760 : 560}>
      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Campo rotulo="Nome do evento (como aparece nas listas)"><input required value={e.nome} onChange={set('nome')} placeholder="Ex.: Ana & Pedro" /></Campo>
        <div className="campos">
          <Campo rotulo="Tipo"><select value={e.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></Campo>
          <Campo rotulo="Data do evento"><input type="date" value={e.data || ''} onChange={set('data')} /></Campo>
          <Campo rotulo="Convidados"><input type="number" min="0" value={e.convidados || ''} onChange={set('convidados')} /></Campo>
        </div>
        {!editando && (
          <div className="campos">
            <Campo rotulo="Telefone / WhatsApp"><input value={e.contatos?.telefone || ''} onChange={setT('telefone')} /></Campo>
            <Campo rotulo="E-mail"><input type="email" value={e.contatos?.email || ''} onChange={setT('email')} /></Campo>
          </div>
        )}
        {editando && (
          <>
            <div className="campos">
              <Campo rotulo="Início"><input type="time" value={e.horaInicio || ''} onChange={set('horaInicio')} /></Campo>
              <Campo rotulo="Horário no convite"><input type="time" value={e.horaConvite || ''} onChange={set('horaConvite')} /></Campo>
              <Campo rotulo="No local">
                <select value={e.cerimoniaRecepcao || ''} onChange={set('cerimoniaRecepcao')}>
                  <option>Cerimônia e recepção</option><option>Apenas recepção</option><option>Apenas cerimônia</option>
                </select>
              </Campo>
              <Campo rotulo="Local da cerimônia">
                <select value={e.localCerimonia || ''} onChange={set('localCerimonia')}><option value="">—</option>{LOCAIS.map((l) => <option key={l}>{l}</option>)}</select>
              </Campo>
            </div>
            <span className="eyebrow" style={{ marginTop: 6 }}>Contratantes</span>
            <div className="campos">
              {e.tipo === 'Casamento' ? (
                <>
                  <Campo rotulo="Nome completo da noiva"><input value={c.nomeEla || ''} onChange={setC('nomeEla')} /></Campo>
                  <Campo rotulo="Nome completo do noivo"><input value={c.nomeEle || ''} onChange={setC('nomeEle')} /></Campo>
                </>
              ) : (
                <Campo rotulo="Nome completo do responsável" largo><input value={c.nomeLocatario || ''} onChange={setC('nomeLocatario')} /></Campo>
              )}
              <Campo rotulo="Responsável pelo contrato"><input value={c.responsavel || ''} onChange={setC('responsavel')} /></Campo>
              <Campo rotulo="CPF / CNPJ"><input value={c.cpf || ''} onChange={setC('cpf')} /></Campo>
              <Campo rotulo="RG"><input value={c.rg || ''} onChange={setC('rg')} /></Campo>
              <Campo rotulo="Órgão expedidor"><input value={c.orgaoExp || ''} onChange={setC('orgaoExp')} /></Campo>
              <Campo rotulo="Nacionalidade"><input value={c.nacionalidade || ''} onChange={setC('nacionalidade')} /></Campo>
              <Campo rotulo="Profissão"><input value={c.profissao || ''} onChange={setC('profissao')} /></Campo>
              <Campo rotulo="Telefone 1"><input value={c.telefone1 || e.contatos?.telefone || ''} onChange={setC('telefone1')} /></Campo>
              <Campo rotulo="Telefone 2"><input value={c.telefone2 || ''} onChange={setC('telefone2')} /></Campo>
              <Campo rotulo="E-mail"><input type="email" value={c.email || e.contatos?.email || ''} onChange={setC('email')} /></Campo>
            </div>
            <span className="eyebrow" style={{ marginTop: 6 }}>Endereço</span>
            <div className="campos">
              <Campo rotulo="Rua, número e complemento" largo><input value={c.endereco || ''} onChange={setC('endereco')} /></Campo>
              <Campo rotulo="Bairro"><input value={c.bairro || ''} onChange={setC('bairro')} /></Campo>
              <Campo rotulo="Cidade"><input value={c.cidade || ''} onChange={setC('cidade')} /></Campo>
              <Campo rotulo="UF"><input value={c.uf || ''} onChange={setC('uf')} maxLength={2} /></Campo>
              <Campo rotulo="CEP"><input value={c.cep || ''} onChange={setC('cep')} /></Campo>
            </div>
            <span className="eyebrow" style={{ marginTop: 6 }}>Contrato</span>
            <div className="campos">
              <Campo rotulo="Valor do contrato (R$)"><input inputMode="decimal" value={e.valorContrato ?? ''} onChange={set('valorContrato')} /></Campo>
              <Campo rotulo="Forma de pagamento">
                <select value={e.pagamento?.forma || ''} onChange={setP('forma')}>
                  <option value="">—</option><option>PIX à vista</option><option>Entrada + parcelas</option><option>Cartão</option>
                </select>
              </Campo>
              <Campo rotulo="Parcelas"><input type="number" min="0" value={e.pagamento?.parcelas || ''} onChange={setP('parcelas')} /></Campo>
              <Campo rotulo="Dia de vencimento"><input type="number" min="1" max="31" value={e.pagamento?.diaVencimento || ''} onChange={setP('diaVencimento')} /></Campo>
            </div>
          </>
        )}
        <div className="modal-acoes">
          <button type="button" className="btn btn-claro" onClick={onFechar}>Cancelar</button>
          <button className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : editando ? 'Salvar' : 'Criar evento'}</button>
        </div>
      </form>
    </Modal>
  );
}
