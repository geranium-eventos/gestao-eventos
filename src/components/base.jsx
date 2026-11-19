import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, EMAILS_EQUIPE } from '../firebase';
import { iniciais } from '../lib/util';

const BASE = import.meta.env.BASE_URL;

// ---------- Avisos ----------
const AvisoCtx = createContext(() => {});
export const useAviso = () => useContext(AvisoCtx);
export function AvisoProvider({ children }) {
  const [aviso, setAviso] = useState(null);
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);
  const mostrar = (texto, erro = false) => setAviso({ texto, erro });
  return (
    <AvisoCtx.Provider value={mostrar}>
      {children}
      {aviso && <div className={`toast${aviso.erro ? ' erro' : ''}`} role="status">{aviso.texto}</div>}
    </AvisoCtx.Provider>
  );
}

export async function copiar(texto, aviso, msg = 'Link copiado') {
  try {
    await navigator.clipboard.writeText(texto);
    aviso(msg);
  } catch {
    window.prompt('Copie o link:', texto);
  }
}

// ---------- Login ----------
const UsuarioCtx = createContext(null);
export const useUsuario = () => useContext(UsuarioCtx);

export function AreaEquipe() {
  const [usuario, setUsuario] = useState(undefined);
  const [erro, setErro] = useState('');
  useEffect(() => onAuthStateChanged(auth, setUsuario), []);

  if (usuario === undefined) return <div className="vazio" style={{ paddingTop: 120 }}>Carregando…</div>;

  const autorizado = usuario && EMAILS_EQUIPE.includes((usuario.email || '').toLowerCase());
  if (!autorizado) {
    const entrar = async () => {
      setErro('');
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (e) {
        setErro('Não foi possível entrar. Tente de novo.');
        console.error(e);
      }
    };
    return (
      <div className="login">
        <div className="card">
          <img src={`${BASE}logo.png`} alt="Sítio Geranium" />
          <span className="eyebrow">Eventos · Gestão</span>
          <h1 className="titulo" style={{ fontSize: 26 }}>Área da equipe</h1>
          {usuario ? (
            <>
              <p className="muted">O e-mail <b>{usuario.email}</b> não tem acesso ao sistema.</p>
              <button className="btn btn-contorno" onClick={() => signOut(auth)}>Entrar com outra conta</button>
            </>
          ) : (
            <button className="btn btn-primario" onClick={entrar}>Entrar com Google</button>
          )}
          {erro && <p className="alerta-box">{erro}</p>}
        </div>
      </div>
    );
  }

  return (
    <UsuarioCtx.Provider value={usuario}>
      <Topo usuario={usuario} />
      <Outlet />
    </UsuarioCtx.Provider>
  );
}

const MENU = [
  ['/', 'Início'],
  ['/agenda', 'Agenda'],
  ['/eventos', 'Eventos'],
  ['/planejamento', 'Planejamento'],
  ['/tarefas', 'Tarefas'],
  ['/equipes', 'Equipes'],
];

function Topo({ usuario }) {
  const [aberto, setAberto] = useState(false);
  return (
    <header className="topo nao-imprimir">
      <div className="topo-in">
        <NavLink to="/" className="marca">
          <img src={`${BASE}logo.png`} alt="Sítio Geranium" />
          <span>EVENTOS</span>
        </NavLink>
        <nav className="menu" aria-label="Menu principal">
          {MENU.map(([to, nome]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'ativo' : '')}>{nome}</NavLink>
          ))}
        </nav>
        <div className="usuario" style={{ position: 'relative' }}>
          <button className="avatar" style={{ border: 'none', cursor: 'pointer' }} onClick={() => setAberto(!aberto)} aria-label="Conta">
            {usuario.photoURL ? <img src={usuario.photoURL} alt="" referrerPolicy="no-referrer" /> : iniciais(usuario.displayName || usuario.email)}
          </button>
          {aberto && (
            <div className="card" style={{ position: 'absolute', right: 0, top: 50, width: 240, padding: 16, gap: 10, boxShadow: 'var(--sombra)', zIndex: 60 }}>
              <span className="small muted">{usuario.email}</span>
              <NavLink to="/configuracoes" className="btn btn-claro btn-sm" onClick={() => setAberto(false)}>Configurações</NavLink>
              <button className="btn btn-texto btn-sm" onClick={() => signOut(auth)}>Sair</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------- Modal ----------
export function Modal({ titulo, onFechar, children, largura }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onFechar]);
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={largura ? { maxWidth: largura } : undefined}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

export function Carregando() {
  return <div className="vazio">Carregando…</div>;
}

export function Pill({ info }) {
  return <span className={`pill ${info.cls}`}>{info.nome}</span>;
}

export function Seg({ opcoes, valor, onChange, rotulo }) {
  return (
    <div className="seg" role="group" aria-label={rotulo}>
      {opcoes.map(([v, nome]) => (
        <button key={v} type="button" className={valor === v ? 'on' : ''} aria-pressed={valor === v} onClick={() => onChange(v)}>{nome}</button>
      ))}
    </div>
  );
}
