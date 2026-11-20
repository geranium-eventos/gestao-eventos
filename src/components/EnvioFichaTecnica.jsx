import { useState } from 'react';
import { Modal, useAviso, useUsuario } from './base';
import { atualizarEvento, criarFicha, linkFicha } from '../lib/db';
import { agoraTexto, fmtLonga } from '../lib/util';

// Envio do link da ficha técnica por WhatsApp (noivos e cerimonial), a partir do lembrete do Início.

const primeiroNome = (n) => (n || '').trim().split(/\s+/)[0] || '';

export function numeroWhats(tel) {
  let d = String(tel || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!d) return '';
  if (d.length <= 11) d = `55${d}`;
  return d.length >= 12 ? d : '';
}

export function destinatariosFicha(ev) {
  const c = ev.contratantes || {};
  const p = ev.planejamento || {};
  const lista = [];
  if (ev.tipo === 'Casamento') {
    lista.push({ id: 'noiva', papel: 'Noiva', artigo: 'a noiva', nome: c.nomeEla, telefone: c.telefone1 || ev.contatos?.telefone, grupo: 'clientes' });
    lista.push({ id: 'noivo', papel: 'Noivo', artigo: 'o noivo', nome: c.nomeEle, telefone: c.telefone2, grupo: 'clientes' });
  } else {
    lista.push({ id: 'contratante', papel: 'Contratante', artigo: 'o contratante', nome: c.nomeLocatario || ev.nome, telefone: c.telefone1 || ev.contatos?.telefone, grupo: 'clientes' });
  }
  if (p.cerimonialTelefone) lista.push({ id: 'cerimonial', papel: 'Cerimonial', artigo: 'o cerimonial', nome: p.cerimonialNome, telefone: p.cerimonialTelefone, grupo: 'cerimonial' });
  return lista;
}

// O lembrete some quando um dos clientes recebeu e, se houver cerimonial cadastrado, ele também.
export function envioFichaPendente(ev) {
  const envios = ev.fichaTecnica?.envios || {};
  const lista = destinatariosFicha(ev);
  const clientesOk = lista.some((d) => d.grupo === 'clientes' && envios[d.id]);
  const cerimonialOk = !lista.some((d) => d.grupo === 'cerimonial') || !!envios.cerimonial;
  return !(clientesOk && cerimonialOk);
}

export function resumoEnvios(ev) {
  const envios = ev.fichaTecnica?.envios || {};
  const feitos = destinatariosFicha(ev).filter((d) => envios[d.id]).map((d) => d.papel.toLowerCase());
  return feitos.length ? `Enviada por WhatsApp: ${feitos.join(', ')}` : '';
}

function dataTexto(iso) {
  const [semana, resto] = fmtLonga(iso).split(', ');
  return `dia ${resto} (${semana})`;
}

function mensagem(ev, d, link) {
  const nome = primeiroNome(d.nome);
  const ola = nome ? `Olá, ${nome}!` : 'Olá!';
  const casamento = ev.tipo === 'Casamento';
  if (d.grupo === 'cerimonial') {
    return `${ola} Tudo bem?\n\n`
      + `Aqui é da equipe Geranium Eventos. ${casamento ? `O casamento de ${ev.nome}` : `O evento ${ev.nome}`} será no ${dataTexto(ev.data)}, aqui no Sítio Geranium.\n\n`
      + `Enviamos ${casamento ? 'aos noivos' : 'aos contratantes'} a ficha técnica do evento e compartilhamos com você também, para alinharmos horários e fornecedores:\n${link}\n\n`
      + 'Qualquer dúvida, estamos à disposição.\n\nAbraços,\nEquipe Geranium Eventos';
  }
  return `${ola} 🌸\n\n`
    + `Está chegando o grande dia: ${dataTexto(ev.data)}, aqui no Sítio Geranium!\n\n`
    + `Para cuidarmos de cada detalhe, pedimos que ${casamento ? 'vocês preencham' : 'você preencha'} a ficha técnica do evento, com as informações da cerimônia, os horários e os fornecedores:\n${link}\n\n`
    + 'Dá para preencher aos poucos: as respostas ficam salvas. Qualquer dúvida, é só nos chamar por aqui.\n\n'
    + 'Com carinho,\nEquipe Geranium Eventos';
}

