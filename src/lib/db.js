import { useEffect, useState } from 'react';
import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot,
  query, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CONFIG_PADRAO, agoraTexto, hojeISO } from './util';

// ---------- Leitura em tempo real ----------
export function useColecao(nome, filtro) {
  const [lista, setLista] = useState(null);
  const chave = filtro ? JSON.stringify(filtro) : '';
  useEffect(() => {
    const ref = filtro ? query(collection(db, nome), where(filtro[0], filtro[1], filtro[2])) : collection(db, nome);
    return onSnapshot(
      ref,
      (snap) => setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => { console.error(nome, err); setLista([]); },
    );
  }, [nome, chave]);
  return lista;
}

export function useDoc(caminho) {
  const [dado, setDado] = useState(undefined);
  useEffect(() => {
    if (!caminho) return undefined;
    return onSnapshot(
      doc(db, caminho),
      (snap) => setDado(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => { console.error(caminho, err); setDado(null); },
    );
  }, [caminho]);
  return dado;
}

export function useConfig(publico = false) {
  const agenda = useDoc('config/agenda');
  const geral = useDoc(publico ? null : 'config/geral');
  return { ...CONFIG_PADRAO, ...(agenda || {}), ...(geral || {}), carregado: agenda !== undefined && (publico || geral !== undefined) };
}

export const salvarConfig = (qual, dados) => setDoc(doc(db, 'config', qual), dados, { merge: true });

// ---------- Visitas ----------
export async function reservarHorario(data, hora) {
  if (!data || !hora) return;
  await setDoc(doc(db, 'ocupacao', data), { horas: arrayUnion(hora) }, { merge: true });
}
export async function liberarHorario(data, hora) {
  if (!data || !hora) return;
  await setDoc(doc(db, 'ocupacao', data), { horas: arrayRemove(hora) }, { merge: true });
}

export async function criarVisita(dados) {
  const v = { status: 'agendada', categoria: 'visita', origem: 'equipe', criadaEm: agoraTexto(), ...dados };
  const ref = await addDoc(collection(db, 'visitas'), v);
  if (v.categoria === 'visita' || v.categoria === 'bloqueio') await reservarHorario(v.data, v.hora);
  return ref.id;
}

export async function atualizarVisita(antiga, dados) {
  await updateDoc(doc(db, 'visitas', antiga.id), dados);
  const nova = { ...antiga, ...dados };
  const ocupa = (v) => (v.categoria === 'visita' || v.categoria === 'bloqueio') && ['agendada', 'feita', 'evento', 'bloqueio'].includes(v.status);
  if (ocupa(antiga) && (!ocupa(nova) || antiga.data !== nova.data || antiga.hora !== nova.hora)) await liberarHorario(antiga.data, antiga.hora);
  if (ocupa(nova) && (!ocupa(antiga) || antiga.data !== nova.data || antiga.hora !== nova.hora)) await reservarHorario(nova.data, nova.hora);
}

export async function excluirVisita(v) {
  await deleteDoc(doc(db, 'visitas', v.id));
  await liberarHorario(v.data, v.hora);
}

// ---------- Eventos ----------
export async function criarEvento(dados) {
  const ev = {
    status: 'negociacao',
    tipo: 'Casamento',
    quitado: false,
    tarefas: [],
    historico: [{ em: agoraTexto(), texto: 'Evento criado' }],
    criadoEm: agoraTexto(),
    ...dados,
  };
  const ref = await addDoc(collection(db, 'eventos'), ev);
  return ref.id;
}

export async function criarEventoDaVisita(visita) {
  const id = await criarEvento({
    nome: visita.nome,
    tipo: visita.tipoEvento || 'Casamento',
    data: visita.dataPrevista || '',
    visitaId: visita.id,
    contatos: { telefone: visita.telefone || '', email: visita.email || '' },
    historico: [{ em: agoraTexto(), texto: `Evento criado a partir da visita de ${visita.data.split('-').reverse().join('/')}` }],
  });
  await updateDoc(doc(db, 'visitas', visita.id), { status: 'evento', eventoId: id });
  return id;
}

export async function atualizarEvento(id, dados, textoHistorico) {
  const extra = textoHistorico ? { historico: arrayUnion({ em: agoraTexto(), texto: textoHistorico }) } : {};
  await updateDoc(doc(db, 'eventos', id), { ...dados, ...extra });
}

export async function mudarStatusEvento(ev, status, config, motivo) {
  const dados = { status };
  if (['fechado', 'planejamento', 'realizado'].includes(status)) {
    if (!ev.dataFechamento) dados.dataFechamento = hojeISO();
    if (!ev.tarefas || ev.tarefas.length === 0) dados.tarefas = (config?.tarefasPadrao || CONFIG_PADRAO.tarefasPadrao).map((t) => ({ t, feita: false }));
  }
  if (motivo) dados.motivo = motivo;
  const nomes = { negociacao: 'Negociação', contrato_enviado: 'Contrato enviado', fechado: 'Fechado', planejamento: 'Planejamento', realizado: 'Realizado', cancelado: 'Cancelado', perdido: 'Não fechou' };
  await atualizarEvento(ev.id, dados, `Etapa: ${nomes[status] || status}${motivo ? ` (${motivo})` : ''}`);
}

export const excluirEvento = (id) => deleteDoc(doc(db, 'eventos', id));

// ---------- Fichas (formulários públicos) ----------
export async function criarFicha(ev, tipo) {
  const prefill = tipo === 'cadastral'
    ? { ...(ev.contratantes || {}), telefone: ev.contatos?.telefone || '', email: ev.contatos?.email || '', forma: ev.pagamento?.forma || '' }
    : {};
  const ref = await addDoc(collection(db, 'fichas'), {
    eventoId: ev.id,
    tipo,
    aberta: true,
    nome: ev.nome || '',
    data: ev.data || '',
    tipoEvento: ev.tipo || '',
    convidados: ev.convidados || '',
    prefill,
    criadaEm: agoraTexto(),
  });
  const campo = tipo === 'cadastral' ? 'fichaCadastral' : 'fichaTecnica';
  await atualizarEvento(ev.id, { [campo]: { token: ref.id, status: 'enviada', enviadaEm: agoraTexto() } }, `Link da ficha ${tipo === 'cadastral' ? 'cadastral' : 'técnica'} gerado`);
  return ref.id;
}

export const reabrirFicha = (token) => updateDoc(doc(db, 'fichas', token), { aberta: true });
export const linkFicha = (token) => `${window.location.origin}${import.meta.env.BASE_URL}#/ficha/${token}`;
export const linkAgendar = () => `${window.location.origin}${import.meta.env.BASE_URL}#/agendar`;

export async function lerFicha(token) {
  const snap = await getDoc(doc(db, 'fichas', token));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export const enviarFicha = (token, respostas) => updateDoc(doc(db, 'fichas', token), { respostas, aberta: false, enviadaEm: agoraTexto() });
export const salvarRascunho = (token, respostas) => updateDoc(doc(db, 'fichas', token), { rascunho: respostas });

// ---------- Cadastros simples ----------
export const salvarItem = (colecao, item) => {
  const { id, ...dados } = item;
  return id ? setDoc(doc(db, colecao, id), dados, { merge: true }) : addDoc(collection(db, colecao), dados);
};
export const excluirItem = (colecao, id) => deleteDoc(doc(db, colecao, id));
