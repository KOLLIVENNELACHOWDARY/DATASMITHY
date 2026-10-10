// src/firebase/db.jsx
import {
  doc, setDoc, getDoc, updateDoc, collection,
  addDoc, query, where, orderBy, limit, getDocs,
  serverTimestamp, increment, deleteDoc
} from 'firebase/firestore';
import { db } from './config.jsx';

export const ADMIN_EMAILS = ['svgv.vennela.k9@gmail.com'];

export const createUserDoc = async (user) => {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid, email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      datasetsProcessed: 0,
      totalRowsCleaned: 0,
      totalFeatures: 0,
    });
  }
};

export const getUserDoc = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserTheme = (uid, theme) =>
  updateDoc(doc(db, 'users', uid), { theme }).catch(()=>{});

export const saveSession = async (uid, sessionData) => {
  try {
    const ref = await addDoc(collection(db, 'sessions'), {
      uid, ...sessionData, createdAt: serverTimestamp()
    });
    const userRef  = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await updateDoc(userRef, {
        datasetsProcessed: increment(1),
        totalRowsCleaned:  increment(sessionData.rowsProcessed || 0),
        totalFeatures:     increment(sessionData.featuresEngineered || 0),
      });
    } else {
      await setDoc(userRef, {
        uid, datasetsProcessed: 1,
        totalRowsCleaned:  sessionData.rowsProcessed || 0,
        totalFeatures:     sessionData.featuresEngineered || 0,
        createdAt: serverTimestamp(),
      });
    }
    const adminRef  = doc(db, 'admin', 'stats');
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      await updateDoc(adminRef, { totalDatasets: increment(1), totalRows: increment(sessionData.originalRows||0) });
    } else {
      await setDoc(adminRef, { totalDatasets:1, totalRows: sessionData.originalRows||0 });
    }
    return ref.id;
  } catch(e) { console.error('saveSession error:', e); }
};

export const getUserSessions = async (uid) => {
  try {
    const q    = query(collection(db,'sessions'), where('uid','==',uid), orderBy('createdAt','desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch(e) { console.error('getUserSessions:', e); return []; }
};

export const getAdminStats = async () => {
  try { const s = await getDoc(doc(db,'admin','stats')); return s.exists()?s.data():{}; }
  catch(e) { return {}; }
};

export const getAllUsers = async () => {
  try { const s = await getDocs(collection(db,'users')); return s.docs.map(d=>d.data()); }
  catch(e) { return []; }
};

export const getAllSessions = async () => {
  try {
    const q = query(collection(db,'sessions'), orderBy('createdAt','desc'), limit(50));
    const s = await getDocs(q);
    return s.docs.map(d=>({ id:d.id, ...d.data() }));
  } catch(e) { return []; }
};

export const deleteUserDoc = async (uid) => deleteDoc(doc(db,'users',uid));

// ── Shareable Reports ──────────────────────────────────────────────────────
export const saveReport = async (data) => {
  try {
    const ref = await addDoc(collection(db, 'reports'), {
      ...data, createdAt: serverTimestamp()
    });
    return ref.id;
  } catch(e) { console.error('saveReport error:', e); return null; }
};

export const getReport = async (id) => {
  try {
    const snap = await getDoc(doc(db, 'reports', id));
    return snap.exists() ? snap.data() : null;
  } catch(e) { console.error('getReport error:', e); return null; }
};