export function EnvioFichaTecnica({ ev, onFechar }) {
  const aviso = useAviso();
  const usuario = useUsuario();
  const [pergunta, setPergunta] = useState(null); // destinatário aguardando "a mensagem foi enviada?"
  const [abrindo, setAbrindo] = useState('');
  const envios = ev.fichaTecnica?.envios || {};
  const lista = destinatariosFicha(ev);

  const abrir = async (d) => {
    const janela = window.open('', '_blank'); // abre já no clique, para o navegador não bloquear
    setAbrindo(d.id);
    try {
      const token = ev.fichaTecnica?.token || await criarFicha(ev, 'tecnica');
      const url = `https://wa.me/${numeroWhats(d.telefone)}?text=${encodeURIComponent(mensagem(ev, d, linkFicha(token)))}`;
      if (janela) janela.location.href = url; else window.location.href = url;
      setPergunta(d);
    } catch (e) {
      if (janela) janela.close();
      aviso('Não foi possível gerar o link. Verifique a internet e tente de novo.');
    }
    setAbrindo('');
  };

  const confirmar = async (d) => {
    try {
      await atualizarEvento(ev.id, { [`fichaTecnica.envios.${d.id}`]: { em: agoraTexto(), por: primeiroNome(usuario?.displayName) || usuario?.email || '' } }, `Ficha técnica enviada por WhatsApp (${d.papel.toLowerCase()})`);
      aviso('Marcado como enviado');
    } catch (e) {
      aviso('Não foi possível marcar. Tente de novo.');
    }
    setPergunta(null);
  };

  return (
    <Modal titulo="Enviar ficha técnica" onFechar={onFechar}>
      <span className="muted">{ev.nome} · {fmtLonga(ev.data)}. Escolha para quem enviar: o WhatsApp abre com a mensagem e o link prontos.</span>
      {lista.map((d) => {
        const num = numeroWhats(d.telefone);
        const feito = envios[d.id];
        return (
          <div key={d.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0', borderTop: '1px solid var(--creme-2)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column' }}>
                <b style={{ color: 'var(--vinho-escuro)' }}>{d.papel}{d.nome ? ` · ${d.nome}` : ''}</b>
                <span className="small muted">{d.telefone || 'Sem telefone cadastrado'}</span>
                {feito && <span className="small" style={{ color: 'var(--oliva)', fontWeight: 600 }}>Enviado em {new Date(feito.em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{feito.por ? ` por ${feito.por}` : ''}</span>}
              </span>
              {num
                ? <button className={`btn btn-sm ${feito ? 'btn-claro' : 'btn-primario'}`} onClick={() => abrir(d)} disabled={!!abrindo}>{abrindo === d.id ? 'Abrindo…' : feito ? 'Enviar de novo' : 'Abrir WhatsApp'}</button>
                : d.telefone ? <span className="small muted">Número inválido</span> : null}
            </div>
            {pergunta?.id === d.id && (
              <div className="alerta-box" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: '1 1 200px' }}>A mensagem para {d.artigo} foi enviada?</span>
                <button className="btn btn-primario btn-sm" onClick={() => confirmar(d)}>Sim, enviei</button>
                <button className="btn btn-claro btn-sm" onClick={() => setPergunta(null)}>Ainda não</button>
              </div>
            )}
          </div>
        );
      })}
      {!lista.some((d) => d.grupo === 'cerimonial') && <span className="small muted">Para enviar também ao cerimonial, cadastre o WhatsApp dele no planejamento do evento.</span>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-contorno" onClick={onFechar}>Fechar</button></div>
    </Modal>
  );
}
