export const FORNECEDORES = [
  ['buffet', 'Buffet'],
  ['decoracao', 'Decoração'],
  ['cerimonial', 'Cerimonial'],
  ['seguranca', 'Seguranças e/ou orientador'],
  ['brigadista', 'Brigadista'],
  ['gerador', 'Gerador'],
  ['som', 'Sonorização'],
  ['iluminacao', 'Iluminação'],
  ['foto', 'Foto e filme'],
  ['mobiliario', 'Mobiliário extra'],
];

function KV({ k, v }) {
  if (v === undefined || v === null || v === '') return null;
  return <div className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>;
}

export function RespostasTecnica({ r }) {
  if (!r) return null;
  const forn = r.fornecedores || {};
  return (
    <>
      <div className="bloco">
        <span className="eyebrow">Cerimônia e suíte</span>
        <KV k="Cerimônia no Geranium" v={r.cerimonia === 'Sim' ? `Sim · ${r.local || 'local a definir'}` : r.cerimonia} />
        <KV k="Suíte" v={r.suite === 'Sim' ? `Chegada ${r.suiteHora || '—'} · ${r.banheira === 'Sim' ? 'com banheira' : 'sem banheira'}` : r.suite} />
      </div>
      <div className="bloco">
        <span className="eyebrow">Cadeiras de madeira</span>
        <KV k="Salão" v={r.cadSalao} />
        <KV k="Cerimônia" v={r.cadCerimonia} />
      </div>
      <div className="bloco">
        <span className="eyebrow">Cronograma</span>
        <KV k="Início da montagem" v={r.montagem} />
        {r.cerimonia === 'Sim' && <KV k="Início da cerimônia" v={r.inicioCerimonia} />}
        <KV k="Início da recepção" v={r.inicioRecepcao} />
      </div>
      <div className="bloco">
        <span className="eyebrow">Fornecedores</span>
        {FORNECEDORES.map(([id, nome]) => {
          const f = forn[id] || {};
          return <KV key={id} k={nome} v={f.na ? 'Não se aplica' : [f.nome, f.hora ? `chega ${f.hora}` : ''].filter(Boolean).join(' · ') || '—'} />;
        })}
      </div>
      {r.obs && (
        <div className="bloco">
          <span className="eyebrow">Observações</span>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.obs}</p>
        </div>
      )}
    </>
  );
}

export function textoTecnica(r) {
  if (!r) return '';
  const forn = r.fornecedores || {};
  const linhas = [
    `Cerimônia no Geranium: ${r.cerimonia || '—'}${r.cerimonia === 'Sim' ? ` (${r.local || '—'})` : ''}`,
    `Suíte: ${r.suite || '—'}${r.suite === 'Sim' ? ` · chegada ${r.suiteHora || '—'} · banheira: ${r.banheira || 'Não'}` : ''}`,
    `Cadeiras: salão ${r.cadSalao || 0} · cerimônia ${r.cadCerimonia || 0}`,
    `Montagem: ${r.montagem || '—'}${r.cerimonia === 'Sim' ? ` · cerimônia: ${r.inicioCerimonia || '—'}` : ''} · recepção: ${r.inicioRecepcao || '—'}`,
    ...FORNECEDORES.map(([id, nome]) => {
      const f = forn[id] || {};
      return `${nome}: ${f.na ? 'não se aplica' : [f.nome, f.hora ? `chega ${f.hora}` : ''].filter(Boolean).join(' · ') || '—'}`;
    }),
  ];
  if (r.obs) linhas.push(`Observações: ${r.obs}`);
  return linhas.join('\n');
}
