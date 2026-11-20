import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
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
  const [comEmail, setComEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
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
    const entrarComEmail = async (e) => {
      e.preventDefault();
      setErro('');
      try {
        await signInWithEmailAndPassword(auth, email.trim(), senha);
      } catch (err) {
        setErro('E-mail ou senha incorretos.');
        console.error(err);
      }
    };
    return (
      <div className="login">
        <section className="login-foto">
          <img src={`${BASE}fotos/arco.jpg`} alt="Arco de flores na cerimônia ao ar livre do Sítio Geranium" />
          <div className="login-frase">
            <span className="eyebrow" style={{ color: '#f3e9d8' }}>Sítio Geranium · Eventos</span>
            <p className="login-titulo">Aqui começa o seu<br />felizes para sempre</p>
            <p className="login-sub">Casamentos e celebrações entre o verde, as flores e quem você ama.</p>
          </div>
        </section>
        <section className="login-painel">
          <div className="login-caixa">
            <img src={`${BASE}logo.png`} alt="Sítio Geranium" className="login-logo" />
            <span className="eyebrow">Gestão de eventos</span>
            <h1 className="titulo" style={{ fontSize: 28 }}>Área da equipe</h1>
            {usuario ? (
              <>
                <p className="muted" style={{ margin: 0 }}>O e-mail <b>{usuario.email}</b> não tem acesso ao sistema.</p>
                <button className="btn btn-contorno btn-login" onClick={() => signOut(auth)}>Entrar com outra conta</button>
              </>
            ) : (
              <>
                <p className="muted" style={{ margin: 0 }}>Entre com a sua conta Google autorizada.</p>
                <button className="btn btn-primario btn-login" onClick={entrar}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
                  Entrar com Google
                </button>
                {comEmail ? (
                  <form onSubmit={entrarComEmail} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                    <input className="input" type="email" autoComplete="username" aria-label="E-mail" placeholder="E-mail" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ background: 'var(--branco)' }} />
                    <input className="input" type="password" autoComplete="current-password" aria-label="Senha" placeholder="Senha" required value={senha} onChange={(e) => setSenha(e.target.value)} style={{ background: 'var(--branco)' }} />
                    <button className="btn btn-contorno btn-login">Entrar</button>
                  </form>
                ) : (
                  <button type="button" className="btn btn-texto btn-sm" onClick={() => setComEmail(true)}>Entrar com e-mail e senha</button>
                )}
              </>
            )}
            {erro && <p className="alerta-box" style={{ margin: 0 }}>{erro}</p>}
          </div>
          <span className="small muted">Sítio Geranium · Brasília</span>
        </section>
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
