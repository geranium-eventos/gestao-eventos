// ---------- Datas (sempre guardadas como texto 'aaaa-mm-dd') ----------
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const SEM_CURTA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export const pad = (n) => String(n).padStart(2, '0');
export const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hojeISO = () => isoDe(new Date());
export const dataDe = (iso) => {
  if (!iso) return null;
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
};
export const fmtData = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
export const fmtDia = (iso) => (iso ? iso.split('-')[2] : '');
export const semanaCurta = (iso) => (iso ? SEM_CURTA[dataDe(iso).getDay()] : '');
export const semanaLonga = (iso) => (iso ? SEMANA[dataDe(iso).getDay()] : '');
export const fmtLonga = (iso) => {
  if (!iso) return 'Data a definir';
  const d = dataDe(iso);
  return `${SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
};
export const nomeMes = (ano, mes) => `${MESES[mes].charAt(0).toUpperCase()}${MESES[mes].slice(1)} ${ano}`;
export const mesDe = (iso) => (iso ? iso.slice(0, 7) : '');
export const diasAte = (iso) => {
  if (!iso) return null;
  const h = dataDe(hojeISO());
  return Math.round((dataDe(iso) - h) / 86400000);
};
export const somarDias = (iso, n) => {
  const d = dataDe(iso);
  d.setDate(d.getDate() + n);
  return isoDe(d);
};
export const agoraTexto = () => new Date().toISOString();
export const fmtQuando = (texto) => {
  if (!texto) return '';
  const d = new Date(texto);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

// Sextas, sábados e domingos de um mês
export const fimDeSemanaDoMes = (ano, mes) => {
  const lista = [];
  const total = new Date(ano, mes + 1, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const dia = new Date(ano, mes, d, 12).getDay();
    if (dia === 5 || dia === 6 || dia === 0) lista.push(`${ano}-${pad(mes + 1)}-${pad(d)}`);
  }
  return lista;
};

// ---------- Horários de visita ----------
const minutos = (h) => {
  const [a, b] = String(h).split(':').map(Number);
  return a * 60 + (b || 0);
};
const hora = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export const CONFIG_PADRAO = {
  inicio: '08:00',
  fim: '17:00',
  duracao: 60,
  sabadoAte: '12:00',
  pausas: [
    { ini: '09:00', fim: '09:30' },
    { ini: '12:30', fim: '13:30' },
  ],
  meta: 100000,
  motivos: ['Data indisponível', 'Preço', 'Escolheu outro local', 'Desistiu do evento', 'Sem resposta'],
  tarefasPadrao: ['Contrato assinado', 'Inserido no Conta Azul', 'Reunião de alinhamento', 'Entrada confirmada', 'Grupo de WhatsApp criado'],
};

export function horariosDoDia(iso, config, especial) {
  const c = { ...CONFIG_PADRAO, ...(config || {}) };
  const dia = dataDe(iso).getDay();
  if (dia === 0 && !especial) return [];
  let ini = minutos(especial?.inicio || c.inicio);
  let fim = minutos(especial?.fim || c.fim);
  const dur = Number(especial?.duracao || c.duracao) || 60;
  if (dia === 6 && !especial) fim = Math.min(fim, minutos(c.sabadoAte));
  const pausas = (c.pausas || []).map((p) => [minutos(p.ini), minutos(p.fim)]);
  const lista = [];
  let cur = ini;
  let guarda = 0;
  while (cur + dur <= fim && guarda < 100) {
    guarda++;
    const choque = pausas.find(([a, b]) => cur < b && cur + dur > a);
    if (choque) {
      cur = choque[1];
      continue;
    }
    lista.push(hora(cur));
    cur += dur;
  }
  return lista;
}

// ---------- Status ----------
export const ETAPAS = [
  { id: 'negociacao', nome: 'Negociação' },
  { id: 'contrato_enviado', nome: 'Contrato enviado' },
  { id: 'fechado', nome: 'Fechado' },
  { id: 'planejamento', nome: 'Planejamento' },
  { id: 'realizado', nome: 'Realizado' },
];

export const STATUS_EVENTO = {
  negociacao: { nome: 'Negociando', cls: 's-laranja' },
  contrato_enviado: { nome: 'Contrato enviado', cls: 's-laranja' },
  fechado: { nome: 'Fechado', cls: 's-verde' },
  planejamento: { nome: 'Em planejamento', cls: 's-dourado' },
  realizado: { nome: 'Realizado', cls: 's-marrom' },
  cancelado: { nome: 'Cancelado', cls: 's-cinza' },
  perdido: { nome: 'Não fechou', cls: 's-vinho' },
};
export const ATIVOS = ['negociacao', 'contrato_enviado', 'fechado', 'planejamento'];
export const CONFIRMADOS = ['fechado', 'planejamento', 'realizado'];

export const STATUS_VISITA = {
  agendada: { nome: 'Agendada', cls: 's-laranja' },
  feita: { nome: 'Feita', cls: 's-verde' },
  evento: { nome: 'Virou evento', cls: 's-verde' },
  perdida: { nome: 'Não fechou', cls: 's-vinho' },
  cancelada: { nome: 'Cancelada', cls: 's-cinza' },
  bloqueio: { nome: 'Bloqueado', cls: 's-cinza' },
};
export const CATEGORIAS = { visita: 'Visita', tecnica: 'Visita técnica', previa: 'Prévia fotográfica', bloqueio: 'Bloqueio' };
export const TIPOS = ['Casamento', 'Aniversário', 'Corporativo', 'Outro'];
export const LOCAIS = ['Praça das Noivas', 'Frente do salão', 'Dentro do salão'];

export function estiloVisita(v) {
  if (v.categoria === 'tecnica' || v.categoria === 'previa') return { nome: CATEGORIAS[v.categoria], cls: 's-dourado' };
  return STATUS_VISITA[v.status] || STATUS_VISITA.agendada;
}

// ---------- Eventos ----------
const BASE = import.meta.env.BASE_URL;
export const FOTOS = { arco: `${BASE}fotos/arco.jpg`, altar: `${BASE}fotos/altar.jpg`, recepcao: `${BASE}fotos/recepcao.jpg` };
export function fotoDoEvento(ev) {
  if (ev?.fotoUrl) return ev.fotoUrl;
  if (ev?.foto && FOTOS[ev.foto]) return FOTOS[ev.foto];
  const local = ev?.fichaTecnica?.respostas?.local || ev?.localCerimonia;
  if (ev?.tipo && ev.tipo !== 'Casamento') return FOTOS.recepcao;
  if (local === 'Dentro do salão') return FOTOS.recepcao;
  if (local === 'Frente do salão') return FOTOS.altar;
  return FOTOS.arco;
}

export function tarefasDoEvento(ev) {
  return Array.isArray(ev?.tarefas) ? ev.tarefas : [];
}
export function progressoTarefas(ev) {
  const t = tarefasDoEvento(ev);
  return { feitas: t.filter((x) => x.feita).length, total: t.length };
}

export const moeda = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const numero = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const limpo = String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  return Number(limpo) || 0;
};

export const iniciais = (nome) => (nome || '?').trim().charAt(0).toUpperCase();
