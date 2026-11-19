import { useState } from 'react';

// Lista de textos com adicionar, renomear e remover.
export default function ListaEditavel({ itens, onSalvar, placeholder, numerada }) {
  const [novo, setNovo] = useState('');
  const [editando, setEditando] = useState(null);
  const [texto, setTexto] = useState('');
  const salvarEdicao = () => {
    if (texto.trim()) onSalvar(itens.map((x, i) => (i === editando ? texto.trim() : x)));
    setEditando(null);
  };
  const mover = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= itens.length) return;
    const l = [...itens];
    [l[i], l[j]] = [l[j], l[i]];
    onSalvar(l);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {itens.map((item, i) => (
        <div key={`${item}${i}`} className="check" style={{ cursor: 'default', paddingRight: 6 }}>
          {numerada && <span className="avatar" style={{ width: 26, height: 26, fontSize: 13 }}>{i + 1}</span>}
          {editando === i ? (
            <input className="input" autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={salvarEdicao} onKeyDown={(e) => e.key === 'Enter' && salvarEdicao()} style={{ background: 'var(--branco)' }} />
          ) : (
            <span style={{ flex: 1 }}>{item}</span>
          )}
          {numerada && <button className="btn-icone" style={{ border: 'none' }} aria-label="Subir" onClick={() => mover(i, -1)}>↑</button>}
          <button className="btn-icone" style={{ border: 'none', fontSize: 15 }} aria-label={`Editar ${item}`} onClick={() => { setEditando(i); setTexto(item); }}>✎</button>
          <button className="btn-icone" style={{ border: 'none' }} aria-label={`Remover ${item}`} onClick={() => window.confirm(`Remover "${item}"?`) && onSalvar(itens.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (novo.trim()) { onSalvar([...itens, novo.trim()]); setNovo(''); } }}>
        <input className="input" placeholder={placeholder} value={novo} onChange={(e) => setNovo(e.target.value)} />
        <button className="btn btn-contorno btn-sm">Adicionar</button>
      </form>
    </div>
  );
}
