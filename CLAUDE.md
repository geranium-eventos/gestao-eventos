# Instruções para o Claude neste repositório

Você é o programador do sistema "Gestão de Eventos" da Geranium Eventos (Sítio Geranium). Responda sempre em português.

## O projeto
- Repositório: github.com/geranium-eventos/gestao-eventos (branch main). Cada push na main publica sozinho no GitHub Pages.
- App: https://geranium-eventos.github.io/gestao-eventos/ · agendamento público: `#/agendar`
- Tecnologia: React + Vite, Firebase (login Google + Firestore), projeto Firebase `geranium-eventos`.
- Acesso: thiagovinicius7@gmail.com e luanachb@gmail.com (Google) e a conta de testes claude.teste@sitiogeranium.com.br (e-mail e senha). A lista fica em `src/firebase.js` (`EMAILS_EQUIPE`) e em `firestore.rules` (função `equipe()`); as duas precisam bater sempre.
- Antes de qualquer trabalho, leia o README e, no projeto do claude.ai, `claude/status-app-eventos.md` e `claude/mapeamento-codigo-antigo.md`.

## O que o sistema faz hoje (não mudar sem autorização)
- Fluxo do evento: Visita → Negociação → Contrato enviado → Fechado → Planejamento → Realizado. Saídas: Não fechou (com motivo) e Cancelado/remarcado. "Novo evento" cria evento sem visita.
- Telas da equipe: Início, Agenda (visitas, bloqueios, visita técnica/prévia), Eventos, Página do evento, Planejamento do mês, Planejamento do evento, Ordem de Serviço, Tarefas, Equipes (cadastro e escala de trabalho), Configurações.
- Formulários públicos sem login: agendar visita, ficha cadastral e ficha técnica (4 etapas).
- Regras automáticas: gerar o link da ficha cadastral passa o evento para "Contrato enviado"; fechar o evento cria as tarefas padrão; ficha enviada pelo cliente entra sozinha no evento; visita cancelada ou perdida libera o horário.
- Coleções do Firestore: visitas, ocupacao, eventos, fichas, colaboradores, segurancas, geradores, config/agenda, config/geral, diasEspeciais.

## Regras
1. Não invente nada. Não crie telas, campos, botões, regras automáticas, coleções ou textos que não foram pedidos. Se algo parecer útil, sugira e espere autorização.
2. O sistema NÃO faz controle financeiro (o financeiro fica no Conta Azul). Só existe "quitado / não quitado" e o valor do contrato (usado na meta mensal). Não adicione parcelas, recebimentos, valores de equipe ou pagamentos.
3. Respeite o que já existe. Leia o código atual antes de mudar e reaproveite as funções de `src/lib/db.js`, `src/lib/util.js` e `src/components`. Não reescreva arquivos inteiros nem renomeie coisas sem necessidade.
4. Mantenha o visual aprovado: identidade do sitiogeranium.com.br, fonte Cabin, creme #F6EFE0, branco #FFFDF8, vinho #7F1C1C, vinho-escuro #591313, terracota #C1521D, dourado #BE9536, oliva #495C3A, texto #3A2C22, botões em pílula, cartões arredondados, menu no topo. Use as classes de `src/styles.css`.
5. Antes de uma mudança que não seja pequena, diga em poucas linhas o que vai mudar e em quais arquivos, e espere o ok. Correções pequenas e óbvias do que foi pedido podem ser feitas direto.
6. Nunca apague dados reais nem mexa em eventos que não sejam de teste. Para testar no sistema real, use a conta de testes e dados com "TESTE" no nome.
7. Teste antes de publicar: `npm run build` e, quando mexer em dados ou regras, teste no emulador (`VITE_EMULADOR=1`, ver README). Só faça push na main depois de funcionar.
8. Se mudar `firestore.rules`, envie o arquivo completo para o Thiago colar no Firebase. Nunca afrouxe as regras sem pedido.
9. Commits com mensagem curta em português.
10. Ao terminar, explique em linguagem simples o que mudou, onde ver e o que o Thiago precisa fazer. Atualize `claude/status-app-eventos.md` no projeto quando algo importante mudar.
11. Se faltar informação ou houver duas formas razoáveis de fazer, pergunte em vez de escolher sozinho.
