import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, memoryLocalCache, persistentLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBW7pGdM_bIhFBIBfpNb_xyuriRe9S644o',
  authDomain: 'geranium-eventos.firebaseapp.com',
  projectId: 'geranium-eventos',
  storageBucket: 'geranium-eventos.firebasestorage.app',
  messagingSenderId: '203455093369',
  appId: '1:203455093369:web:d84c8e17000e0ce217d2a8',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
const EMULADOR = import.meta.env.VITE_EMULADOR === '1';
export const db = initializeFirestore(app, { localCache: EMULADOR ? memoryLocalCache() : persistentLocalCache() });

// Só para testes locais com o emulador do Firebase.
if (EMULADOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  window.__entrarTeste = (email) => signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })));
}

// E-mails com acesso à área da equipe. Precisa bater com firestore.rules.
export const EMAILS_EQUIPE = ['thiagovinicius7@gmail.com', 'luanachb@gmail.com'];
