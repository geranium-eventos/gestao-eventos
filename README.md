# Gestão de Eventos — Geranium Eventos

Sistema da Geranium Eventos (Sítio Geranium): agenda de visitas, eventos, planejamento, escala de trabalho, tarefas e formulários públicos para os clientes.

- Front-end: React + Vite, publicado no GitHub Pages: https://geranium-eventos.github.io/gestao-eventos/
- Back-end: Firebase (login com Google + Firestore), projeto `geranium-eventos`
- Não faz controle financeiro (fica no Conta Azul): o evento só marca se está quitado ou não.

## Links
- Área da equipe: https://geranium-eventos.github.io/gestao-eventos/
- Agendamento de visita (público): https://geranium-eventos.github.io/gestao-eventos/#/agendar
- Fichas do cliente: o link é gerado na página de cada evento.

## Quem tem acesso
Os e-mails ficam em dois lugares, que precisam bater:
- `src/firebase.js` (`EMAILS_EQUIPE`)
- `firestore.rules` (função `equipe()`)

## Regras do Firestore
Sempre que `firestore.rules` mudar: Console do Firebase > Firestore Database > Regras > colar o arquivo > Publicar.

## Fluxo de um evento
Visita → Negociação → Contrato enviado → Fechado → Planejamento → Realizado.
Saídas: Não fechou (com motivo), Cancelado ou remarcado. "Novo evento" cria um evento sem visita.

## Dados no Firestore
| Coleção | O que guarda |
|---|---|
| `visitas` | Visitas, visitas técnicas, prévias e bloqueios de horário |
| `ocupacao` | Horários ocupados por dia (lido pelo link público, sem dados pessoais) |
| `eventos` | Cada evento: dados do contrato, etapa, quitação, tarefas, planejamento e histórico |
| `fichas` | Fichas cadastral e técnica que o cliente preenche pelo link |
| `colaboradores`, `segurancas`, `geradores` | Cadastro das equipes |
| `config/agenda` | Horários de visita (público) |
| `config/geral` | Meta mensal, motivos de perda e tarefas padrão |
| `diasEspeciais` | Dias com horário diferente |

## Desenvolvimento
```bash
npm install
npm run dev
```
Para testar sem mexer nos dados reais, com o emulador do Firebase:
```bash
npx firebase-tools emulators:start --only auth,firestore --project geranium-eventos
VITE_EMULADOR=1 npm run dev
```
O deploy é automático a cada push na `main` (`.github/workflows/deploy.yml`).
